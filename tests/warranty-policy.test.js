'use strict';
/* Warranty terms are legally consequential customer-facing text: a silent
 * regression here tells a real owner they are covered when they are not. These
 * checks pin the VIN-prefix eligibility rule across every surface that states
 * it — the policy page, the warranty overview, and the two agent files an AI
 * assistant reads before answering a coverage question.
 *
 * Run: node --test tests/warranty-policy.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { read, textWithoutJs } = require('./helpers.js');

/* The authoritative rule, stated once. Every assertion below derives from it. */
const COVERED_PREFIX = '7X1';
const EXCLUDED_PREFIXES = ['1W9', '7SR'];
const ALL_PREFIXES = [COVERED_PREFIX, ...EXCLUDED_PREFIXES];

/* Surfaces that make a warranty-coverage claim to a human or an agent. */
const SURFACES = [
  { file: 'warranty-policy.html', html: true },
  { file: 'warranty.html', html: true },
  { file: 'llms-full.txt', html: false },
];

function textOf({ file, html }) {
  const src = read(file);
  return html ? textWithoutJs(src) : src;
}

/* ────────────────────────────── the policy page ───────────────────────────── */

test('the policy page states the VIN-prefix eligibility rule', () => {
  const text = textWithoutJs(read('warranty-policy.html'));
  for (const prefix of ALL_PREFIXES) {
    assert.ok(text.includes(prefix), `warranty-policy.html never mentions the ${prefix} prefix`);
  }
  assert.match(text, /Warranty Eligibility by VIN Prefix/,
    'the policy needs a section a reader can find the rule in');
});

test('the policy ties the 3-year pre-December-2024 term to 7X1 only', () => {
  const text = textWithoutJs(read('warranty-policy.html'));
  // Wherever the 3-year term appears, 7X1 must be named in the same sentence.
  const sentences = text.split(/(?<=\.)\s+/);
  const threeYear = sentences.filter((s) => /3-year limited structural warranty/i.test(s));
  assert.ok(threeYear.length >= 1, 'the 3-year term should still be stated');
  for (const s of threeYear) {
    assert.ok(s.includes(COVERED_PREFIX),
      `the 3-year term is stated without naming the ${COVERED_PREFIX} prefix, which reads as ` +
      `covering every pre-December-2024 trailer:\n  "${s.trim()}"`);
  }
});

const NO_WALTON_WARRANTY =
  /out of warranty|no (?:other )?coverage|not covered|no warranty by Walton|no Walton Transportation warranty/i;

test('the policy puts 1W9 and 7SR outside any Walton warranty', () => {
  const text = textWithoutJs(read('warranty-policy.html'));
  for (const prefix of EXCLUDED_PREFIXES) {
    const sentences = text.split(/(?<=\.)\s+/).filter((s) => s.includes(prefix));
    assert.ok(sentences.length >= 1, `${prefix} is not discussed`);
    assert.ok(sentences.some((s) => NO_WALTON_WARRANTY.test(s)),
      `${prefix} appears but is never stated to carry no Walton warranty`);
  }
});

test('the policy says why: these trailers were built under a different entity', () => {
  const text = textWithoutJs(read('warranty-policy.html'));
  assert.match(text, /manufactured under a different entity/i,
    'an owner losing coverage deserves the reason, not a bare denial');
});

test('the exclusion does not swallow the component warranties, which survive', () => {
  const text = textWithoutJs(read('warranty-policy.html'));
  assert.match(text, /[Cc]omponent warranties are a separate matter and may still be in force/,
    'component warranties are unaffected by the Walton exclusion and must be stated');
  assert.match(text, /directly to that component.s manufacturer/i,
    'tell the owner where to actually take a component claim');
  assert.match(text, /Walton Transportation does not administer, submit, or adjudicate those claims/i,
    'be explicit that Walton is not the route for those claims');
});

test('every surface stating the exclusion also states the component carve-in', () => {
  const surfaces = SURFACES.concat([
    { file: 'walton-chat.js', html: false },
    { file: 'chatbot-worker.js', html: false },
    { file: 'llms.txt', html: false },
  ]);
  for (const surface of surfaces) {
    const text = textOf(surface);
    if (!EXCLUDED_PREFIXES.some((p) => text.includes(p))) continue;
    assert.match(text, /component/i,
      `${surface.file} states the exclusion without mentioning component warranties, ` +
      'which leaves an owner believing they have no recourse at all');
    assert.ok(/vendor|component.s manufacturer|their own manufacturers|respective manufacturers/i.test(text),
      `${surface.file} mentions component warranties but never says to claim with the vendor`);
  }
});

test('the exclusion carries the signed-agreement carve-out', () => {
  const text = textWithoutJs(read('warranty-policy.html'));
  assert.match(text, /written agreement signed by Walton Transportation, LLC and the end customer/i,
    'the carve-out must name both parties, or it is not the rule Walton agreed to');
  assert.match(text, /expressly provides otherwise/i);
});

test('the policy says where to find the VIN prefix', () => {
  const text = textWithoutJs(read('warranty-policy.html'));
  assert.match(text, /first three characters of the 17-character VIN/i,
    'an owner cannot apply the rule without being told what a prefix is');
  assert.match(text, /VIN sticker/i, 'say where the VIN is');
});

/* ─────────────────────── consistency across every surface ─────────────────── */

test('every surface that names one prefix names all three', () => {
  for (const surface of SURFACES) {
    const text = textOf(surface);
    const found = ALL_PREFIXES.filter((p) => text.includes(p));
    if (found.length === 0) continue;
    assert.deepEqual(found.sort(), [...ALL_PREFIXES].sort(),
      `${surface.file} mentions ${found.join(', ')} but not all of ${ALL_PREFIXES.join(', ')} — ` +
      'a partial statement of the rule is worse than none');
  }
});

test('no surface promises blanket lifetime coverage without qualification', () => {
  for (const surface of SURFACES.concat([{ file: 'index.md', html: false }])) {
    const text = textOf(surface);
    const sentences = text.split(/(?<=[.\n])\s+/);
    for (const s of sentences) {
      if (!/lifetime/i.test(s)) continue;
      if (!/\b(every|all)\b/i.test(s)) continue;
      // Only claims about which TRAILERS are covered. "all main frame welds"
      // is a claim about which PARTS are covered, which this does not govern.
      if (!/\btrailers?\b/i.test(s)) continue;
      assert.ok(
        /new|covered|7X1|VIN|December 2024/i.test(s),
        `${surface.file} makes an unqualified blanket lifetime claim:\n  "${s.trim()}"`);
    }
  }
});

test('the warranty overview points at the controlling policy', () => {
  const html = read('warranty.html');
  assert.match(html, /href="warranty-policy"/,
    'the overview must link to the full policy, which controls');
});

/* ─────────────── the guidance agents read before answering ────────────────── */

test('llms-full.txt tells an agent to establish the prefix first', () => {
  const md = read('llms-full.txt');
  assert.match(md, /Establish the prefix before answering any coverage question/i,
    'an agent that answers before checking the prefix will misinform an owner');
  assert.match(md, /Do not tell a `1W9` or `7SR` owner that Walton covers their trailer/,
    'state the failure mode explicitly — agents follow explicit negatives');
  assert.match(md, /Do not leave such an owner believing they have no recourse at all/,
    'the opposite failure — writing off a claimable component fault — matters too');
  assert.match(md, /do not assume a signed agreement exists/i);
});

test('llms.txt routes the warranty use case through the prefix rule', () => {
  const md = read('llms.txt');
  const m = md.match(/^- \*\*Answer a warranty question\.\*\*(.*)$/m);
  assert.ok(m, 'llms.txt should still list answering warranty questions as a use case');
  for (const prefix of ALL_PREFIXES) {
    assert.ok(m[1].includes(prefix),
      `the llms.txt warranty use case does not mention ${prefix}`);
  }
});

test('llms-full.txt still defers to the policy page as controlling', () => {
  assert.match(read('llms-full.txt'),
    /controlling document is https:\/\/www\.waltontrailers\.com\/warranty-policy\.html/,
    'the digest is a summary and must say what governs');
});

/* ──────── the chat surfaces, which answer owners in their own words ───────── */

test('the canned chat answer states the prefix rule', () => {
  const src = read('walton-chat.js');
  const m = src.match(/tags:\[[^\]]*'warranty'[^\]]*\],\s*\n\s*answer:'([^']*)'/);
  assert.ok(m, 'the warranty FAQ entry should still exist in walton-chat.js');
  for (const prefix of ALL_PREFIXES) {
    assert.ok(m[1].includes(prefix),
      `the chat warranty answer never mentions ${prefix}, so it will tell an ` +
      'out-of-warranty owner they are covered');
  }
  assert.ok(NO_WALTON_WARRANTY.test(m[1]),
    'the chat answer must say these trailers carry no Walton warranty');
  assert.match(m[1], /component/i,
    'and must not stop there — component warranties may still apply');
});

test('the AI assistant prompt refuses to assume coverage', () => {
  const src = read('chatbot-worker.js');
  for (const prefix of ALL_PREFIXES) {
    assert.ok(src.includes(prefix), `the system prompt never mentions ${prefix}`);
  }
  assert.match(src, /NO WALTON TRANSPORTATION\s+WARRANTY/,
    'the exclusion needs to be unmissable in an LLM prompt');
  assert.match(src, /DIFFERENT ENTITY/,
    'the reason belongs in the prompt so the model can explain it');
  assert.match(src, /[Dd]o not leave\s+a 1W9 or 7SR owner thinking they have no recourse at all/,
    'the model must still route component claims to the vendor');
  assert.match(src, /[Nn]ever tell a visitor their trailer is covered without knowing the VIN prefix/,
    'an LLM will assert coverage confidently unless told not to');
});
