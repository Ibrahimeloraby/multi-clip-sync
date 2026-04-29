export type StakeholderType = string;

export interface FieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "phone" | "email" | "range";
  options?: string[]; // for select type
  filterable: boolean;
  required?: boolean;
}

export interface StakeholderTemplate {
  id: StakeholderType;
  label: string;
  color: string; // tailwind bg color class
  fields: FieldDefinition[];
  defaultOutreachTemplate: string;
}

export interface IndustryTemplate {
  id: string;
  label: string;
  icon: string;
  stakeholders: StakeholderTemplate[];
}

export interface Prospect {
  id: string;
  industryId: string;
  stakeholderType: StakeholderType;
  data: Record<string, string | number | null>;
  importedAt: string;
  tags: string[];
  status: "new" | "contacted" | "qualified" | "closed";
}

export interface ImportSession {
  id: string;
  industryId: string;
  stakeholderType: StakeholderType;
  fileName: string;
  importedAt: string;
  recordCount: number;
  columnMapping: Record<string, string>; // sourceCol -> fieldKey
}

export interface FilterRule {
  fieldKey: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in" | "between";
  value: string | number | string[] | [number, number];
}

export interface FilterPreset {
  id: string;
  name: string;
  industryId: string;
  stakeholderType: StakeholderType;
  rules: FilterRule[];
  employeeId: string;
  createdAt: string;
}

export interface OutreachTemplate {
  id: string;
  name: string;
  industryId: string;
  stakeholderType: StakeholderType;
  body: string; // supports {{field_key}} placeholders
  channel: "whatsapp" | "sms" | "email";
  employeeId: string;
}

export interface CRMStore {
  prospects: Prospect[];
  importSessions: ImportSession[];
  filterPresets: FilterPreset[];
  outreachTemplates: OutreachTemplate[];
}
