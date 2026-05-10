export type DocumentType =
  | "invoice"
  | "receipt"
  | "whatsapp_message"
  | "voice_note"
  | "spreadsheet"
  | "pdf"
  | "screenshot"
  | "pos_transaction"
  | "contract"
  | "other";

export type FileCategory = "image" | "audio" | "pdf" | "spreadsheet" | "text" | "archive";

export type UploadStatus = "pending" | "processing" | "completed" | "failed";

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "needs_review";

export type ReviewStatus = "auto_approved" | "needs_review" | "approved" | "rejected";

export type BusinessVertical =
  | "retail"
  | "food_and_beverage"
  | "logistics"
  | "finance"
  | "healthcare"
  | "real_estate"
  | "construction"
  | "custom";

export type FieldType = "text" | "number" | "date" | "currency" | "boolean" | "enum" | "array";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "pro" | "enterprise";
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "owner" | "admin" | "member";
  created_at: string;
}

export interface Vertical {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_template: boolean;
  created_at: string;
}

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  enum_values?: string[];
  ai_hint?: string;
}

export interface ExtractionSchema {
  id: string;
  organization_id: string;
  vertical_id: string | null;
  name: string;
  description: string | null;
  fields: SchemaField[];
  document_types: DocumentType[];
  is_active: boolean;
  created_at: string;
  vertical?: Vertical;
}

export interface DataSource {
  id: string;
  organization_id: string;
  name: string;
  type: "manual_upload" | "whatsapp" | "email" | "google_drive" | "pos_webhook" | "api";
  config: Record<string, unknown>;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface Upload {
  id: string;
  organization_id: string;
  data_source_id: string | null;
  uploaded_by: string | null;
  file_name: string;
  file_type: FileCategory;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string;
  storage_url: string | null;
  status: UploadStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  data_source?: DataSource;
}

export interface ProcessingJob {
  id: string;
  organization_id: string;
  upload_id: string;
  status: JobStatus;
  job_type: "classify" | "extract" | "transcribe" | "parse_table";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error: string | null;
  confidence: number | null;
  model_used: string | null;
  tokens_used: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  upload?: Upload;
}

export interface ExtractedRecord {
  id: string;
  organization_id: string;
  upload_id: string;
  schema_id: string | null;
  vertical_id: string | null;
  document_type: DocumentType;
  raw_data: Record<string, unknown>;
  normalized_data: Record<string, unknown>;
  confidence: number | null;
  field_confidences: Record<string, number>;
  review_status: ReviewStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  upload?: Upload;
  schema?: ExtractionSchema;
  vertical?: Vertical;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  total_uploads: number;
  processed_today: number;
  pending_review: number;
  accuracy_rate: number;
  uploads_by_type: Record<DocumentType, number>;
  uploads_by_vertical: Record<string, number>;
  processing_trend: { date: string; count: number }[];
}

export interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: "idle" | "uploading" | "done" | "error";
  error?: string;
}
