// vin-replacement-maintenance — scheduled housekeeping for the VIN intake.
// Invoked weekly by pg_cron (see supabase/schema.sql). Three jobs:
//   1. Delete orphaned bucket objects >7 days old that no request row references
//      (files upload before the row saves, so abandoned submissions strand them).
//   2. 90-day document retention: delete the four uploaded documents for
//      requests older than 90 days, keep the row, stamp documents_purged_at.
//   3. Trim the per-IP rate-limit event log (>2 days old).
// Requires header x-maintenance-key matching the MAINTENANCE_SECRET env var.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "vin-replacement-docs";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const secret = Deno.env.get("MAINTENANCE_SECRET");
  if (!secret || req.headers.get("x-maintenance-key") !== secret) {
    return new Response(JSON.stringify({ ok: false, code: "forbidden" }), { status: 403 });
  }

  const summary = { orphans_deleted: 0, retention_files_deleted: 0, retention_rows_marked: 0, events_trimmed: true, errors: [] as string[] };

  // 1+2: candidates come from a security-definer SQL helper that can see storage.objects.
  const { data: candidates, error: candErr } = await supabase.rpc("vin_maintenance_candidates");
  if (candErr) {
    summary.errors.push(`candidates: ${candErr.message}`);
  } else {
    const orphanNames = (candidates ?? []).filter((c: { kind: string }) => c.kind === "orphan").map((c: { object_name: string }) => c.object_name);
    const retention = (candidates ?? []).filter((c: { kind: string }) => c.kind === "retention");
    const retentionNames = retention.map((c: { object_name: string }) => c.object_name);
    const retentionRowIds = [...new Set(retention.map((c: { request_id: number }) => c.request_id))];

    const toDelete = [...orphanNames, ...retentionNames];
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) summary.errors.push(`remove batch ${i}: ${error.message}`);
    }
    summary.orphans_deleted = orphanNames.length;
    summary.retention_files_deleted = retentionNames.length;

    if (retentionRowIds.length > 0) {
      const { error } = await supabase
        .from("vin_replacement_requests")
        .update({ documents_purged_at: new Date().toISOString() })
        .in("id", retentionRowIds);
      if (error) summary.errors.push(`mark purged: ${error.message}`);
      else summary.retention_rows_marked = retentionRowIds.length;
    }
  }

  // 3: trim the rate-limit log.
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600_000).toISOString();
  const { error: trimErr } = await supabase.from("vin_submission_events").delete().lt("created_at", twoDaysAgo);
  if (trimErr) {
    summary.events_trimmed = false;
    summary.errors.push(`trim events: ${trimErr.message}`);
  }

  console.log("maintenance summary:", JSON.stringify(summary));
  return new Response(JSON.stringify({ ok: summary.errors.length === 0, ...summary }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
