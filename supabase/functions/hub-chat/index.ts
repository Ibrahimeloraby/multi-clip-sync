import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  query: string;
  department: string;
  sessionId?: string;
  history?: { role: string; content: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { query, department, sessionId, history = [] }: ChatRequest = await req.json();

    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch relevant knowledge items from Supabase
    let itemsQuery = supabase
      .from('hub_knowledge_items')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    if (department && department !== 'all') {
      itemsQuery = itemsQuery.eq('department', department);
    }

    const { data: allItems } = await itemsQuery;
    const items = allItems ?? [];

    // Build RAG context from knowledge items
    const context = items.map((item: any) =>
      `[${item.department.toUpperCase()} | ${item.tag} | Source: ${item.source} | By: ${item.author}]\n${item.summary}\n${item.content}`
    ).join('\n\n---\n\n');

    const departmentLabel = department === 'all' ? 'all departments' : department;

    const systemPrompt = `You are the AI Brain for a corporate knowledge hub. You have access to company knowledge that has been explicitly tagged with #learning or #agent by employees across ${departmentLabel}.

IMPORTANT RULES:
1. Only answer based on the tagged knowledge items provided below — never fabricate company data
2. Always cite which department, source, and author a piece of knowledge came from
3. Be concise and direct — this is an enterprise tool
4. Format responses with clear headers using **bold** for key points
5. If asked about a topic not covered in the knowledge items, say so clearly
6. For #agent tagged items, highlight recommended actions

TAGGED KNOWLEDGE ITEMS:
${context || 'No knowledge items available for this scope yet.'}`;

    // Build messages array for Claude
    const messages = [
      ...history.slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: query },
    ];

    // Call Claude API
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeRes.json();
    const responseText = claudeData.content[0].text;

    // Build source citations from items used in context
    const sources = items.slice(0, 4).map((item: any) => ({
      title: item.meeting_title ?? item.citations?.[0] ?? `${item.department} — ${item.source}`,
      source: item.source,
      department: item.department,
    }));

    // Persist messages if sessionId provided
    if (sessionId) {
      await supabase.from('hub_chat_messages').insert([
        { session_id: sessionId, role: 'user', content: query, department },
        { session_id: sessionId, role: 'assistant', content: responseText, sources, department },
      ]);
    }

    return new Response(JSON.stringify({ response: responseText, sources }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('hub-chat error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
