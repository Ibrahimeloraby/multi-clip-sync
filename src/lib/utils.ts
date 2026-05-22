import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import type { RuleStatus } from "@/types";

// ─── Shadcn utility (kept) ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency / points formatting ─────────────────────────────────────────────

/**
 * Format a number as AED currency.
 * e.g. 1234.5 → "AED 1,234.50"
 */
export function formatAED(amount: number): string {
  if (!Number.isFinite(amount)) return "AED 0.00";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a points balance with optional program-specific suffix.
 * e.g. 12500 → "12,500 pts"
 *      12500, "skywards" → "12,500 miles"
 */
const PROGRAM_POINT_LABELS: Record<string, string> = {
  skywards: "miles",
  "etihad-guest": "miles",
  "miles-and-smiles": "miles",
  "air-arabia-airewards": "miles",
  "flynas-nasmiles": "miles",
};

export function formatPoints(amount: number, programSlug?: string): string {
  if (!Number.isFinite(amount)) return "0 pts";
  const formatted = new Intl.NumberFormat("en-AE").format(Math.round(amount));
  const label =
    programSlug && PROGRAM_POINT_LABELS[programSlug]
      ? PROGRAM_POINT_LABELS[programSlug]
      : "pts";
  return `${formatted} ${label}`;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Return a human-readable relative date string.
 * e.g. "3 days ago" or "منذ 3 أيام" if lang=ar
 */
export function getRelativeDate(dateStr: string, lang = "en"): string {
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: lang === "ar" ? ar : undefined,
    });
  } catch {
    return "";
  }
}

/**
 * Format a date string as short date, respecting locale.
 * e.g. "15 Mar 2025"
 */
export function formatDate(dateStr: string, lang = "en"): string {
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return format(date, "d MMM yyyy", {
      locale: lang === "ar" ? ar : undefined,
    });
  } catch {
    return "";
  }
}

/**
 * Days until a date. Negative means already past.
 */
export function daysUntil(dateStr: string): number {
  try {
    const date = parseISO(dateStr);
    const diff = date.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

// ─── Confidence score ─────────────────────────────────────────────────────────

/**
 * Returns a Tailwind text color class based on confidence score 0-100.
 */
export function getConfidenceColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  if (score >= 20) return "text-orange-500";
  return "text-red-500";
}

/**
 * Returns a Tailwind bg + text badge color class pair based on confidence score.
 */
export function getConfidenceBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 60) return "bg-green-100 text-green-800";
  if (score >= 40) return "bg-yellow-100 text-yellow-800";
  if (score >= 20) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

// ─── Rule status color ────────────────────────────────────────────────────────

/**
 * Returns a Tailwind badge class for a rule status string.
 */
export function getRuleStatusColor(status: RuleStatus | string): string {
  switch (status) {
    case "trusted":
      return "bg-emerald-100 text-emerald-800";
    case "verified":
      return "bg-green-100 text-green-800";
    case "provisional":
      return "bg-blue-100 text-blue-800";
    case "pending":
      return "bg-gray-100 text-gray-700";
    case "disputed":
      return "bg-red-100 text-red-800";
    case "expired":
      return "bg-neutral-100 text-neutral-500 line-through";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

// ─── Reputation tier ──────────────────────────────────────────────────────────

export function getReputationTierColor(tier: string): string {
  switch (tier) {
    case "maven":
      return "text-purple-600";
    case "expert":
      return "text-blue-600";
    case "trusted":
      return "text-emerald-600";
    case "contributor":
      return "text-yellow-600";
    default:
      return "text-gray-500";
  }
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────

/** Truncate a string to maxLen with ellipsis */
export function truncate(str: string, maxLen = 40): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Check if a rule is currently active (by date range + days of week) */
export function isRuleActiveNow(rule: {
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[];
}): boolean {
  const now = new Date();
  if (rule.start_date && now < parseISO(rule.start_date)) return false;
  if (rule.end_date && now > parseISO(rule.end_date)) return false;
  if (rule.days_of_week.length > 0) {
    const dayOfWeek = now.getDay(); // 0 = Sunday
    if (!rule.days_of_week.includes(dayOfWeek)) return false;
  }
  return true;
}
