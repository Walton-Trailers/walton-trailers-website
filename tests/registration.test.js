'use strict';
/* The registration form is the gate for the 30-day warranty rule, so two
 * things must not regress silently: the VIN the form accepts, and what the
 * public duplicate-check can reveal. These are static assertions over
 * register.html, walton-supabase.js and supabase/schema.sql.
 *
 * Run: node --test tests/registration.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { read } = require('./helpers.js');

const page = read('register.html');
const schema = read('supabase/schema.sql');
const helper = read('walton-supabase.js');

test('the VIN field only accepts a real 17-character VIN', () => {
  const m = page.match(/<input[^>]*id="rVin"[^>]*>/);
  assert.ok(m, 'register.html needs the #rVin input');
  const input = m[0];
  assert.match(input, /maxlength="17"/, 'VIN maxlength must be 17');
  assert.match(input, /minlength="17"/, 'VIN minlength must be 17');
  assert.match(input, /pattern="\[A-HJ-NPR-Za-hj-npr-z0-9\]\{17\}"/,
    'the pattern must exclude I, O and Q (never used in a VIN) and require exactly 17 characters');
  assert.match(input, /\brequired\b/, 'VIN stays required');
  assert.match(page, /var VIN_RE = \/\^\[A-HJ-NPR-Z0-9\]\{17\}\$\//,
    'the script-side validator must match the input pattern');
});

test('the form runs the duplicate check but never blocks a submission on it', () => {
  assert.match(page, /WaltonSupabase\.rpc\('registration_lookup'/,
    'register.html must call the registration_lookup function');
  assert.match(page, /dupeAcknowledged/,
    'a duplicate warns once and lets the second submit proceed');
  assert.match(page, /lookup is best-effort/,
    'a failed lookup (function missing, network) must not stop the form');
});

test('registration_lookup exposes only a yes/no and the earliest date', () => {
  const fn = schema.match(/create or replace function public\.registration_lookup\(p_vin text\)[\s\S]*?\$\$;/);
  assert.ok(fn, 'schema.sql must define public.registration_lookup(p_vin text)');
  const body = fn[0];
  assert.match(body, /returns table\(registered boolean, registered_on date\)/,
    'the function may return only registered + registered_on');
  assert.match(body, /security definer/, 'it reads a table anon cannot select, so it must be security definer');
  assert.match(body, /set search_path = public/, 'security definer functions must pin search_path');
  assert.match(body, /min\(r\.created_at\)/, 'the date returned is the EARLIEST registration for the VIN');
  assert.match(body, /length\(trim\(coalesce\(p_vin, ''\)\)\) = 17/, 'only a full 17-character VIN is answered');
  assert.doesNotMatch(body, /first_name|last_name|email|phone|address/,
    'the function must not touch personal columns');
});

test('anon may execute the lookup but still cannot read the registrations table', () => {
  assert.match(schema, /grant execute on function public\.registration_lookup\(text\) to anon/,
    'anon needs execute on the lookup');
  assert.match(schema, /revoke all on function public\.registration_lookup\(text\) from public/,
    'public default execute must be revoked first');
  assert.doesNotMatch(schema, /grant select[^;]*trailer_registrations[^;]*to anon/i,
    'anon must never get select on trailer_registrations');
  assert.match(helper, /rpc: rpc/, 'walton-supabase.js must expose the rpc helper');
});
