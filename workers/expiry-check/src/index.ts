/**
 * LoyaltyOne — Expiry Check Worker
 *
 * Daily cron job that scans all user_programs with expiry_dates and creates
 * expiring_alerts for tranches expiring within 1, 7, 14, or 30 days.
 *
 * Schedule: 06:00 UTC daily (10:00 GST)
 * Deploy: Railway cron service
 */

import { createClient } from "@supabase/supabase-js";

// ─── Environment ──────────────────────────────────────────────────────────────

function requiredEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const supabase = createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = "1d" | "7d" | "14d" | "30d";

interface ExpiryTranche {
  amount: number;
  expires_at: string;
}

interface UserProgram {
  id: string;
  user_id: string;
  expiry_dates: ExpiryTranche[] | null;
  program: {
    display_name_en: string;
    default_redemption_value_aed: number;
  } | null;
}

// ─── Logger ───────────────────────────────────────────────────────────────────

function log(
  level: "info" | "warn" | "error",
  message: string,
  data?: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      level,
      worker: "expiry-check",
      timestamp: new Date().toISOString(),
      message,
      ...data,
    })
  );
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

function getAlertLevel(daysUntil: number): AlertLevel | null {
  if (daysUntil < 0) return null; // already expired
  if (daysUntil <= 1) return "1d";
  if (daysUntil <= 7) return "7d";
  if (daysUntil <= 14) return "14d";
  if (daysUntil <= 30) return "30d";
  return null;
}

async function checkExpiry(): Promise<void> {
  log("info", "Starting expiry check...");
  const startTime = Date.now();
  const now = new Date();

  // Fetch all user_programs that have expiry data
  const { data: programs, error: fetchError } = await supabase
    .from("user_programs")
    .select(
      "id, user_id, expiry_dates, program:programs(display_name_en, default_redemption_value_aed)"
    )
    .not("expiry_dates", "is", null);

  if (fetchError) {
    log("error", "Failed to fetch user_programs", {
      error: fetchError.message,
    });
    return;
  }

  log("info", `Fetched ${programs?.length ?? 0} user_programs with expiry data`);

  let totalProcessed = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const up of (programs as UserProgram[]) ?? []) {
    const tranches = up.expiry_dates ?? [];

    for (const tranche of tranches) {
      if (!tranche.expires_at || typeof tranche.amount !== "number") {
        totalSkipped++;
        continue;
      }

      totalProcessed++;

      const expiresAt = new Date(tranche.expires_at);
      const daysUntil = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const alertLevel = getAlertLevel(daysUntil);
      if (!alertLevel) {
        totalSkipped++;
        continue;
      }

      const redemptionValue =
        up.program?.default_redemption_value_aed ?? 0.01;
      const estimatedValueAed = tranche.amount * redemptionValue;

      // Upsert alert — ON CONFLICT DO NOTHING via upsert with ignoreDuplicates
      const { error: upsertError } = await supabase
        .from("expiring_alerts")
        .upsert(
          {
            user_id: up.user_id,
            user_program_id: up.id,
            amount: tranche.amount,
            expires_at: tranche.expires_at,
            alert_level: alertLevel,
            estimated_value_aed: estimatedValueAed,
            created_at: now.toISOString(),
          },
          {
            onConflict: "user_id,user_program_id,alert_level",
            ignoreDuplicates: true,
          }
        );

      if (upsertError) {
        log("warn", "Failed to upsert expiring_alert", {
          user_program_id: up.id,
          alert_level: alertLevel,
          error: upsertError.message,
        });
        totalErrors++;
      } else {
        totalCreated++;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  log("info", "Expiry check complete", {
    duration_ms: durationMs,
    total_processed: totalProcessed,
    alerts_created_or_updated: totalCreated,
    skipped: totalSkipped,
    errors: totalErrors,
  });
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

checkExpiry()
  .then(() => {
    log("info", "Worker finished successfully");
    process.exit(0);
  })
  .catch((err) => {
    log("error", "Worker failed with unhandled error", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  });
