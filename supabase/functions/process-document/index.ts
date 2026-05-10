import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

// Classify document type from content/filename
async function classifyDocument(fileName: string, mimeType: string, base64Content?: string): Promise<{
  document_type: string;
  confidence: number;
}> {
  const isImage = mimeType.startsWith("image/") || mimeType === "application/pdf";

  const messages: Anthropic.MessageParam[] = [{
    role: "user",
    content: isImage && base64Content ? [
      {
        type: "image",
        source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64Content },
      },
      {
        type: "text",
        text: `Classify this document. Filename: "${fileName}". Return JSON: {"document_type": "<type>", "confidence": <0-1>}. Types: invoice, receipt, whatsapp_message, voice_note, spreadsheet, pdf, screenshot, pos_transaction, contract, other.`,
      },
    ] : [
      {
        type: "text",
        text: `Classify this file based on its name: "${fileName}", MIME type: "${mimeType}". Return JSON only: {"document_type": "<type>", "confidence": <0-1>}. Types: invoice, receipt, whatsapp_message, voice_note, spreadsheet, pdf, screenshot, pos_transaction, contract, other.`,
      },
    ],
  }];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages,
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { document_type: "other", confidence: 0.5 };
  return JSON.parse(match[0]);
}

// Extract structured data from document
async function extractData(
  fileName: string,
  mimeType: string,
  documentType: string,
  schemaFields: Array<{ key: string; label: string; type: string; required: boolean; ai_hint?: string }>,
  base64Content?: string,
  textContent?: string
): Promise<{ data: Record<string, unknown>; field_confidences: Record<string, number>; overall_confidence: number }> {

  const fieldDescriptions = schemaFields
    .map((f) => `- ${f.key} (${f.label}, type: ${f.type}${f.required ? ", required" : ""}${f.ai_hint ? `, hint: ${f.ai_hint}` : ""})`)
    .join("\n");

  const prompt = `Extract structured data from this ${documentType}.

Fields to extract:
${fieldDescriptions}

Return ONLY a JSON object with this exact structure:
{
  "fields": {
    "field_key": "extracted_value_or_null",
    ...
  },
  "field_confidences": {
    "field_key": 0.0_to_1.0,
    ...
  },
  "overall_confidence": 0.0_to_1.0,
  "notes": "any_extraction_notes_or_null"
}

Be precise. Use null for fields that cannot be found. Confidence 1.0 = certain, 0.0 = not found.`;

  const isImage = mimeType.startsWith("image/");
  const contentBlocks: Anthropic.ContentBlockParam[] = [];

  if (isImage && base64Content) {
    contentBlocks.push({
      type: "image",
      source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png", data: base64Content },
    });
  } else if (textContent) {
    contentBlocks.push({ type: "text", text: `Document content:\n\n${textContent.slice(0, 8000)}` });
  }
  contentBlocks.push({ type: "text", text: prompt });

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: contentBlocks }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "{}";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { data: {}, field_confidences: {}, overall_confidence: 0 };

  const parsed = JSON.parse(match[0]);
  return {
    data: parsed.fields ?? {},
    field_confidences: parsed.field_confidences ?? {},
    overall_confidence: parsed.overall_confidence ?? 0,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { upload_id, schema_id } = await req.json();

    // Fetch upload record
    const { data: upload, error: uploadErr } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", upload_id)
      .single();
    if (uploadErr || !upload) throw new Error(`Upload not found: ${upload_id}`);

    // Mark as processing
    await supabase.from("uploads").update({ status: "processing" }).eq("id", upload_id);

    // Create processing job
    const { data: job } = await supabase
      .from("processing_jobs")
      .insert({
        upload_id,
        organization_id: upload.organization_id,
        job_type: "extract",
        status: "processing",
        started_at: new Date().toISOString(),
        input: { schema_id },
      })
      .select()
      .single();

    // Download file from storage
    const { data: fileData, error: fileErr } = await supabase.storage
      .from("omniform-uploads")
      .download(upload.storage_path);
    if (fileErr) throw new Error(`Failed to download file: ${fileErr.message}`);

    let base64Content: string | undefined;
    let textContent: string | undefined;

    if (upload.file_type === "image" || upload.file_type === "pdf") {
      const bytes = await fileData.arrayBuffer();
      const uint8 = new Uint8Array(bytes);
      base64Content = btoa(String.fromCharCode(...uint8));
    } else if (upload.file_type === "text") {
      textContent = await fileData.text();
    }

    // Step 1: Classify
    const classification = await classifyDocument(upload.file_name, upload.mime_type ?? "", base64Content);

    // Step 2: Find matching schema
    let schema = null;
    if (schema_id) {
      const { data } = await supabase.from("extraction_schemas").select("*").eq("id", schema_id).single();
      schema = data;
    } else {
      const { data } = await supabase
        .from("extraction_schemas")
        .select("*")
        .contains("document_types", [classification.document_type])
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      schema = data;
    }

    // Step 3: Extract data
    let extractionResult = { data: {} as Record<string, unknown>, field_confidences: {} as Record<string, number>, overall_confidence: classification.confidence };
    if (schema?.fields?.length > 0) {
      extractionResult = await extractData(
        upload.file_name,
        upload.mime_type ?? "application/octet-stream",
        classification.document_type,
        schema.fields,
        base64Content,
        textContent
      );
    }

    // Determine review status
    const reviewStatus = extractionResult.overall_confidence >= 0.85 ? "auto_approved" : "needs_review";

    // Store extracted record
    await supabase.from("extracted_records").insert({
      upload_id,
      organization_id: upload.organization_id,
      schema_id: schema?.id ?? null,
      document_type: classification.document_type,
      raw_data: extractionResult.data,
      normalized_data: extractionResult.data,
      confidence: extractionResult.overall_confidence,
      field_confidences: extractionResult.field_confidences,
      review_status: reviewStatus,
    });

    // Mark upload complete
    await supabase.from("uploads").update({ status: "completed" }).eq("id", upload_id);

    // Update job
    if (job) {
      await supabase.from("processing_jobs").update({
        status: "completed",
        output: { document_type: classification.document_type, confidence: extractionResult.overall_confidence },
        confidence: extractionResult.overall_confidence,
        model_used: "claude-sonnet-4-6",
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
    }

    return new Response(
      JSON.stringify({ success: true, document_type: classification.document_type, confidence: extractionResult.overall_confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("process-document error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
