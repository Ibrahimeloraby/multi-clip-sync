import type { FieldDefinition } from "@/types/crm";

export function autoMapColumns(
  parsedHeaders: string[],
  fields: FieldDefinition[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  fields.forEach((field) => {
    const aliases = buildAliases(field);
    for (const header of parsedHeaders) {
      const normalized = header.toLowerCase().replace(/[\s_-]+/g, "");
      if (aliases.some((a) => normalized.includes(a))) {
        mapping[header] = field.key;
        break;
      }
    }
  });

  return mapping;
}

function buildAliases(field: FieldDefinition): string[] {
  const base = field.key.toLowerCase().replace(/_/g, "");
  const label = field.label.toLowerCase().replace(/[\s_-]+/g, "");
  const extras: Record<string, string[]> = {
    name: ["fullname", "clientname", "contactname", "customername"],
    phone: ["mobile", "cell", "tel", "telephone", "whatsapp", "contact"],
    email: ["emailaddress", "mail"],
    budget_min: ["minbudget", "minimumbudget", "budgetfrom", "budgetmin"],
    budget_max: ["maxbudget", "maximumbudget", "budgetto", "budgetmax"],
    location: ["area", "community", "district", "zone", "city", "emirate"],
    property_type: ["propertytype", "type", "unittype"],
    bedrooms: ["beds", "br", "bedroom"],
    timeline: ["urgency", "when", "timeframe"],
    asking_price: ["price", "sellingprice", "listprice"],
    asking_rent: ["rent", "rentprice", "annualrent"],
    notes: ["remarks", "comments", "description", "details"],
  };
  return [base, label, ...(extras[field.key] ?? [])];
}

export function cleanProspectData(
  row: Record<string, string>,
  columnMapping: Record<string, string>,
  fields: FieldDefinition[]
): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {};

  fields.forEach((field) => {
    // Find source column mapped to this field
    const sourceCol = Object.keys(columnMapping).find((k) => columnMapping[k] === field.key);
    const raw = sourceCol ? row[sourceCol] ?? "" : "";
    result[field.key] = cleanValue(raw, field);
  });

  return result;
}

function cleanValue(raw: string, field: FieldDefinition): string | number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (field.type === "number") {
    // Strip currency symbols, commas, spaces
    const num = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? null : num;
  }

  if (field.type === "phone") {
    return normalizePhone(trimmed);
  }

  if (field.type === "email") {
    return trimmed.toLowerCase();
  }

  if (field.type === "date") {
    return normalizeDate(trimmed);
  }

  if (field.type === "select" && field.options) {
    // Try to find a matching option (case-insensitive partial match)
    const lower = trimmed.toLowerCase();
    const match = field.options.find((opt) => opt.toLowerCase() === lower);
    return match ?? trimmed;
  }

  return trimmed;
}

export function normalizePhone(phone: string): string {
  // Remove all non-digit chars except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Common UAE format fixes
  if (cleaned.startsWith("00971")) cleaned = "+" + cleaned.slice(2);
  if (cleaned.startsWith("971") && !cleaned.startsWith("+971")) cleaned = "+" + cleaned;
  if (/^0[0-9]{9}$/.test(cleaned)) cleaned = "+971" + cleaned.slice(1);

  return cleaned;
}

function normalizeDate(raw: string): string {
  // Try common date formats and return ISO date string
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})/, // ISO
    /^(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
  ];

  for (const fmt of formats) {
    const m = raw.match(fmt);
    if (m) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
  }

  // Let JS try to parse it
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return raw;
}

export function applyFilterRules(
  prospects: import("@/types/crm").Prospect[],
  rules: import("@/types/crm").FilterRule[]
): import("@/types/crm").Prospect[] {
  if (!rules.length) return prospects;

  return prospects.filter((p) => {
    return rules.every((rule) => {
      const val = p.data[rule.fieldKey];
      if (val === null || val === undefined) return false;

      switch (rule.operator) {
        case "eq":
          return String(val).toLowerCase() === String(rule.value).toLowerCase();
        case "neq":
          return String(val).toLowerCase() !== String(rule.value).toLowerCase();
        case "contains":
          return String(val).toLowerCase().includes(String(rule.value).toLowerCase());
        case "gt":
          return Number(val) > Number(rule.value);
        case "lt":
          return Number(val) < Number(rule.value);
        case "gte":
          return Number(val) >= Number(rule.value);
        case "lte":
          return Number(val) <= Number(rule.value);
        case "in":
          return (rule.value as string[]).includes(String(val));
        case "between": {
          const [min, max] = rule.value as [number, number];
          return Number(val) >= min && Number(val) <= max;
        }
        default:
          return true;
      }
    });
  });
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

export function fillTemplate(template: string, data: Record<string, string | number | null>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val !== null && val !== undefined ? String(val) : `{{${key}}}`;
  });
}
