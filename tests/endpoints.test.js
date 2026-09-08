'use strict';
/* End-to-end checks over real HTTP, against the routes vercel.json compiles to.
 *
 * Requires @vercel/routing-utils, which is intentionally NOT a dependency of
 * this repo: adding a package.json to the project root would make Vercel treat
 * this static site as a Node build. CI installs it with `npm install --no-save`
 * (see .github/workflows/agent-readiness.yml). Without it, this file skips.
 *
 * Run: npm install --no-save @vercel/routing-utils && node tests/endpoints.test.js
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { loadRoutes, createServer } = require('./vercel-emulator.js');

let routes = null;
try {
  routes = loadRoutes();
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}

const skip = routes === null
  ? '@vercel/routing-utils is not installed (npm install --no-save @vercel/routing-utils)'
  : false;

let server, origin;

before(async () => {
  if (skip) return;
  server = createServer(routes);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => { if (server) server.close(); });

/* fetch without following redirects, so the negotiation hop is observable. */
function get(pathname, headers = {}) {
  return fetch(origin + pathname, { headers, redirect: 'manual' });
}

test('a nonexistent path returns a real 404, not a 200 shell', { skip }, async () => {
  const res = await get('/some-path-that-does-not-exist');
  assert.equal(res.status, 404,
    'nonexistent paths must 404, or agents conclude every path exists');
  const body = await res.text();
  assert.ok(body.length > 200, 'the 404 body should not be empty');
});

test('the 404 body tells an agent where to look next', { skip }, async () => {
  const body = await (await get('/nope/not/here')).text();
  for (const target of ['/llms.txt', '/llms-full.txt', '/sitemap.xml']) {
    assert.ok(body.includes(target), `404 body should name ${target}`);
  }
  assert.match(body, /# 404 — Page Not Found/,
    'the 404 body should carry a markdown recovery block');
});

test('a deep nonexistent path under a real folder still 404s', { skip }, async () => {
  const res = await get('/Gooseneck/does-not-exist');
  assert.equal(res.status, 404);
});

test('the homepage serves HTML to a browser', { skip }, async () => {
  const res = await get('/', {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  });
  assert.equal(res.status, 200, 'a browser must not be redirected');
  assert.match(res.headers.get('content-type'), /^text\/html/);
});

test('the homepage negotiates markdown for Accept: text/markdown', { skip }, async () => {
  const first = await get('/', { accept: 'text/markdown' });
  assert.equal(first.status, 307, 'expected a temporary negotiation redirect');
  assert.equal(first.headers.get('location'), '/index.md');

  const res = await fetch(origin + '/', { headers: { accept: 'text/markdown' } }); // follows
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/markdown/,
    'Accept: text/markdown must not come back as text/html');
  assert.match(res.headers.get('vary') || '', /\bAccept\b/,
    'the markdown response must carry Vary: Accept');
  const body = await res.text();
  assert.match(body, /^# Walton Trailers/, 'the markdown body should be the homepage');
});

test('a q-weighted markdown Accept is honoured too', { skip }, async () => {
  const res = await get('/', { accept: 'text/markdown;q=1.0, text/html;q=0.8' });
  assert.equal(res.status, 307);
  assert.equal(res.headers.get('location'), '/index.md');
});

test('the homepage response carries Vary: Accept and advertises its alternate', { skip }, async () => {
  const res = await get('/', { accept: 'text/html' });
  const vary = res.headers.get('vary') || '';
  assert.match(vary, /\bAccept\b/, 'without Vary: Accept a CDN can cross-serve the variants');
  assert.match(vary, /\bAccept-Encoding\b/);
  assert.match(res.headers.get('link') || '', /rel="alternate".*type="text\/markdown"/);
});

test('/index.md is fetchable directly as markdown', { skip }, async () => {
  const res = await get('/index.md');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/markdown/);
  assert.match(res.headers.get('vary') || '', /\bAccept\b/);
});

test('/404.md is fetchable directly as markdown', { skip }, async () => {
  const res = await get('/404.md');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/markdown/);
});

test('the machine-readable files are all reachable', { skip }, async () => {
  for (const [p, type] of [
    ['/llms.txt', /^text\/plain/],
    ['/llms-full.txt', /^text\/plain/],
    ['/sitemap.xml', /xml/],
    ['/robots.txt', /^text\/plain/],
  ]) {
    const res = await get(p);
    assert.equal(res.status, 200, `${p} should be reachable`);
    assert.match(res.headers.get('content-type'), type, `${p} content type`);
    assert.ok((await res.text()).length > 100, `${p} looks empty`);
  }
});

test('security headers still apply to every response', { skip }, async () => {
  for (const p of ['/', '/index.md', '/llms.txt']) {
    const res = await get(p, { accept: 'text/html' });
    assert.equal(res.headers.get('x-frame-options'), 'DENY', `${p} lost X-Frame-Options`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', `${p} lost nosniff`);
    assert.ok(res.headers.get('content-security-policy'), `${p} lost its CSP`);
  }
});

test('existing legacy redirects are untouched by the new rules', { skip }, async () => {
  const cases = [
    ['/locate-a-dealer/utah', '/find-a-dealer.html'],
    ['/about-us/history', '/about.html'],
    ['/gooseneck/fbx212', '/Gooseneck/gooseneck.html'],
    ['/wp-login.php', '/'],
  ];
  for (const [from, to] of cases) {
    const res = await get(from);
    assert.equal(res.status, 308, `${from} should still redirect`);
    assert.equal(res.headers.get('location'), to, `${from} should still land on ${to}`);
  }
});

test('cleanUrls still serves the extensionless page URLs the nav links to', { skip }, async () => {
  for (const p of ['/about', '/find-a-dealer', '/warranty', '/Gooseneck/fbx212']) {
    const res = await get(p, { accept: 'text/html' });
    assert.equal(res.status, 200, `${p} should serve a page`);
    assert.match(res.headers.get('content-type'), /^text\/html/);
  }
});

test('markdown negotiation does not hijack pages that have no markdown twin', { skip }, async () => {
  const res = await get('/about', { accept: 'text/markdown' });
  assert.equal(res.status, 200,
    'only the homepage negotiates today; other pages must serve normally, not redirect into a dead end');
});
