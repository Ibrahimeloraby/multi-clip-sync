/**
 * LoyaltyOne — Email Inbound Worker
 *
 * Receives Postmark/SES inbound email webhooks, parses them with Claude,
 * and updates user program balances in Supabase.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ─── Environment ──────────────────────────────────────────────────────────────

const env = {
  SUPABASE_URL: requiredEnv('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  ANTHROPIC_API_KEY: requiredEnv('ANTHROPIC_API_KEY'),
  POSTMARK_WEBHOOK_TOKEN: process.env['POSTMARK_WEBHOOK_TOKEN'] ?? '',
  SES_SNS_SECRET: process.env['SES_SNS_SECRET'] ?? '',
  PORT: parseInt(process.env['PORT'] ?? '3001', 10),
};

function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

// ─── Logger ───────────────────────────────────────────────────────────────────

function log(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: Record<string, unknown>,
): void {
  const entry = {
    level,
    worker: 'email-inbound',
    timestamp: new Date().toISOString(),
    message,
    ...data,
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const postmarkPayloadSchema = z.object({
  MessageID: z.string(),
  From: z.string(),
  To: z.string(),
  Subject: z.string().default(''),
  TextBody: z.string().default(''),
  HtmlBody: z.string().default(''),
  Date: z.string().default(''),
});

const emailParseResultSchema = z.object({
  program_slug: z.string().nullable(),
  transaction_type: z.string().nullable(),
  points_amount: z.number().int().nullable(),
  balance_after: z.number().int().nullable(),
  expiry_date: z.string().nullable(),
  merchant_if_any: z.string().nullable(),
});

// ─── EMAIL_PARSER system prompt ───────────────────────────────────────────────

const EMAIL_PARSER_SYSTEM_PROMPT = `You are a loyalty program email parser. You receive forwarded emails from UAE loyalty programs and extract structured data from them.

Extract the following fields and return them as JSON:
{
  "program_slug": "<matched slug from known UAE programs, or null if unknown>",
  "transaction_type": "<one of: earn, redeem, expire, transfer, top_up, tier_change, statement, promotional, or null>",
  "points_amount": <integer or null>,
  "balance_after": <integer or null>,
  "expiry_date": "<ISO 8601 date string or null>",
  "merchant_if_any": "<merchant name string or null>"
}

Known UAE program slugs: emirates-skywards, etihad-guest, flydubai-open-skies, air-arabia-airewards, marriott-bonvoy, hilton-honors, ihg-one-rewards, accor-live-limitless, rotana-rewards, mashreq-smiles, enbd-skywards, adcb-touchpoints, fab-etihad-guest, hsbc-air-miles, cbd-etihad, rakbank-titanium, noon-noonpoints, carrefour-my-club, lulu-lulu-rewards, spinneys-smart-savers, emaar-one, etisalat-smiles, du-du-rewards, rta-nol-plus, vox-cinemas-rewards, reel-cinemas-rewards

Rules:
- Match program from sender domain, subject, or body branding
- points_amount should be ONLY the delta (points earned/redeemed in this transaction), not total balance
- If the email contains multiple transactions, extract the most recent one
- Expiry dates: always convert to ISO 8601 format (YYYY-MM-DD)
- If you cannot confidently identify the program, set program_slug to null
- Return ONLY the JSON object, no extra text`;

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Extracts the short user ID from an inbound email address.
 * Format: u-{short_id}@inbox.loyaltyone.ae
 */
function extractUserShortId(toAddress: string): string | null {
  const match = toAddress.match(/u-([a-zA-Z0-9]+)@inbox\.loyaltyone\.ae/i);
  return match?.[1] ?? null;
}

/**
 * Looks up user by their forwarding short ID stored in user metadata.
 */
async function resolveUserFromShortId(shortId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('forwarding_short_id', shortId)
    .single();

  if (error || !data) {
    log('warn', 'Could not resolve user from short ID', { shortId, error: error?.message });
    return null;
  }
  return data.id as string;
}

/**
 * Calls Claude haiku to parse the email content.
 */
async function parseEmailWithClaude(
  subject: string,
  textBody: string,
  htmlBody: string,
  from: string,
): Promise<z.infer<typeof emailParseResultSchema> | null> {
  const userContent = `From: ${from}
Subject: ${subject}
---
${textBody || htmlBody.replace(/<[^>]*>/g, ' ')}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: EMAIL_PARSER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const content = response.content[0];
    if (content?.type !== 'text') return null;

    // Extract JSON from response (may be wrapped in markdown code fences)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    return emailParseResultSchema.parse(parsed);
  } catch (err) {
    log('error', 'Claude email parsing failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Stores the inbound email record and parsed result in Supabase.
 */
async function storeInboundEmail(
  userId: string,
  raw: {
    sender: string;
    subject: string;
    textBody: string;
  },
  parsedData: z.infer<typeof emailParseResultSchema> | null,
  parsingStatus: 'success' | 'failed' | 'unknown_program',
): Promise<string | null> {
  const { data, error } = await supabase
    .from('inbound_emails')
    .insert({
      user_id: userId,
      raw_email_text: raw.textBody,
      sender: raw.sender,
      subject: raw.subject,
      parsed_data: parsedData,
      parsing_status: parsingStatus,
    })
    .select('id')
    .single();

  if (error) {
    log('error', 'Failed to store inbound email', { error: error.message });
    return null;
  }
  return data.id as string;
}

/**
 * Updates user_programs balance when we get a new balance reading from an email.
 */
async function updateUserProgramBalance(
  userId: string,
  programSlug: string,
  newBalance: number,
  expiryDate: string | null,
): Promise<void> {
  // Find the program ID from slug
  const { data: program, error: programError } = await supabase
    .from('programs')
    .select('id')
    .eq('slug', programSlug)
    .single();

  if (programError || !program) {
    log('warn', 'Program slug not found, cannot update balance', { programSlug });
    return;
  }

  // Find user's program record
  const { data: userProgram, error: upError } = await supabase
    .from('user_programs')
    .select('id, expiry_dates')
    .eq('user_id', userId)
    .eq('program_id', program.id)
    .single();

  if (upError || !userProgram) {
    log('warn', 'User program not found, cannot update balance', { userId, programSlug });
    return;
  }

  // Build updated expiry_dates if we received a new expiry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let expiryDates: any[] = Array.isArray(userProgram.expiry_dates) ? userProgram.expiry_dates : [];

  if (expiryDate) {
    // Add or update expiry tranche for this new balance chunk
    const existingIdx = expiryDates.findIndex(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.expires_at === expiryDate,
    );
    if (existingIdx >= 0) {
      expiryDates[existingIdx].amount = newBalance;
    } else {
      expiryDates.push({ amount: newBalance, expires_at: expiryDate });
    }
    // Sort by soonest expiry first
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiryDates.sort((a: any, b: any) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }

  const { error: updateError } = await supabase
    .from('user_programs')
    .update({
      current_balance: newBalance,
      last_updated_at: new Date().toISOString(),
      expiry_dates: expiryDates,
      tracking_method: 'email_forward',
    })
    .eq('id', userProgram.id);

  if (updateError) {
    log('error', 'Failed to update user program balance', { error: updateError.message });
  } else {
    log('info', 'Updated user program balance from email', {
      userId,
      programSlug,
      newBalance,
    });
  }
}

// ─── Webhook Validation ───────────────────────────────────────────────────────

function validatePostmarkSignature(req: Request): boolean {
  if (!env.POSTMARK_WEBHOOK_TOKEN) return true; // skip validation if not configured
  const token = req.headers['x-postmark-token'] as string | undefined;
  return token === env.POSTMARK_WEBHOOK_TOKEN;
}

function validateSesSignature(req: Request): boolean {
  if (!env.SES_SNS_SECRET) return true; // skip validation if not configured
  const signature = req.headers['x-amz-sns-message-signature'] as string | undefined;
  if (!signature) return false;

  // SNS HMAC-SHA256 signature validation
  const body = (req as Request & { rawBody?: string }).rawBody ?? '';
  const expectedSig = crypto
    .createHmac('sha256', env.SES_SNS_SECRET)
    .update(body)
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

// Capture raw body for signature validation
app.use(
  express.json({
    verify: (req: Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString('utf-8');
    },
  }),
);

app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  log('debug', 'Incoming request', { method: req.method, path: req.path });
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', worker: 'email-inbound', timestamp: new Date().toISOString() });
});

// ─── Postmark Webhook ─────────────────────────────────────────────────────────

app.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  // Always return 200 first to avoid retry storms, process async
  res.status(200).json({ received: true });

  try {
    const source = req.headers['x-postmark-token'] ? 'postmark' : 'ses';

    if (source === 'postmark' && !validatePostmarkSignature(req)) {
      log('warn', 'Invalid Postmark webhook signature');
      return;
    }

    if (source === 'ses' && !validateSesSignature(req)) {
      log('warn', 'Invalid SES/SNS signature');
      return;
    }

    let from: string;
    let to: string;
    let subject: string;
    let textBody: string;
    let htmlBody: string;

    if (source === 'ses') {
      // Parse SES SNS notification
      const snsBody = req.body as { Type?: string; Message?: string };
      if (snsBody.Type === 'SubscriptionConfirmation') {
        log('info', 'SNS subscription confirmation received');
        return;
      }
      const sesMessage = JSON.parse(snsBody.Message ?? '{}') as {
        mail?: { source?: string; destination?: string[]; commonHeaders?: { subject?: string } };
        content?: string;
      };
      from = sesMessage.mail?.source ?? '';
      to = sesMessage.mail?.destination?.[0] ?? '';
      subject = sesMessage.mail?.commonHeaders?.subject ?? '';
      textBody = sesMessage.content ?? '';
      htmlBody = '';
    } else {
      // Parse Postmark payload
      const parsed = postmarkPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        log('warn', 'Invalid Postmark payload', { errors: parsed.error.errors });
        return;
      }
      from = parsed.data.From;
      to = parsed.data.To;
      subject = parsed.data.Subject;
      textBody = parsed.data.TextBody;
      htmlBody = parsed.data.HtmlBody;
    }

    log('info', 'Processing inbound email', { from, to, subject });

    // Extract user short ID from the TO address
    const shortId = extractUserShortId(to);
    if (!shortId) {
      log('warn', 'No user short ID found in TO address', { to });
      return;
    }

    const userId = await resolveUserFromShortId(shortId);
    if (!userId) {
      log('warn', 'User not found for short ID', { shortId });
      return;
    }

    // Parse email with Claude
    const parseResult = await parseEmailWithClaude(subject, textBody, htmlBody, from);

    let parsingStatus: 'success' | 'failed' | 'unknown_program';
    if (!parseResult) {
      parsingStatus = 'failed';
    } else if (!parseResult.program_slug) {
      parsingStatus = 'unknown_program';
    } else {
      parsingStatus = 'success';
    }

    // Store in DB
    const emailId = await storeInboundEmail(
      userId,
      { sender: from, subject, textBody },
      parseResult,
      parsingStatus,
    );

    log('info', 'Stored inbound email', { emailId, parsingStatus });

    // Update user program balance if parse was successful and we have a balance
    if (
      parsingStatus === 'success' &&
      parseResult?.program_slug &&
      parseResult.balance_after !== null
    ) {
      await updateUserProgramBalance(
        userId,
        parseResult.program_slug,
        parseResult.balance_after,
        parseResult.expiry_date,
      );
    }
  } catch (err) {
    log('error', 'Unhandled error processing webhook', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

const server = app.listen(env.PORT, () => {
  log('info', `Email inbound worker listening`, { port: env.PORT });
});

function shutdown(signal: string): void {
  log('info', `Received ${signal}, shutting down gracefully`);
  server.close(() => {
    log('info', 'HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => {
    log('warn', 'Forcing exit after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
