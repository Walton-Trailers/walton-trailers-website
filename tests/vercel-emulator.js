'use strict';
/* A small emulator of Vercel's static routing pipeline, so the endpoint tests
 * can exercise real HTTP responses without a deploy.
 *
 * It compiles vercel.json with @vercel/routing-utils — the same package Vercel
 * uses to turn `cleanUrls` / `redirects` / `headers` into an ordered route list
 * — then replays that list per request:
 *
 *   1. routes with a status + Location   -> redirect, stop
 *   2. routes with `continue: true`      -> merge their headers, keep going
 *   3. filesystem lookup (with cleanUrls)-> 200 with the file
 *   4. nothing matched                   -> 404 serving /404.html
 *
 * It is not a full reimplementation of the platform: there are no functions,
 * rewrites, or edge caching here, because this site has none of those. What it
 * does cover is exactly the surface the agent-readiness work touches.
 */

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function loadRoutes() {
  let routingUtils;
  try {
    routingUtils = require('@vercel/routing-utils');
  } catch {
    return null; // caller decides whether to skip
  }
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const t = routingUtils.getTransformedRoutes({
    cleanUrls: cfg.cleanUrls,
    trailingSlash: cfg.trailingSlash,
    headers: cfg.headers,
    redirects: cfg.redirects,
    rewrites: cfg.rewrites,
  });
  if (t.error) throw new Error('vercel.json is invalid: ' + JSON.stringify(t.error));
  const n = routingUtils.normalizeRoutes(t.routes);
  if (n.error) throw new Error('vercel.json routes do not normalize: ' + JSON.stringify(n.error));
  return t.routes;
}

/* Vercel's `has` conditions, limited to the types this config uses. */
function hasMatches(conditions, req, query) {
  return conditions.every((c) => {
    let actual;
    if (c.type === 'header') actual = req.headers[c.key.toLowerCase()];
    else if (c.type === 'query') actual = query.get(c.key);
    else if (c.type === 'host') actual = req.headers.host;
    else return false;
    if (actual === undefined || actual === null) return false;
    if (!c.value) return true;
    return new RegExp('^(?:' + c.value + ')$').test(actual) || new RegExp(c.value).test(actual);
  });
}

/* Resolve a request path to a file, honouring cleanUrls. */
function resolveFile(pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (rel === '') rel = 'index.html';
  const candidates = [rel, rel + '.html', path.join(rel, 'index.html')];
  for (const c of candidates) {
    if (c.includes('..')) continue;
    const abs = path.join(ROOT, c);
    if (!abs.startsWith(ROOT)) continue;
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return { abs, rel: c };
  }
  return null;
}

function createServer(routes) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const extraHeaders = {};

    for (const route of routes) {
      if (!route.src) continue;
      const m = new RegExp(route.src).exec(pathname);
      if (!m) continue;
      if (route.has && !hasMatches(route.has, req, url.searchParams)) continue;
      if (route.missing && hasMatches(route.missing, req, url.searchParams)) continue;

      if (route.status && route.headers && route.headers.Location) {
        const location = route.headers.Location.replace(/\$(\d+)/g, (_, i) => m[Number(i)] || '');
        res.writeHead(route.status, { ...extraHeaders, Location: location });
        return res.end();
      }
      if (route.continue && route.headers) {
        for (const [k, v] of Object.entries(route.headers)) {
          extraHeaders[k] = v.replace(/\$(\d+)/g, (_, i) => m[Number(i)] || '');
        }
      }
    }

    const hit = resolveFile(pathname);
    if (hit) {
      const type = MIME[path.extname(hit.rel).toLowerCase()] || 'application/octet-stream';
      const body = fs.readFileSync(hit.abs);
      res.writeHead(200, { 'Content-Type': type, ...extraHeaders, 'Content-Length': body.length });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }

    // Vercel serves a project-root 404.html with a real 404 status.
    const notFound = path.join(ROOT, '404.html');
    if (fs.existsSync(notFound)) {
      const body = fs.readFileSync(notFound);
      res.writeHead(404, {
        'Content-Type': 'text/html; charset=utf-8',
        ...extraHeaders,
        'Content-Length': body.length,
      });
      return res.end(body);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });
}

module.exports = { loadRoutes, createServer, resolveFile };
