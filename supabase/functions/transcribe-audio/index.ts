import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { upload_id } = await req.json();

    const { data: upload, error } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", upload_id)
      .single();
    if (error || !upload) throw new Error("Upload not found");

    // Download audio file
    const { data: fileData, error: fileErr } = await supabase.storage
      .from("omniform-uploads")
      .download(upload.storage_path);
    if (fileErr) throw new Error(`Download failed: ${fileErr.message}`);

    // Call OpenAI Whisper API
    const whisperApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!whisperApiKey) throw new Error("OPENAI_API_KEY not configured");

    const formData = new FormData();
    formData.append("file", new Blob([await fileData.arrayBuffer()], { type: upload.mime_type ?? "audio/mpeg" }), upload.file_name);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${whisperApiKey}` },
      body: formData,
    });

    if (!whisperRes.ok) throw new Error(`Whisper API error: ${whisperRes.statusText}`);
    const transcript = await whisperRes.json();

    // Update upload metadata with transcript
    await supabase
      .from("uploads")
      .update({
        metadata: { ...upload.metadata, transcript: transcript.text, language: transcript.language },
      })
      .eq("id", upload_id);

    // Now trigger extraction on the transcript text
    await supabase.functions.invoke("process-document", {
      body: {
        upload_id,
        text_override: transcript.text,
      },
    });

    return new Response(
      JSON.stringify({ success: true, transcript: transcript.text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
