/**
 * Common TypeScript types shared across all LoyaltyOne background workers.
 */

// ─── Environment ──────────────────────────────────────────────────────────────

export interface WorkerEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ANTHROPIC_API_KEY: string;
  FCM_SERVER_KEY: string;
  PORT?: string;
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  worker: string;
  timestamp: string;
  data?: Record<string, unknown>;
  error?: string;
  stack?: string;
}

export interface WorkerLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: unknown, data?: Record<string, unknown>): void;
}

// ─── FCM ──────────────────────────────────────────────────────────────────────

export interface FcmNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  click_action?: string;
}

export interface FcmMessage {
  to: string; // device token
  notification: FcmNotification;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
  time_to_live?: number;
}

export interface FcmBatchMessage {
  registration_ids: string[]; // up to 1000 tokens
  notification: FcmNotification;
  data?: Record<string, string>;
  priority?: 'high' | 'normal';
}

export interface FcmResponse {
  multicast_id: number;
  success: number;
  failure: number;
  results: Array<{
    message_id?: string;
    error?: string;
    registration_id?: string; // updated token
  }>;
}

// ─── Supabase Helpers ─────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface BatchResult<T> {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ item: T; error: string }>;
}

// ─── Email Webhook ────────────────────────────────────────────────────────────

/** Postmark inbound email webhook payload */
export interface PostmarkInboundPayload {
  MessageID: string;
  From: string;
  FromFull: {
    Email: string;
    Name: string;
    MailboxHash: string;
  };
  To: string;
  ToFull: Array<{
    Email: string;
    Name: string;
    MailboxHash: string;
  }>;
  ReplyTo: string;
  Subject: string;
  Date: string;
  MailboxHash: string;
  TextBody: string;
  HtmlBody: string;
  StrippedTextReply: string;
  Tag: string;
  Headers: Array<{ Name: string; Value: string }>;
  Attachments: Array<{
    Name: string;
    Content: string;
    ContentType: string;
    ContentLength: number;
  }>;
}

/** AWS SES inbound email (via SNS) webhook payload */
export interface SesInboundPayload {
  Type: 'Notification';
  MessageId: string;
  TopicArn: string;
  Subject: string;
  Message: string; // JSON string containing SES mail object
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL: string;
}

export interface SesMailMessage {
  mail: {
    messageId: string;
    source: string;
    destination: string[];
    headers: Array<{ name: string; value: string }>;
    commonHeaders: {
      from: string[];
      to: string[];
      subject: string;
      date: string;
    };
  };
  content: string; // raw email content
}

// ─── Geofence ─────────────────────────────────────────────────────────────────

export interface LocationPayload {
  user_id: string;
  lat: number;
  lng: number;
  accuracy_meters?: number;
  device_token?: string;
}

export interface NearbyMerchant {
  merchant_id: string;
  merchant_slug: string;
  display_name_en: string;
  display_name_ar: string;
  distance_meters: number;
  pending_rules_count: number;
  branch_name?: string;
}

// ─── Expiry Check ─────────────────────────────────────────────────────────────

export interface ExpiryCheckResult {
  user_id: string;
  user_program_id: string;
  program_slug: string;
  display_name: string;
  amount: number;
  expires_at: string;
  alert_level: '30d' | '14d' | '7d' | '1d';
  estimated_value_aed: number;
}

// ─── Monthly Rewards ──────────────────────────────────────────────────────────

export interface MonthlyLeaderboardEntry {
  user_id: string;
  full_name: string | null;
  monthly_reputation_gain: number;
  rank: number;
}

export interface MonthlyRewardResult {
  month: string;
  processed_users: number;
  top10_rewarded: number;
  top1_rewarded: boolean;
  notifications_sent: number;
}

// ─── Admin Digest ─────────────────────────────────────────────────────────────

export interface AdminDigestData {
  date: string;
  pending_review_items: number;
  rules_by_status: Record<string, number>;
  new_users_7d: number;
  suspicious_submissions: SuspiciousSubmission[];
  disputed_rules_count: number;
  top_merchants_by_rules: Array<{ merchant_slug: string; rule_count: number }>;
  email_parse_success_rate_7d: number;
}

export interface SuspiciousSubmission {
  user_id: string | null;
  submission_count: number;
  time_window_hours: number;
  flag_reason: string;
}

// ─── Worker Run Result ────────────────────────────────────────────────────────

export interface WorkerRunResult {
  worker: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  status: 'success' | 'partial' | 'failed';
  summary: Record<string, unknown>;
  errors: string[];
}
