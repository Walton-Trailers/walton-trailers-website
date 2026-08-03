# CLAUDE.md — Operating Context for AI Assistants

**Repo:** `Walton-Trailers/walton-trailers-website`
**Audience:** Any Claude session (Claude Code, Cowork, claude.ai with this repo as context) working on this codebase
**Last updated:** 2026-05-26
**Maintainer:** Taylor Nielsen (taylor@waltontrailers.com) — primary committer for this repo. Jordan Williams (jordan@waltontrailers.com) cross-edits when coordinating with sibling apps.

---

## 1. What this repo is

`walton-trailers-website` is the **public marketing site** for Walton Trailers — `waltontrailers.com`. It's a **static HTML site** (no framework, no build step beyond Vercel's static serving). The repo contains 17 active HTML pages, a handful of vendored JS files (`walton-chat.js`, `walton-finder.js`, `walton-compare.js`, `chatbot-worker.js`, `walton-supabase.js`), category subfolders for trailer model pages (`Gooseneck/`, `Deckover/`, `Landscape/`, `dump-trailers/`, `tilt-equipment/`), and a `_archive/` folder of retired pages (robots-disallowed).

**Deploy target:** Vercel, project `walton-trailers-website` (ID `prj_v8JxUWYIDqAYXKHdvfHTF6aMgw0d`), Walton Trailers team (`team_nRfHWxUw9f8qXQp0EOgR0bHH`). Every push to `main` triggers a production deploy. Feature branches get preview deploys automatically.

**Production domain:** Cutover to `https://www.waltontrailers.com` is in progress. The Vercel-owned URL `walton-trailers-website.vercel.app` remains live as a fallback. Canonical URLs in `<head>` are mixed during the cutover — some still reference `taylor-nielsen.github.io/walton-trailers-website` (GitHub Pages, the prior production target). Reconcile to the custom domain before final launch.

**Key vercel.json behavior:**

- Strong security headers (X-Frame-Options DENY, full CSP, HSTS, Permissions-Policy)
- ~80 redirect rules mapping legacy paths from the prior site (e.g., `/locate-a-dealer/*` → `/find-a-dealer.html`, `/about-us/*` → `/about.html`)
- Always check `vercel.json` before adding a new page or changing a URL — there may already be a redirect that needs updating

---

## 2. The Walton ecosystem this site lives in

This website is one of several apps under the Walton Trailers Vercel team. Most are owned by Jordan and are not maintained from this repo. From Taylor's perspective on this codebase, the others appear only as **outbound link targets**:

| App | URL | Repo | Owner | Role |
|---|---|---|---|---|
| **walton-trailers-website** (this) | `walton-trailers-website.vercel.app` / `www.waltontrailers.com` | `Walton-Trailers/walton-trailers-website` | Taylor | Public marketing site |
| walton-trailers-configurator | `walton-trailers-configurator.vercel.app` | (separate) | Jordan | "Build Now" trailer configurator — public, link target from this site's "Build Now" CTAs |
| walton-parts-catalog | `walton-parts-catalog.vercel.app` | `Walton-Trailers/walton-os` (monorepo) | Jordan | **Dealer parts catalog & Dealer Access PIN entry — link target from this site's "Parts Catalog" nav item** |
| dealer-portal | `dealer-portal-one-chi.vercel.app` | (separate) | Jordan | Real dealer self-serve portal (still in Phase 2.5 build per Doc 56). Currently NOT linked from this site — the marketing site's `dealer-portal.html` is a separate Coming Soon landing. |
| walton-os-admin | `walton-os-admin.vercel.app` | `Walton-Trailers/walton-os` | Jordan | Internal admin / ops dashboard. Not user-facing from this site. |
| floor-app | `floor-app-virid.vercel.app` | `Walton-Trailers/walton-os` | Jordan | Production-floor PWA. Not user-facing from this site. |

**Hard rule (from Walton OS Doc 73):** each app serves one specific audience. Salespeople do NOT log into admin-panel. Dealers do NOT log into order-configurator. The marketing site is consumer/prospect-facing; the linked apps are dealer-facing or internal.

---

## 3. The Parts Catalog link — what shipped 2026-05-26

The most recent cross-app integration is a "Parts Catalog" link in the global nav, routing dealers from this marketing site to the parts catalog's Dealer Access PIN entry. Shipped in PR #1 (`parts-catalog-nav-link`, SHA `2770cc7`).

### The exact markup

In each of 15 HTML files, in 2 nav locations per file, this `<li>` appears immediately after the existing `Dealer Portal` `<li>`:

```html
<li><a href="https://walton-parts-catalog.vercel.app"
       target="_blank"
       rel="noopener noreferrer">Parts Catalog</a></li>
```

- `target="_blank"` — opens the catalog in a new tab so dealers don't lose their place on the marketing site
- `rel="noopener noreferrer"` — security-correct for an external link (prevents reverse tabnabbing, suppresses referrer leak)
- Indentation matches the surrounding `<li>` items per location (14 spaces in the mega-menu, 6 spaces in the footer/mobile menu)

### Files affected (17)

`about.html`, `become-a-dealer.html`, `careers.html`, `careers-openings.html`, `contact.html`, `dealer-portal.html`, `find-a-dealer.html`, `index.html`, `parts.html`, `privacy.html`, `register.html`, `terms.html`, `user-manuals.html`, `video-guides.html`, `vin-replacement.html`, `warranty.html`, `warranty-policy.html`

### Locations within each file (2 per file)

- **Mega-menu** — inside the "Dealer Tools" column of the header dropdown, after `<li><a href="dealer-portal.html">Dealer Portal</a></li>`
- **Footer / mobile menu** — inside the dealer-area `<ul>` near the bottom of each page, after the same Dealer Portal anchor

To find every occurrence: `grep -n 'walton-parts-catalog.vercel.app' *.html` — should return 34 matches across 17 files (2 per page).

### Why the marketing site links to it

Dealers visit the marketing site to find product info or look up their local dealer. Some of them also need to submit parts requests. The Parts Catalog button gives them a one-click entry point into the catalog's Dealer Access PIN flow, mirroring the existing pattern where "Build Now" CTAs hand off to `walton-trailers-configurator.vercel.app`. There is no integration deeper than the URL — no API call, no shared auth, no shared state.

---

## 4. How tightly the two apps are coupled

**Not tightly at all.** The coupling is a single string: the URL `https://walton-parts-catalog.vercel.app`.

### What does NOT break the link

Jordan can do all of these to the parts catalog without touching this repo:

- Add, remove, redesign features inside the catalog (browse, search, cart, order tracking, anything)
- Restyle or rewrite the Dealer Access PIN entry page
- Add new auth methods alongside or replacing the PIN
- Add new internal routes (`/admin/login`, `/track`, `/orders/:id`, anything)
- Refactor the catalog's component tree, swap frameworks, change build tools
- Change Supabase schemas, deploy new edge functions, modify business logic
- Push to the catalog's main branch as often as needed
- Add or remove products, pricing tiers, dealer-specific permissions
- Bug fixes, performance work, A/B tests

Every push to the parts catalog's main triggers a **catalog-only redeploy**. This repo is unaffected — no website files change, no website redeploy is triggered.

### What WOULD break the link

A short and avoidable list:

1. **Deleting or renaming the `walton-parts-catalog` Vercel project** — URL stops resolving. Don't do this without first updating this repo.
2. **Moving the dealer entry away from the root path `/`** — if the catalog root becomes, say, a product browse page and the dealer login moves to `/dealer-login`, the link still resolves but lands dealers in the wrong place. Either keep something dealer-useful at `/` or update this repo's link target.
3. **Custom domain cutover that retires the vercel.app URL** — if `parts.waltontrailers.com` becomes the canonical URL and the vercel.app URL is decommissioned, this repo needs the URL updated in 34 places.
4. **Extended downtime / broken catalog main** — if catalog main is broken for hours, dealers clicking the link hit an error page. Vercel preview-then-merge discipline avoids this.

If any of those four are about to happen, coordinate with Jordan before or in lockstep — see §6.

---

## 5. Day-to-day workflow rules

### For Taylor working on this repo

Treat the parts catalog URL as a **stable external dependency**. You don't need to know what's on the other end. Don't link-test it as part of your CI unless you want to (see §7 for an optional smoke test). The site doesn't need any other awareness of the catalog.

You can freely:

- Add new pages, edit existing pages, change copy, redesign sections
- Edit the global nav structure (mega-menu columns, footer layout) — just preserve the `Parts Catalog <li>` adjacent to the `Dealer Portal <li>`, or update both in lockstep if you're restructuring
- Change styles, fonts, images, JS
- Update `vercel.json` redirects, headers, CSP
- Anything else — Jordan is not affected by website-only changes

You cannot (without coordinating):

- Change the URL that the Parts Catalog link points to (see §6)
- Remove the Parts Catalog link from the nav (it's now part of the dealer-entry path; removing it strands dealers)
- Add new links to internal Walton apps without checking the URL with Jordan first

### For Jordan working on the parts catalog (in `Walton-Trailers/walton-os`)

Treat this website as a **passive consumer of your root URL**. Develop the catalog freely:

- Feature branches + Vercel previews for in-progress work
- Keep `walton-parts-catalog.vercel.app/` (root) serving a dealer-useful page at all times — currently the Dealer Access PIN entry, but any future replacement (email login, OAuth, redirect to a dedicated login route) is fine as long as a dealer can identify what to do
- If you ever want to require a path component (`/dealer-login` instead of `/`), tell Taylor — she does a 30-second find-and-replace across this repo to update the 30 link occurrences

---

## 6. Coordinated changes (the rare cases that need a sync)

These changes touch both repos and need to land together:

### 6a. Changing the parts catalog URL

If `walton-parts-catalog.vercel.app` becomes `parts.waltontrailers.com` (or any other URL), this repo needs to update 30 link occurrences across 15 files. The mechanics:

```bash
# In this repo, with the new URL set as $NEW:
NEW="https://parts.waltontrailers.com"
grep -rl 'walton-parts-catalog.vercel.app' --include='*.html' | \
  xargs sed -i '' "s|https://walton-parts-catalog.vercel.app|$NEW|g"
grep -c "$NEW" *.html   # Verify: each file should report 2 (and 0 of the old URL)
```

Or rerun `add_parts_catalog_link.py` (still in the repo at root) with the URL constants updated. Test on a feature branch, get a Vercel preview, confirm the link routes correctly, merge.

### 6b. Adding more cross-app links

If a future PR adds a "Configurator" or "Order Tracking" link to the nav, follow the same pattern — `<a href="...vercel.app" target="_blank" rel="noopener noreferrer">`. Single source of truth for cross-app URLs is currently per-file (hardcoded). If we grow past 2-3 cross-app links, consider centralizing into a small JS config block.

### 6c. Restructuring the global nav

The global nav is duplicated across all 15 HTML pages (no shared template — this is static HTML). Any structural change to the nav (adding a column, removing the Dealer Tools section, reorganizing menus) is a 15-file edit. Use a script. Don't hand-edit.

The mega-menu is generated inline in each file at roughly line 1240-ish (varies by page); the footer/mobile menu at roughly line 1611-ish. Search for `<li><a href="dealer-portal.html">Dealer Portal</a></li>` to find both anchor points reliably.

### 6d. Marketing-site auth changes

The website has no real auth today — `dealer-portal.html` is a Coming Soon landing, `login.html` was deleted in the SF-01 security closure (2026-05-15 audit), and there is no localStorage gate or credential surface anywhere. If you re-introduce any kind of auth on the marketing site, that is **separate** from the dealer-portal app's auth and from the parts catalog's PIN — coordinate with Jordan before adding a third auth surface so dealers don't end up with three different credentials.

---

## 7. Verification

### How to verify the Parts Catalog link is healthy

Manual (anyone):

1. Open `walton-trailers-website.vercel.app` (or the production custom domain)
2. Click any page's "Parts Catalog" nav item (mega-menu under Dealer Tools, OR footer)
3. Confirm a new tab opens to `walton-parts-catalog.vercel.app`
4. Confirm the destination shows a "Dealer Access" card with a PIN entry field

Automated (optional — see future-proofing in §8):

- A scheduled task that hits `https://walton-parts-catalog.vercel.app` weekly, checks for HTTP 200 + the string "Dealer Access" in the response body, fires a Slack alert if either fails

### How to verify the markup hasn't drifted in this repo

```bash
# Should output exactly 2 per file, total 34
grep -c 'walton-parts-catalog.vercel.app' *.html

# Should show 17 files, all returning 2
grep -c 'walton-parts-catalog.vercel.app' *.html | grep -v ':0$'

# Locate every occurrence
grep -n 'walton-parts-catalog.vercel.app' *.html
```

If any file reports 0, the nav drifted — restore the link on that page.

---

## 8. Future-proofing options (not urgent, worth considering)

A. **Stable named path** — link to `https://walton-parts-catalog.vercel.app/dealer-login` instead of root, and have the catalog maintain a permanent redirect from that path. Decouples this repo from the catalog's root-route decisions. Costs Jordan one route definition.

B. **Custom domain** — `parts.waltontrailers.com` is more durable and brand-consistent. Recommended once the catalog is past MVP and into stabilization.

C. **Weekly smoke test** — Slack alert if the catalog URL returns non-200 or the dealer entry text disappears. Cheap insurance.

D. **Centralized URL config** — if the website grows to link out to many Walton apps, replace 30 hardcoded URL occurrences with a JS `EXTERNAL_LINKS` object templated into the nav at runtime. Probably not worth doing for one link; revisit at 3+.

---

## 9. The helper script in the repo

`add_parts_catalog_link.py` is a one-shot helper that was used to perform the original 30-insertion patch. It's pattern-based, idempotent, and supports `--dry-run`.

**It is safe to delete.** Kept in the post-merge codebase only for diff-reviewability while the PR is open. If you (Taylor or any future Claude) see it in the repo root and want to clean up, drop it in a one-line PR with the message `chore: remove one-shot parts-catalog-link helper`.

If you ever need to bulk-edit the Parts Catalog `<li>` again (URL change, attribute change), the script is a useful starting template.

---

## 10. When to ping Jordan vs. proceed solo

**Proceed solo (no ping needed):**

- Any visual/content change to this repo
- New marketing pages, copy updates, image swaps, blog posts
- `vercel.json` edits that don't involve cross-app concerns
- Adding new redirects for legacy URLs
- Mobile-only fixes, accessibility improvements, performance work
- Adding/removing dealer pages on `find-a-dealer.html` from `dealer-list.csv`
- Editing model pages under `Gooseneck/`, `Deckover/`, etc.
- Cleanup of `_archive/` contents

**Ping Jordan (or coordinate before merge):**

- Anything touching the Parts Catalog link URL or the link's `<li>` structure
- Adding new cross-app links (configurator, dealer portal, admin panel, etc.)
- Changing or removing `dealer-portal.html` (it's the Coming Soon landing for the real dealer portal that Jordan is building separately)
- Anything that would change how dealers move between apps
- Major nav restructures
- Re-introducing any auth surface on the marketing site

---

## 11. Related Walton OS / vault docs

These live in Jordan's Obsidian vault (`~/Desktop/Obsidian Bank`) and may be referenced by Jordan-side Claude sessions. They are NOT in this repo. Taylor's Claude doesn't need to read them unless coordinating with Jordan on a cross-app concern.

- `04 - Projects/Walton Trailers Website Audit — 2026-05-15` — the security audit that surfaced SF-00/01/02 (all closed before 2026-05-26)
- `04 - Projects/Dealer Portal × Parts Catalog — Bridge Architecture 2026-05-06` — backend webhook bridge between the dealer portal and parts catalog (Supabase-to-Supabase, unrelated to this site's UI link)
- `04 - Projects/Walton OS/56 — Dealer Portal Build Plan (Phase 2.5)` — the in-progress real dealer portal Jordan is building (separate Vercel project, not this site)
- `02 - Sessions/2026-05-26-Session-148-Parts-Catalog-Nav-Link` — session log for the PR that shipped this integration
- `07 - Reference/MCP Routing` — canonical tool routing for Cowork sessions (Chrome MCP, Vercel MCP, etc.)
- `07 - Reference/Systems Registry` — full Walton infrastructure inventory

---

## 12. TL;DR for Claude

You are working in the Walton Trailers public marketing site. It is static HTML, deployed via Vercel from this repo. It has one outbound integration that matters: a `Parts Catalog` link in the global nav routing dealers to `walton-parts-catalog.vercel.app` (Jordan's app, separate repo). The link is a plain `<a href>` — there is no API, no shared auth, no shared state. You can edit this site freely as long as you preserve the Parts Catalog `<li>` adjacent to the Dealer Portal `<li>` in both the mega-menu and footer of all 15 active HTML pages. If you need to change the catalog URL, restructure the nav significantly, or add a new cross-app link, ping Jordan first — see §10 for the proceed-solo vs. coordinate-first rules.
