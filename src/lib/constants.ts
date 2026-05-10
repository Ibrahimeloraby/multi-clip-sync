import type { DocumentType, FileCategory, BusinessVertical } from "@/types";

export const APP_NAME = "Omniform";
export const APP_TAGLINE = "AI-powered data collection and structuring";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  whatsapp_message: "WhatsApp Message",
  voice_note: "Voice Note",
  spreadsheet: "Spreadsheet",
  pdf: "PDF Document",
  screenshot: "Screenshot",
  pos_transaction: "POS Transaction",
  contract: "Contract",
  other: "Other",
};

export const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  invoice: "bg-blue-100 text-blue-800",
  receipt: "bg-green-100 text-green-800",
  whatsapp_message: "bg-emerald-100 text-emerald-800",
  voice_note: "bg-purple-100 text-purple-800",
  spreadsheet: "bg-orange-100 text-orange-800",
  pdf: "bg-red-100 text-red-800",
  screenshot: "bg-yellow-100 text-yellow-800",
  pos_transaction: "bg-cyan-100 text-cyan-800",
  contract: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

export const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  image: "Image",
  audio: "Audio",
  pdf: "PDF",
  spreadsheet: "Spreadsheet",
  text: "Text",
  archive: "Archive",
};

export const MIME_TO_CATEGORY: Record<string, FileCategory> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "image/heic": "image",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "audio/ogg": "audio",
  "audio/wav": "audio",
  "audio/webm": "audio",
  "audio/m4a": "audio",
  "application/pdf": "pdf",
  "application/vnd.ms-excel": "spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "spreadsheet",
  "text/csv": "spreadsheet",
  "text/plain": "text",
  "application/zip": "archive",
};

export const SUPPORTED_MIME_TYPES = Object.keys(MIME_TO_CATEGORY);
export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILES_PER_UPLOAD = 20;

export const VERTICAL_LABELS: Record<BusinessVertical, string> = {
  retail: "Retail",
  food_and_beverage: "Food & Beverage",
  logistics: "Logistics",
  finance: "Finance",
  healthcare: "Healthcare",
  real_estate: "Real Estate",
  construction: "Construction",
  custom: "Custom",
};

export const CONFIDENCE_THRESHOLDS = { high: 0.85, medium: 0.65, low: 0 };

export const CONFIDENCE_COLORS = {
  high: "text-green-600 bg-green-50",
  medium: "text-yellow-600 bg-yellow-50",
  low: "text-red-600 bg-red-50",
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  manual_upload: "Manual Upload",
  whatsapp: "WhatsApp",
  email: "Email",
  google_drive: "Google Drive",
  pos_webhook: "POS System",
  api: "API",
};
