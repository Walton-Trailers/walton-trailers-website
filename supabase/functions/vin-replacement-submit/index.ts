// vin-replacement-submit — fronts the public VIN replacement intake.
//
// Why this exists (vs. direct anon writes from the browser):
//   - per-IP rate limiting (3 submissions/hour) the anon key can't bypass
//   - server-issued signed upload URLs, so the bucket needs no anon policy
//   - the row insert only happens after the four objects are verified present
//   - notification email is sent server-side: Resend when RESEND_API_KEY is
//     set, otherwise Formspree — either way best-effort, never fails a request
//
// Client protocol (JSON POST, anon key auth):
//   {action:"start", gotcha, vin_last3, files:[{slug,name,type,size}x4]}
//     -> {ok, folder, uploads:[{slug, path, signedUrl}]}   (or 429 rate_limited)
//   {action:"finalize", folder, paths:{slug:path}, fields:{...}}
//     -> {ok}
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "vin-replacement-docs";
const TABLE = "vin_replacement_requests";
const MAX_BYTES = 10 * 1024 * 1024;
const RATE_LIMIT = 3; // submissions per IP per hour
const SLUGS = ["photo-id", "proof-of-ownership", "stamped-vin", "full-trailer"] as const;
const OK_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
  "application/pdf", "application/octet-stream", "",
]);
const OK_EXT = /\.(jpe?g|png|webp|heic|heif|pdf)$/i;
const ALLOWED_ORIGINS = new Set([
  "https://www.waltontrailers.com",
  "https://waltontrailers.com",
  "https://walton-trailers-website.vercel.app",
  "http://localhost:8743",
]);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://www.waltontrailers.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(origin: string, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

function fileProblem(f: { name?: string; type?: string; size?: number }): string | null {
  if (!f || typeof f.size !== "number") return "missing file metadata";
  if (f.size <= 0 || f.size > MAX_BYTES) return `"${f.name}" exceeds the 10MB limit`;
  const type = f.type ?? "";
  if (!OK_TYPES.has(type) && !OK_EXT.test(f.name ?? "")) return `"${f.name}" is not a supported file type`;
  if (type === "image/svg+xml" || /\.svg$/i.test(f.name ?? "")) return `"${f.name}" is not a supported file type`;
  return null;
}

async function notify(fields: Record<string, string>, paths: Record<string, string>) {
  const last3 = fields.vin_last3;
  const docLine =
    `ID: ${paths["photo-id"]} | Ownership: ${paths["proof-of-ownership"]}` +
    ` | Stamped VIN: ${paths["stamped-vin"]} | Trailer: ${paths["full-trailer"]}`;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("NOTIFY_TO") ?? "sales@waltontrailers.com";

  if (resendKey) {
    try {
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const rows = [
        ["Name", fields.full_name], ["Phone", fields.phone], ["Email", fields.email],
        ["Shipping Address", `${fields.shipping_address}, ${fields.shipping_city}, ${fields.shipping_state} ${fields.shipping_zip}`],
        ["VIN (last 3)", last3], ["Trailer Model", fields.trailer_model || "—"],
        ["Reason", fields.replacement_reason + (fields.replacement_reason_other ? ` — ${fields.replacement_reason_other}` : "")],
        ["Digital Signature", `${fields.digital_signature} (${fields.signature_date})`],
        ["Documents", docLine],
      ].map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join("");
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("NOTIFY_FROM") ?? "Walton Website <onboarding@resend.dev>",
          to: [to],
          subject: `VIN Replacement Request — VIN ending ${last3}`,
          html: `<h2>New VIN Replacement Request</h2><table>${rows}</table>` +
                `<p>Documents are in the private <code>${BUCKET}</code> bucket — Supabase dashboard → Storage.</p>`,
        }),
      });
      if (res.ok) return;
      console.error("Resend failed:", res.status, await res.text());
    } catch (e) {
      console.error("Resend error:", e);
    }
  }

  // Fallback (and default until a Resend key is configured)
  try {
    await fetch("https://formspree.io/f/xwvygnnq", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        _subject: `VIN Replacement Request — VIN ending ${last3}`,
        Form: "VIN Replacement (edge function)",
        Name: fields.full_name,
        email: fields.email,
        Phone: fields.phone,
        "Shipping Address": `${fields.shipping_address}, ${fields.shipping_city}, ${fields.shipping_state} ${fields.shipping_zip}`,
        "VIN (last 3)": last3,
        "Trailer Model": fields.trailer_model || "—",
        Reason: fields.replacement_reason + (fields.replacement_reason_other ? ` — ${fields.replacement_reason_other}` : ""),
        "Digital Signature": `${fields.digital_signature} (${fields.signature_date})`,
        [`Documents (bucket ${BUCKET})`]: docLine,
      }),
    });
  } catch (e) {
    console.error("Formspree fallback error:", e);
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return reply(origin, 405, { ok: false, code: "method_not_allowed" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(origin, 400, { ok: false, code: "bad_json" });
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  // ── start: rate-check, validate file metadata, issue signed upload URLs ──
  if (body.action === "start") {
    // Honeypot: report success so bots (and autofill victims) see a normal flow.
    if (body.gotcha) return reply(origin, 200, { ok: true, honeypot: true, folder: "", uploads: [] });

    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count, error: cntErr } = await supabase
      .from("vin_submission_events")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", hourAgo);
    if (cntErr) {
      console.error("rate check failed:", cntErr);
      return reply(origin, 500, { ok: false, code: "server_error" });
    }
    if ((count ?? 0) >= RATE_LIMIT) return reply(origin, 429, { ok: false, code: "rate_limited" });

    const files = Array.isArray(body.files) ? body.files as Record<string, unknown>[] : [];
    if (files.length !== 4 || !SLUGS.every((s) => files.some((f) => f.slug === s))) {
      return reply(origin, 400, { ok: false, code: "missing_file" });
    }
    for (const f of files) {
      const problem = fileProblem(f as { name?: string; type?: string; size?: number });
      if (problem) return reply(origin, 400, { ok: false, code: "invalid_file", detail: problem, slug: f.slug });
    }

    await supabase.from("vin_submission_events").insert({ ip });

    const last3 = clean(body.vin_last3, 3).replace(/[^0-9]/g, "");
    const folder = `vin-${last3 || "unknown"}/${crypto.randomUUID()}`;
    const uploads: { slug: string; path: string; signedUrl: string }[] = [];
    for (const f of files) {
      const safeName = String(f.name ?? "file").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
      const path = `${folder}/${f.slug}-${safeName}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error || !data) {
        console.error("signed url failed:", error);
        return reply(origin, 500, { ok: false, code: "storage_error" });
      }
      uploads.push({ slug: String(f.slug), path, signedUrl: data.signedUrl });
    }
    return reply(origin, 200, { ok: true, folder, uploads });
  }

  // ── finalize: verify the uploads exist, insert the row, notify ──
  if (body.action === "finalize") {
    const folder = String(body.folder ?? "");
    if (!/^vin-[0-9]{0,3}(unknown)?\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(folder) &&
        !/^vin-unknown\/[0-9a-f-]{36}$/.test(folder)) {
      return reply(origin, 400, { ok: false, code: "bad_folder" });
    }

    const paths = (body.paths ?? {}) as Record<string, string>;
    if (!SLUGS.every((s) => typeof paths[s] === "string" && paths[s].startsWith(folder + "/"))) {
      return reply(origin, 400, { ok: false, code: "bad_paths" });
    }

    // A folder can only ever back one request row (blocks replay spam).
    const { count: dupCount } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .like("photo_id_path", folder + "/%");
    if ((dupCount ?? 0) > 0) return reply(origin, 409, { ok: false, code: "duplicate" });

    // All four objects must actually be in the bucket.
    const { data: objects, error: listErr } = await supabase.storage.from(BUCKET).list(folder);
    if (listErr) {
      console.error("list failed:", listErr);
      return reply(origin, 500, { ok: false, code: "storage_error" });
    }
    const present = new Set((objects ?? []).map((o) => `${folder}/${o.name}`));
    for (const s of SLUGS) {
      if (!present.has(paths[s])) return reply(origin, 400, { ok: false, code: "upload_incomplete", slug: s });
    }

    const f = (body.fields ?? {}) as Record<string, unknown>;
    const fields = {
      full_name: clean(f.full_name, 120),
      phone: clean(f.phone, 40),
      email: clean(f.email, 254),
      shipping_address: clean(f.shipping_address, 200),
      shipping_city: clean(f.shipping_city, 100),
      shipping_state: clean(f.shipping_state, 30),
      shipping_zip: clean(f.shipping_zip, 10),
      vin_last3: clean(f.vin_last3, 3).replace(/[^0-9]/g, ""),
      trailer_model: clean(f.trailer_model, 120) || null,
      replacement_reason: clean(f.replacement_reason, 60),
      replacement_reason_other: clean(f.replacement_reason_other, 300) || null,
      digital_signature: clean(f.digital_signature, 120),
      signature_date: clean(f.signature_date, 10),
      attestation_agreed: f.attestation_agreed === true,
    };
    const required: (keyof typeof fields)[] = [
      "full_name", "phone", "email", "shipping_address", "shipping_city",
      "shipping_state", "shipping_zip", "vin_last3", "replacement_reason",
      "digital_signature", "signature_date",
    ];
    for (const k of required) {
      if (!fields[k]) return reply(origin, 400, { ok: false, code: "missing_field", field: k });
    }
    if (fields.vin_last3.length !== 3) return reply(origin, 400, { ok: false, code: "bad_vin" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.signature_date)) return reply(origin, 400, { ok: false, code: "bad_date" });
    if (!fields.attestation_agreed) return reply(origin, 400, { ok: false, code: "missing_field", field: "attestation_agreed" });

    const { error: insErr } = await supabase.from(TABLE).insert({
      ...fields,
      photo_id_path: paths["photo-id"],
      proof_of_ownership_path: paths["proof-of-ownership"],
      stamped_vin_photo_path: paths["stamped-vin"],
      trailer_photo_path: paths["full-trailer"],
      user_agent: clean(f.user_agent, 400) || null,
      source: "vin-replacement.html",
    });
    if (insErr) {
      console.error("insert failed:", insErr);
      return reply(origin, 500, { ok: false, code: "db_error" });
    }

    await notify({ ...fields, trailer_model: fields.trailer_model ?? "", replacement_reason_other: fields.replacement_reason_other ?? "" } as Record<string, string>, paths);
    return reply(origin, 200, { ok: true });
  }

  return reply(origin, 400, { ok: false, code: "bad_action" });
});
