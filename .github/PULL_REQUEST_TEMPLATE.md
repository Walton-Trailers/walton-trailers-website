<!-- waltontrailers.com PR template (2026-09-08). Reviewers triage on the Flags — tick honestly; it is how a PR passes first time. -->

## Why
<!-- One paragraph: the problem, the audit/measurement behind it, who asked. -->

## What changed
<!-- Bullets. Name pages and files. -->

## Flags — tick every one that applies
- [ ] **Nav / menu structure** (desktop dropdowns, footer columns, or the phone drawer) → **heads-up to Jordan before merge**
- [ ] **Public policy / legal text** (`warranty-policy.html`, `warranty.html`, `register.html`, `terms.html`, `privacy.html`, `llms.txt`, `llms-full.txt`) → effective date stated: `___` · **every surface listed here that states the rule is updated in this PR** · a test pins the rule + date
- [ ] **Deploy / infra** (`vercel.json`, `.vercelignore`, `.github/`, `robots.txt`, `sitemap.xml`) → Jordan review (CODEOWNERS)
- [ ] **New third-party script, embed or domain**: `___`
- [ ] **Generated content re-run** (`mobile_menu.py`, `optimize_images.py`) — `--check` output pasted in §Verified
- [ ] **Stacked on / overlaps an open PR** — #`___` (which lands first; what the second must re-run)
- [ ] **Links into Walton OS apps changed** (URLs, params, count per page)

## Verified
- `node --test tests/*.test.js` → `___` pass / `___` fail
- `python3 mobile_menu.py --check` → `___`
- Viewports checked (375 · 768 · 1366): `___`
- Live/preview check (what URL, what you saw): `___`

## Decisions for Jordan (if any)
| ID | Decision | Blocks |
|---|---|---|
| | | |

## Review request
<!-- ONE Slack DM to Jordan when the PR is READY (link + flags ticked) — not one per push. When answering review items, push them all, then one "ready for re-review". -->
