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

const MIME_TO_CATEGORY: Record<string, string> = {
  "image/jpeg": "image", "image/png": "image", "image/gif": "image",
  "image/webp": "image", "image/heic": "image",
  "audio/mpeg": "audio", "audio/mp4": "audio", "audio/ogg": "audio",
  "audio/wav": "audio", "audio/webm": "audio", "audio/m4a": "audio",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
  "text/csv": "spreadsheet",
  "text/plain": "text",
  "application/zip": "archive",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const schemaId = formData.get("schema_id") as string | null;
    const vertical = formData.get("vertical") as string | null;
    const dataSourceId = formData.get("data_source_id") as string | null;

    if (!file) throw new Error("No file provided");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    const { data: { user } } = await supabase.auth.getUser(authHeader?.replace("Bearer ", "") ?? "");
    const orgId = user
      ? (await supabase.from("profiles").select("organization_id").eq("id", user.id).single()).data?.organization_id
      : null;

    // Upload to storage
    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `uploads/${orgId ?? "anon"}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: storageErr } = await supabase.storage
      .from("omniform-uploads")
      .upload(storagePath, new Uint8Array(bytes), {
        contentType: file.type,
        cacheControl: "3600",
      });
    if (storageErr) throw new Error(`Storage upload failed: ${storageErr.message}`);

    const { data: { publicUrl } } = supabase.storage.from("omniform-uploads").getPublicUrl(storagePath);

    // Create upload record
    const { data: upload, error: uploadErr } = await supabase
      .from("uploads")
      .insert({
        organization_id: orgId,
        data_source_id: dataSourceId,
        uploaded_by: user?.id,
        file_name: file.name,
        file_type: MIME_TO_CATEGORY[file.type] ?? "text",
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        storage_url: publicUrl,
        status: "pending",
        metadata: { vertical, schema_id: schemaId },
      })
      .select()
      .single();
    if (uploadErr) throw new Error(`DB insert failed: ${uploadErr.message}`);

    // Invoke process-document asynchronously
    await supabase.functions.invoke("process-document", {
      body: { upload_id: upload.id, schema_id: schemaId },
    });

    return new Response(
      JSON.stringify({ success: true, upload_id: upload.id }),
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
