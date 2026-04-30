import Anthropic from '@anthropic-ai/sdk';

// In production, this call should go through a backend endpoint (e.g. Supabase Edge Function)
// to avoid exposing the API key client-side.
function getClient(): Anthropic | null {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function callClaude(prompt: string): Promise<string> {
  const client = getClient();
  if (!client) return '';

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}

export interface ProposalGenInput {
  companyName: string;
  industry: string;
  contactName: string;
  contactTitle: string;
  products: string[];
  totalValue: number;
  dealNotes: string;
}

export async function generateProposalSummary(input: ProposalGenInput): Promise<string> {
  const liveResult = await callClaude(
    `You are a senior B2B sales consultant. Write a compelling executive summary for a proposal to ${input.companyName} (${input.industry} industry).
Contact: ${input.contactName}, ${input.contactTitle}.
Products/services: ${input.products.join(', ')}.
Deal value: $${input.totalValue.toLocaleString()}.
Context: ${input.dealNotes}

Write a 2-3 sentence executive summary that is personalized, outcome-focused, and avoids generic filler. Speak directly to their business context.`
  );

  if (liveResult) return liveResult;

  // Realistic fallback when no API key configured
  return `${input.companyName} operates in a competitive ${input.industry} landscape where procurement speed and approval bottlenecks directly impact revenue outcomes. This proposal delivers a tailored ${input.products[0] ?? 'platform'} deployment designed specifically for ${input.contactName}'s operational priorities — enabling ${input.companyName} to reduce deal cycle times, eliminate manual approval overhead, and gain real-time pipeline visibility across the organization. Our engagement model ensures rapid time-to-value with dedicated onboarding support and measurable ROI within the first 90 days.`;
}

export interface OutreachGenInput {
  companyName: string;
  industry: string;
  contactName: string;
  contactTitle: string;
  tone: 'formal' | 'consultative' | 'friendly' | 'urgent';
  context: string;
  productName: string;
}

export async function generateOutreachMessage(input: OutreachGenInput): Promise<{ subject: string; body: string }> {
  const liveResult = await callClaude(
    `You are an expert B2B sales development representative. Write a personalized outreach email.

Target: ${input.contactName}, ${input.contactTitle} at ${input.companyName} (${input.industry})
Tone: ${input.tone}
Our offering: ${input.productName}
Context/pain points: ${input.context}

Output format (JSON only, no markdown):
{"subject": "...", "body": "..."}

Rules: Max 120 words body. No generic platitudes. Reference their specific industry challenge. End with a single clear CTA.`
  );

  if (liveResult) {
    try {
      return JSON.parse(liveResult);
    } catch {
      // fall through to mock
    }
  }

  const toneMap = {
    formal: 'I wanted to reach out regarding',
    consultative: 'I came across a challenge common in',
    friendly: 'Quick note —',
    urgent: 'Time-sensitive opportunity for',
  };

  return {
    subject: `${input.companyName} — Streamline Your ${input.industry} Approvals in 30 Days`,
    body: `Hi ${input.contactName},\n\n${toneMap[input.tone]} ${input.companyName}'s ${input.industry} operations — specifically around procurement approvals and vendor onboarding speed.\n\nWe've helped similar organizations cut approval cycles from weeks to days using AI-driven workflows, with full audit trails and compliance built in.\n\n${input.context ? `Context: ${input.context}\n\n` : ''}Would a 20-minute call this week make sense to explore whether this fits?\n\nBest,\n[Your name]`,
  };
}

export async function scoreDeal(dealNotes: string, stage: string, companySize: string): Promise<{ score: number; insight: string }> {
  const liveResult = await callClaude(
    `You are a B2B sales AI. Score this deal (0-100) and provide a 1-sentence insight.
Stage: ${stage}, Company size: ${companySize}
Notes: ${dealNotes}
Output JSON only: {"score": number, "insight": "string"}`
  );

  if (liveResult) {
    try {
      return JSON.parse(liveResult);
    } catch {
      // fall through
    }
  }

  const stageScores: Record<string, number> = { prospecting: 25, qualified: 50, proposal: 60, negotiation: 78, closed_won: 100, closed_lost: 0 };
  return {
    score: stageScores[stage] ?? 50,
    insight: 'AI scoring requires VITE_ANTHROPIC_API_KEY to be configured.',
  };
}
