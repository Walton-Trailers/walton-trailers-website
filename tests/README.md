# Tests

This repo is static HTML with no build step and **no `package.json` at the
project root** — adding one would make Vercel treat the site as a Node build
instead of a static deploy. So the suite runs on bare Node with the built-in
test runner, and the one library it wants is installed without saving.

```bash
# Everything that needs no dependencies (34 checks)
node --test tests/agent-readiness.test.js

# End-to-end HTTP checks against the routes vercel.json compiles to (14 checks)
npm install --no-save @vercel/routing-utils
node --test tests/endpoints.test.js

# Both
npm install --no-save @vercel/routing-utils && node --test tests/*.test.js
```

`node_modules/` is already gitignored. CI runs both files on every push and
pull request (`.github/workflows/agent-readiness.yml`).

## What each file covers

| File | Covers |
|---|---|
| `agent-readiness.test.js` | Static assertions: the 404 page and its markdown twin, the homepage heading outline and no-JS text, the JSON-LD identity graph, `llms.txt` / `llms-full.txt` structure and when-to-use guidance, `vercel.json` rule shape, and cross-file drift between the agent files and `walton-compare.js`. |
| `endpoints.test.js` | Real HTTP requests: 404 status and recovery body, `Accept: text/markdown` negotiation, `Vary` and `Link` headers, machine-readable file reachability, security headers, and that the ~80 legacy redirects and `cleanUrls` still behave. |
| `vercel-emulator.js` | Compiles `vercel.json` with `@vercel/routing-utils` (the same package Vercel uses) and replays the resulting route list over a local HTTP server. Redirects, header rules, `has` conditions, `cleanUrls`, and the root `404.html` fallback only — this site has no functions or rewrites. |
| `helpers.js` | HTML/markdown parsing shared by the suites, plus `resolveToFile()`, which maps a public URL onto the file that serves it so link assertions catch dead references. |

## The drift guard

`walton-compare.js` holds the site's own model data, so it is treated as the
source of truth. The suite fails if `llms.txt` or `llms-full.txt` lists a model
the site does not publish, omits one it does, or quotes a GVWR or axle count
that disagrees with it. When a model is added or retired, update
`walton-compare.js` and the two agent files together.

## Adding a page

If you add a page and want agents to find it, add it to `sitemap.xml` and to the
right section of `llms.txt`. Both are asserted: the suite fails if either lists
a URL that resolves to no file.

## Adding a markdown twin

Today only the homepage negotiates markdown. To add another page:

1. Write `<page>.md` next to the HTML.
2. Add a `redirects` entry in `vercel.json` with the same
   `has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }]`
   condition, pointing at it.
3. Add a `headers` entry giving that page `Vary: Accept, Accept-Encoding` and a
   `Link: …; rel="alternate"; type="text/markdown"` header.
4. Add `<link rel="alternate" type="text/markdown">` to the page's `<head>`.
5. Extend the `markdown negotiation does not hijack pages…` test in
   `endpoints.test.js`, which currently asserts `/about` does *not* negotiate.
