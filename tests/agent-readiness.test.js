'use strict';
/* Agent-readiness regression suite.
 *
 * Covers the five behaviours added for AI-agent consumers of waltontrailers.com:
 *   1. a real 404 that tells an agent where to go next
 *   2. a homepage whose content and heading outline survive with JavaScript off
 *   3. markdown content negotiation, with Vary: Accept so caches stay honest
 *   4. JSON-LD identity on the homepage
 *   5. llms.txt carrying explicit when-to-use guidance
 *
 * Run: node tests/agent-readiness.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const {
  ROOT, SITE_ORIGIN, read, exists, textWithoutJs, headings,
  jsonLdBlocks, markdownLinks, resolveToFile,
} = require('./helpers.js');

/* The 15 active models, as published by the compare tool. That module is the
   site's own source of truth for specs, so every other surface is checked
   against it rather than against a copy maintained here. */
function compareData() {
  const src = read('walton-compare.js');
  const start = src.indexOf('var compareData = {');
  assert.notEqual(start, -1, 'compareData not found in walton-compare.js');
  const open = src.indexOf('{', start);
  let depth = 0, end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  assert.notEqual(end, -1, 'compareData object is unbalanced');
  // The literal is plain data (no expressions); evaluating it is safe and
  // avoids hand-maintaining a second copy of the spec table in this suite.
  return new Function('return (' + src.slice(open, end + 1) + ');')();
}

/* ────────────────────────── 1. agent-friendly 404 ────────────────────────── */

test('404.html exists and is the file Vercel serves for unmatched paths', () => {
  assert.ok(exists('404.html'), '404.html must sit at the project root');
  const html = read('404.html');
  assert.match(html, /<title>[^<]*404[^<]*<\/title>/i, 'title should name the 404');
  assert.match(html, /<meta\s+name="robots"\s+content="noindex/i,
    'a 404 must not be indexable');
});

test('404 page points agents at every recovery surface', () => {
  const html = read('404.html');
  for (const target of ['/llms.txt', '/llms-full.txt', '/sitemap.xml', '/404.md']) {
    assert.ok(html.includes(target), `404 page should link to ${target}`);
  }
  assert.match(html, /href="\/"/, '404 page should link home');
  assert.match(html, /href="\/find-a-dealer\.html"/, '404 page should link to dealer search');
});

test('404.md is a usable markdown recovery body', () => {
  assert.ok(exists('404.md'), '404.md must exist');
  const md = read('404.md');
  assert.match(md, /^# .+/m, '404.md needs an H1');
  assert.ok(md.length > 500, `404.md is only ${md.length} chars; agents need real guidance`);
  const urls = markdownLinks(md).map((l) => l.url);
  for (const required of [`${SITE_ORIGIN}/llms.txt`, `${SITE_ORIGIN}/sitemap.xml`, `${SITE_ORIGIN}/`]) {
    assert.ok(urls.includes(required), `404.md should link to ${required}`);
  }
});

test('the markdown embedded in 404.html matches 404.md exactly', () => {
  const html = read('404.html');
  const m = html.match(/<script[^>]*type="text\/markdown"[^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(m, '404.html should carry its recovery body as an inert text/markdown block');
  assert.equal(m[1].trim(), read('404.md').trim(),
    'the embedded block has drifted from 404.md — update both');
});

test('404 recovery links all resolve to real files', () => {
  for (const { url } of markdownLinks(read('404.md'))) {
    if (!url.startsWith(SITE_ORIGIN)) continue;
    const file = resolveToFile(url);
    assert.ok(file, `404.md links to ${url}, which does not resolve to a file in this repo`);
  }
});

/* ─────────────────── 2. homepage content without JavaScript ───────────────── */

test('homepage carries substantial text with JavaScript disabled', () => {
  const text = textWithoutJs(read('index.html'));
  assert.ok(text.length >= 500,
    `homepage exposes only ${text.length} chars of no-JS text; needs 500+`);
});

test('homepage has exactly one H1', () => {
  const h1s = headings(read('index.html')).filter((h) => h.level === 1);
  assert.equal(h1s.length, 1, `expected 1 H1, found ${h1s.length}: ${h1s.map((h) => h.text)}`);
});

test('homepage heading outline is nested, not flat, and skips no levels', () => {
  const hs = headings(read('index.html'));
  assert.ok(hs.length >= 8, `only ${hs.length} headings; the outline is still flat`);
  assert.equal(hs[0].level, 1, 'the first heading should be the H1');

  const levels = new Set(hs.map((h) => h.level));
  assert.ok(levels.has(2) && levels.has(3),
    'a nested outline needs H2s and H3s, not just an H1');

  let prev = hs[0].level;
  for (const h of hs.slice(1)) {
    assert.ok(h.level <= prev + 1,
      `heading level jumps from H${prev} to H${h.level} at "${h.text}" — that is a skipped level`);
    prev = h.level;
  }
});

test('every trailer series in the carousel is a real heading', () => {
  const hs = headings(read('index.html'));
  const cards = hs.filter((h) => /product-card-name/.test(h.attrs));
  assert.equal(cards.length, 5, `expected 5 product-card headings, found ${cards.length}`);
  for (const c of cards) assert.equal(c.level, 3, `${c.text} should be an H3`);
});

test('visually-hidden section headings are backed by the .sr-only rule', () => {
  const html = read('index.html');
  const srOnly = headings(html).filter((h) => /sr-only/.test(h.attrs));
  assert.ok(srOnly.length >= 3,
    'sections without a visible heading should still be named for screen readers and crawlers');
  assert.match(html, /\.sr-only\s*\{[^}]*clip:\s*rect\(0, 0, 0, 0\)/,
    '.sr-only must actually hide its content off-screen');
  for (const h of srOnly) {
    assert.ok(h.text.length > 0, 'an sr-only heading must not be empty');
  }
});

/* ─────────────────────── 3. markdown content negotiation ──────────────────── */

function vercelConfig() {
  return JSON.parse(read('vercel.json'));
}

test('vercel.json is valid JSON and keeps its existing security headers', () => {
  const cfg = vercelConfig();
  const global = cfg.headers.find((h) => h.source === '/(.*)');
  assert.ok(global, 'the site-wide header rule must survive');
  const keys = global.headers.map((h) => h.key);
  for (const required of [
    'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy',
    'Permissions-Policy', 'Strict-Transport-Security', 'Content-Security-Policy',
  ]) {
    assert.ok(keys.includes(required), `${required} was dropped from the global header rule`);
  }
});

test('a text/markdown request for the homepage is negotiated to /index.md', () => {
  const cfg = vercelConfig();
  const rule = cfg.redirects.find(
    (r) => r.source === '/' && Array.isArray(r.has) &&
      r.has.some((h) => h.type === 'header' && h.key.toLowerCase() === 'accept' &&
        /text\/markdown/.test(h.value)));
  assert.ok(rule, 'no Accept: text/markdown negotiation rule for the homepage');
  assert.equal(rule.destination, '/index.md');
  assert.equal(rule.permanent, false,
    'negotiation is per-request, so it must not be a permanent redirect');
  assert.ok(exists('index.md'), 'the negotiation target /index.md does not exist');
});

test('the negotiation rule matches agent Accept headers and no browser Accept header', () => {
  const cfg = vercelConfig();
  const rule = cfg.redirects.find((r) => r.source === '/' && Array.isArray(r.has));
  const re = new RegExp(rule.has[0].value);

  const agentAccepts = [
    'text/markdown',
    'text/markdown, text/plain',
    'text/markdown;q=1.0, text/html;q=0.9',
    'text/html;q=0.9, text/markdown',
  ];
  for (const a of agentAccepts) {
    assert.ok(re.test(a), `should negotiate markdown for Accept: ${a}`);
  }

  const browserAccepts = [
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    '*/*',
    'text/css,*/*;q=0.1',
    'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  ];
  for (const a of browserAccepts) {
    assert.ok(!re.test(a), `must NOT redirect a browser sending Accept: ${a}`);
  }
});

test('markdown responses declare Vary: Accept so caches keep the variants apart', () => {
  const cfg = vercelConfig();

  const mdRule = cfg.headers.find((h) => /\.md/.test(h.source));
  assert.ok(mdRule, 'no header rule covers .md responses');
  const mdHeaders = Object.fromEntries(mdRule.headers.map((h) => [h.key.toLowerCase(), h.value]));
  assert.match(mdHeaders['content-type'] || '', /^text\/markdown\b/,
    '.md must be served as text/markdown');
  assert.match(mdHeaders['vary'] || '', /\bAccept\b/,
    '.md responses must Vary on Accept');

  const homeRule = cfg.headers.find((h) => h.source === '/');
  assert.ok(homeRule, 'no header rule covers the homepage');
  const homeHeaders = Object.fromEntries(homeRule.headers.map((h) => [h.key.toLowerCase(), h.value]));
  assert.match(homeHeaders['vary'] || '', /\bAccept\b/,
    'the homepage negotiates markdown, so it must Vary on Accept');
  assert.match(homeHeaders['vary'] || '', /\bAccept-Encoding\b/,
    'Vary must keep Accept-Encoding alongside Accept');
  assert.match(homeHeaders['link'] || '', /rel="alternate".*type="text\/markdown"/,
    'the homepage should advertise its markdown twin via a Link header');
});

test('Vary: Accept is not applied site-wide, which would fragment the asset cache', () => {
  const cfg = vercelConfig();
  const global = cfg.headers.find((h) => h.source === '/(.*)');
  const vary = global.headers.find((h) => h.key.toLowerCase() === 'vary');
  assert.ok(!vary || !/\bAccept\b(?!-)/.test(vary.value),
    'Vary: Accept on /(.*) would key the CDN cache on Accept for images too');
});

test('the homepage advertises its markdown alternate in the document head', () => {
  const html = read('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /<link\s+rel="alternate"\s+type="text\/markdown"\s+href="\/index\.md"/,
    'homepage head should carry <link rel="alternate" type="text/markdown">');
});

test('index.md is a faithful, self-contained markdown twin of the homepage', () => {
  const md = read('index.md');
  assert.match(md, /^# .+/m, 'index.md needs an H1');
  assert.ok(md.length > 1500, `index.md is only ${md.length} chars`);
  assert.ok(/^## /m.test(md), 'index.md needs section headings');

  // The five series shown on the homepage must all appear.
  for (const series of ['Gooseneck', 'Dump', 'Tilt', 'Deckover', 'Landscape']) {
    assert.ok(md.includes(series), `index.md omits the ${series} series`);
  }
  for (const { url } of markdownLinks(md)) {
    if (!url.startsWith(SITE_ORIGIN)) continue;
    assert.ok(resolveToFile(url), `index.md links to ${url}, which resolves to no file`);
  }
});

/* ───────────────────────── 4. JSON-LD structured data ─────────────────────── */

test('homepage carries parseable JSON-LD', () => {
  const blocks = jsonLdBlocks(read('index.html'));
  assert.ok(blocks.length >= 1, 'no JSON-LD block on the homepage');
  for (const b of blocks) {
    assert.equal(b['@context'], 'https://schema.org', 'JSON-LD needs the schema.org context');
  }
});

function graphNodes() {
  const blocks = jsonLdBlocks(read('index.html'));
  return blocks.flatMap((b) => (Array.isArray(b['@graph']) ? b['@graph'] : [b]));
}

test('JSON-LD identifies Walton Trailers as an Organization with the required fields', () => {
  const org = graphNodes().find((n) => n['@type'] === 'Organization');
  assert.ok(org, 'no Organization node — an agent cannot resolve the site identity');
  assert.equal(org.name, 'Walton Trailers');
  assert.equal(org.url, `${SITE_ORIGIN}/`);
  assert.ok(org.description && org.description.length > 80, 'Organization needs a real description');
  assert.equal(org.foundingDate, '1973');
  assert.ok(org.logo && org.logo.url, 'Organization needs a logo');
  assert.ok(Array.isArray(org.sameAs) && org.sameAs.length >= 3,
    'sameAs should list the social profiles an agent can cross-reference');
  assert.equal(org.address.postalCode, '84341');
  assert.equal(org.address.addressLocality, 'Logan');
  assert.equal(org.address.addressRegion, 'UT');
});

test('JSON-LD asserts nothing Walton does not actually publish', () => {
  const json = JSON.stringify(graphNodes());
  assert.ok(!/"telephone"/.test(json),
    'the phone number in the page copy is still a placeholder — do not publish it as structured data');
  assert.ok(!/"price"|"aggregateRating"|"priceRange"/.test(json),
    'Walton publishes no prices or ratings; structured data must not invent them');
});

test('JSON-LD logo and image URLs point at files that exist', () => {
  const json = JSON.stringify(graphNodes());
  const urls = json.match(new RegExp(`${SITE_ORIGIN}/[^"]+\\.(?:png|jpe?g|svg|webp)`, 'g')) || [];
  assert.ok(urls.length >= 1, 'expected at least one image URL in the JSON-LD');
  for (const u of urls) {
    const rel = decodeURIComponent(u.slice(SITE_ORIGIN.length + 1));
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `JSON-LD references ${u}, which is not in this repo`);
  }
});

test('JSON-LD declares the WebSite and links it to the Organization', () => {
  const nodes = graphNodes();
  const site = nodes.find((n) => n['@type'] === 'WebSite');
  assert.ok(site, 'no WebSite node');
  assert.equal(site.url, `${SITE_ORIGIN}/`);
  const org = nodes.find((n) => n['@type'] === 'Organization');
  assert.equal(site.publisher['@id'], org['@id'], 'WebSite.publisher should reference the Organization');
});

test('every trailer series in the offer catalog links to a page that exists', () => {
  const org = graphNodes().find((n) => n['@type'] === 'Organization');
  const items = org.hasOfferCatalog.itemListElement;
  assert.equal(items.length, 5, 'the lineup has five series');
  for (const item of items) {
    assert.ok(resolveToFile(item.url), `offer catalog links to ${item.url}, which resolves to no file`);
  }
});

/* ──────────────────── 5. llms.txt and when-to-use guidance ────────────────── */

test('llms.txt follows the llmstxt.org shape', () => {
  assert.ok(exists('llms.txt'), 'llms.txt must exist at the site root');
  const lines = read('llms.txt').split('\n');
  assert.match(lines[0], /^# \S/, 'llms.txt must open with an H1 naming the site');
  const summary = lines.slice(1, 6).find((l) => l.startsWith('> '));
  assert.ok(summary, 'llms.txt needs a blockquote summary right after the H1');
  assert.ok(summary.length > 100, 'the summary should actually describe the site');
  assert.ok(/^## /m.test(read('llms.txt')), 'llms.txt needs H2 sections');
});

test('llms.txt tells an agent when to reach for this site', () => {
  const md = read('llms.txt');
  const m = md.match(/^## When to use this site\s*$([\s\S]*?)(?=^## |\Z)/m);
  assert.ok(m, 'llms.txt is missing a "When to use this site" section');
  const section = m[1];
  assert.ok(section.length > 400,
    'when-to-use guidance must be specific about jobs, not a one-liner');
  const bullets = section.split('\n').filter((l) => /^\s*-\s/.test(l));
  assert.ok(bullets.length >= 5,
    `only ${bullets.length} named use cases; agents need concrete jobs to match against`);
});

test('llms.txt is explicit about what this site cannot answer', () => {
  const md = read('llms.txt');
  assert.match(md, /^## When not to use this site\s*$/m,
    'agents need the negative cases as much as the positive ones');
  assert.match(md, /prices?|pricing/i, 'llms.txt should say that pricing is not published here');
});

test('llms.txt documents how an agent should call the site', () => {
  const md = read('llms.txt');
  const m = md.match(/^## How an agent should call this site\s*$([\s\S]*?)(?=^## |\Z)/m);
  assert.ok(m, 'llms.txt is missing calling instructions');
  const section = m[1];
  assert.match(section, /Accept: text\/markdown/, 'should document markdown content negotiation');
  assert.match(section, /Vary: Accept/, 'should document the Vary contract');
  assert.match(section, /404/, 'should tell agents what a 404 means here');
  assert.match(section, /sitemap\.xml/, 'should point at the sitemap');
});

test('every link in llms.txt resolves to a real file', () => {
  for (const { url, text } of markdownLinks(read('llms.txt'))) {
    if (!url.startsWith(SITE_ORIGIN)) continue;
    assert.ok(resolveToFile(url), `llms.txt links "${text}" to ${url}, which resolves to no file`);
  }
});

test('llms-full.txt exists and is the single-fetch digest llms.txt promises', () => {
  assert.ok(exists('llms-full.txt'), 'llms.txt advertises llms-full.txt, so it must exist');
  const md = read('llms-full.txt');
  assert.ok(md.length > 4000, `llms-full.txt is only ${md.length} chars`);
  assert.match(md, /^# .+/m, 'llms-full.txt needs an H1');
  for (const { url } of markdownLinks(md)) {
    if (!url.startsWith(SITE_ORIGIN)) continue;
    assert.ok(resolveToFile(url), `llms-full.txt links to ${url}, which resolves to no file`);
  }
});

/* ───────────────── cross-surface consistency (drift protection) ───────────── */

test('llms.txt and llms-full.txt list exactly the models the site publishes', () => {
  const models = Object.keys(compareData()).map((k) => k.toUpperCase()).sort();
  assert.equal(models.length, 15, 'the compare tool should carry 15 active models');

  for (const [file, src] of [['llms.txt', read('llms.txt')], ['llms-full.txt', read('llms-full.txt')]]) {
    const found = [...new Set(src.match(/\b(?:DHV|TMX|TSX|BDE|FBH|FBX|MPR)\d{3}\b/g) || [])].sort();
    assert.deepEqual(found, models,
      `${file} is out of sync with walton-compare.js.\n  in ${file}: ${found}\n  in site: ${models}`);
  }
});

test('published GVWR figures match the site model data', () => {
  const data = compareData();
  const full = read('llms-full.txt');
  for (const [key, row] of Object.entries(data)) {
    const code = key.toUpperCase();
    const line = full.split('\n').find((l) => l.includes('| ' + code + ' '));
    assert.ok(line, `llms-full.txt has no spec row for ${code}`);
    assert.ok(line.includes(row.gvwr),
      `${code}: llms-full.txt says "${line.trim()}" but the site data says GVWR ${row.gvwr}`);
    assert.ok(line.includes(row.axles),
      `${code}: axle count in llms-full.txt disagrees with the site data (${row.axles})`);
  }
});

test('every model page referenced by the agent files exists on disk', () => {
  for (const row of Object.values(compareData())) {
    assert.ok(exists(row.url), `walton-compare.js points at ${row.url}, which is missing`);
  }
});

test('the agent files are not blocked from crawlers by robots.txt', () => {
  const robots = read('robots.txt');
  const disallowed = robots.split('\n')
    .filter((l) => /^Disallow:/i.test(l))
    .map((l) => l.replace(/^Disallow:\s*/i, '').trim())
    .filter(Boolean);
  for (const file of ['/llms.txt', '/llms-full.txt', '/index.md', '/404.md', '/404.html']) {
    for (const rule of disallowed) {
      assert.ok(!file.startsWith(rule), `robots.txt blocks ${file} via "Disallow: ${rule}"`);
    }
  }
  assert.match(robots, /Sitemap:\s*https:\/\/www\.waltontrailers\.com\/sitemap\.xml/,
    'robots.txt should keep advertising the sitemap');
});

test('sitemap URLs all resolve to files in this repo', () => {
  const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 10, 'sitemap looks truncated');
  for (const loc of locs) {
    assert.ok(resolveToFile(loc), `sitemap lists ${loc}, which resolves to no file`);
  }
});
