'use strict';
/* Shared helpers for the agent-readiness suite.
   Zero dependencies on purpose: this repo is static HTML with no build step and
   no package.json, so `node tests/<file>.test.js` has to work on a bare
   checkout. See tests/README.md. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://www.waltontrailers.com';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/* Decode the handful of named entities the site actually uses, plus numeric
   refs. Enough to compare heading and link text; not a general HTML parser. */
function decodeEntities(s) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
    ldquo: '“', rdquo: '”', bull: '•', rarr: '→',
    copy: '©', hellip: '…',
  };
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in named ? named[n.toLowerCase()] : m));
}

/* Text a crawler sees with JavaScript disabled: markup, <script>, <style> and
   comments removed. Deliberately keeps <noscript> content, which such a client
   would render. */
function textWithoutJs(htmlSrc) {
  let body = htmlSrc.includes('<body') ? htmlSrc.slice(htmlSrc.indexOf('<body')) : htmlSrc;
  body = body
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(body).replace(/\s+/g, ' ').trim();
}

/* Heading outline in document order, excluding anything inside <script>,
   <style> or an HTML comment (so a code sample in a comment can't masquerade
   as a heading). */
function headings(htmlSrc) {
  const cleaned = htmlSrc
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const out = [];
  const re = /<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    out.push({
      level: Number(m[1]),
      attrs: m[2],
      text: decodeEntities(m[3].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

/* Every JSON-LD block on the page, parsed. Throws with the offending source if
   a block is not valid JSON — a silently malformed block is the exact failure
   this suite exists to catch. */
function jsonLdBlocks(htmlSrc) {
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const out = [];
  let m;
  while ((m = re.exec(htmlSrc)) !== null) {
    try {
      out.push(JSON.parse(m[1]));
    } catch (err) {
      throw new Error('JSON-LD block is not valid JSON: ' + err.message + '\n' + m[1].slice(0, 400));
    }
  }
  return out;
}

/* Markdown link targets: [text](url) */
function markdownLinks(md) {
  const out = [];
  const re = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(md)) !== null) out.push({ text: m[1], url: m[2] });
  return out;
}

/* Map a public site URL or path onto the file that serves it, honouring the
   cleanUrls behaviour configured in vercel.json. Returns null for offsite URLs
   and for fragment-only links. */
function resolveToFile(url) {
  let p = url;
  if (p.startsWith(SITE_ORIGIN)) p = p.slice(SITE_ORIGIN.length);
  else if (/^https?:\/\//i.test(p)) return null; // offsite
  p = p.split('#')[0].split('?')[0];
  if (p === '' || p === '/') return 'index.html';
  if (p.startsWith('/')) p = p.slice(1);
  if (p === '') return 'index.html';
  if (exists(p)) return p;
  if (exists(p + '.html')) return p + '.html'; // cleanUrls
  return null;
}

module.exports = {
  ROOT, SITE_ORIGIN,
  read, exists, decodeEntities, textWithoutJs, headings,
  jsonLdBlocks, markdownLinks, resolveToFile,
};
