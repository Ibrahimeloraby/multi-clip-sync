import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-hub-signature-256, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Verify WhatsApp webhook signature
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const expected = "sha256=" + Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return expected === signature;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // GET: webhook verification (Meta challenge)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const challenge = url.searchParams.get("hub.challenge");
    const token = url.searchParams.get("hub.verify_token");
    if (mode === "subscribe" && token === Deno.env.get("WHATSAPP_VERIFY_TOKEN")) {
      return new Response(challenge ?? "ok");
    }
    return new Response("Forbidden", { status: 403 });
  }

  // POST: incoming message
  if (req.method === "POST") {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") ?? "";
    const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";

    if (appSecret && !(await verifySignature(rawBody, signature, appSecret))) {
      return new Response("Invalid signature", { status: 401 });
    }

    try {
      const payload = JSON.parse(rawBody);
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages;

      if (!messages?.length) return new Response("ok");

      for (const message of messages) {
        const from = message.from;
        const type = message.type; // text, image, audio, document

        let content: Record<string, unknown> = { from, type, timestamp: message.timestamp };
        let fileCategory = "text";
        let storagePath: string | null = null;

        if (type === "text") {
          content.text = message.text?.body;
        } else if (["image", "audio", "document", "video"].includes(type)) {
          // In production: download media from WhatsApp and upload to Supabase Storage
          content.media_id = message[type]?.id;
          content.caption = message[type]?.caption;
          fileCategory = type === "audio" ? "audio" : type === "document" ? "pdf" : "image";
        }

        // Find the WhatsApp data source for this phone number
        const phoneId = changes?.value?.metadata?.phone_number_id;
        const { data: source } = await supabase
          .from("data_sources")
          .select("id, organization_id")
          .eq("type", "whatsapp")
          .contains("config", { phone_number_id: phoneId })
          .maybeSingle();

        // Create upload record
        const { data: upload } = await supabase.from("uploads").insert({
          organization_id: source?.organization_id ?? null,
          data_source_id: source?.id ?? null,
          file_name: `whatsapp-${from}-${Date.now()}.json`,
          file_type: fileCategory,
          mime_type: "application/json",
          storage_path: storagePath ?? `whatsapp/${from}/${Date.now()}.json`,
          status: "pending",
          metadata: content,
        }).select().single();

        if (upload) {
          // Queue processing
          await supabase.functions.invoke("process-document", {
            body: { upload_id: upload.id },
          });
        }
      }

      return new Response("ok", { headers: corsHeaders });
    } catch (err) {
      console.error("WhatsApp webhook error:", err);
      return new Response("Error", { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
