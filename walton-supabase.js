/**
 * walton-supabase.js
 *
 * Minimal Supabase REST helper for the marketing site. We only need
 * unauthenticated INSERTs into a couple of "lead" tables, so loading
 * the full @supabase/supabase-js SDK from npm would be overkill — a
 * tiny fetch wrapper does the job.
 *
 * Replace the URL + ANON_KEY constants below with the values from the
 * Supabase project's Settings → API page. The anon key is safe to ship
 * in client code as long as RLS policies are configured (see
 * supabase/schema.sql).
 *
 * Usage:
 *   await WaltonSupabase.insert('trailer_registrations', { first_name: ..., ... });
 */
(function () {
  // === EDIT THESE TWO VALUES ===========================================
  // Paste from Supabase dashboard → Project Settings → API.
  // Both are safe to expose in client code (anon key is rate-limited
  // and gated by Row Level Security policies in supabase/schema.sql).
  var SUPABASE_URL = 'https://tsdfkymvkbwcloirvnpe.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzZGZreW12a2J3Y2xvaXJ2bnBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTEzNTcsImV4cCI6MjA5NTU2NzM1N30.CC6XujUu9s64NZl8fgVS6HmDvc3wvDrwfos7idqINiM';
  // =====================================================================

  function isConfigured() {
    return SUPABASE_URL.indexOf('__') !== 0 && SUPABASE_ANON_KEY.indexOf('__') !== 0;
  }

  async function insert(table, row) {
    if (!isConfigured()) {
      throw new Error(
        'Supabase is not configured yet. Set SUPABASE_URL and SUPABASE_ANON_KEY in walton-supabase.js.'
      );
    }
    var resp = await fetch(SUPABASE_URL + '/rest/v1/' + encodeURIComponent(table), {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        // Tell PostgREST we don't need the inserted row back — keeps the
        // response small and avoids leaking sensitive columns to clients.
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(row)
    });
    if (!resp.ok) {
      var text = '';
      try { text = await resp.text(); } catch (e) { /* ignore */ }
      var err = new Error('Supabase insert failed: HTTP ' + resp.status + (text ? ' — ' + text : ''));
      err.status = resp.status;
      err.body = text;
      throw err;
    }
    return true;
  }

  /**
   * Upload a File/Blob to a Supabase Storage bucket. Returns the path
   * inside the bucket (NOT a public URL — bucket is private). The path
   * can later be used to generate signed URLs from the dashboard or an
   * admin app.
   *
   * Caller is responsible for ensuring the bucket exists and has an
   * anon-insert RLS policy (see supabase/schema.sql).
   */
  async function uploadFile(bucket, path, file) {
    if (!isConfigured()) {
      throw new Error('Supabase is not configured yet.');
    }
    var url = SUPABASE_URL + '/storage/v1/object/'
      + encodeURIComponent(bucket) + '/'
      + path.split('/').map(encodeURIComponent).join('/');
    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: file
    });
    if (!resp.ok) {
      var text = '';
      try { text = await resp.text(); } catch (e) { /* ignore */ }
      var err = new Error('Supabase upload failed: HTTP ' + resp.status + (text ? ' — ' + text : ''));
      err.status = resp.status;
      err.body = text;
      throw err;
    }
    return path; // Path inside the bucket. Caller saves this on the row.
  }

  /**
   * Invoke a Supabase Edge Function with the anon key. Returns
   * { status, ok, body } — body is the parsed JSON (or {} on parse failure)
   * so callers can branch on body.code for structured errors.
   */
  async function invokeFunction(name, payload) {
    if (!isConfigured()) {
      throw new Error('Supabase is not configured yet.');
    }
    var resp = await fetch(SUPABASE_URL + '/functions/v1/' + encodeURIComponent(name), {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    var body = {};
    try { body = await resp.json(); } catch (e) { /* non-JSON error body */ }
    return { status: resp.status, ok: resp.ok, body: body };
  }

  /**
   * Upload a File/Blob to a server-issued signed upload URL (from
   * storage.createSignedUploadUrl on the edge function side). The token in
   * the URL is the authorization — no bucket policy needed.
   */
  async function uploadToSignedUrl(signedUrl, file) {
    var resp = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: file
    });
    if (!resp.ok) {
      var text = '';
      try { text = await resp.text(); } catch (e) { /* ignore */ }
      var err = new Error('Upload failed: HTTP ' + resp.status + (text ? ' — ' + text : ''));
      err.status = resp.status;
      err.body = text;
      throw err;
    }
    return true;
  }

  window.WaltonSupabase = {
    insert: insert,
    uploadFile: uploadFile,
    invokeFunction: invokeFunction,
    uploadToSignedUrl: uploadToSignedUrl,
    isConfigured: isConfigured
  };
})();
