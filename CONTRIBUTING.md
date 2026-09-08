# Contributing to waltontrailers.com

Short version — the PR template asks for everything below; this is why.

1. **PRs only, one purpose each.** Never push to `main`. A nav change and a copy change are two PRs.
2. **Say what you touched via the Flags** in the template. Nav structure and public policy text get a heads-up to Jordan; deploy files, policy text and the generators route to him automatically (`.github/CODEOWNERS`).
3. **Policy text is a set, not a page.** The warranty rule lives on `warranty-policy.html`, `warranty.html`, `register.html` and both `llms*.txt` files (see `tests/warranty-policy.test.js` — it names the surfaces). Change one, change all, state the effective date on each, and pin it with a test.
4. **Generated content is generated.** Edit `MENU` in `mobile_menu.py` (or add photos and run `optimize_images.py`); never hand-edit the drawer. `python3 mobile_menu.py --check` must print `0 page(s) out of date` — CI enforces it.
5. **Verify, then say what you saw.** `node --test tests/*.test.js`, `--check`, and the viewports you looked at go in §Verified. Green CI is a floor, not proof.
6. **Declare stacking.** If two open PRs touch the same pages, name which lands first and what the second must re-run.
7. **One DM when ready.** Post the PR link and ticked flags to Jordan once the PR is ready; answer review items in one push and one "ready for re-review". Before starting work on someone else's branch, say so in the thread first.

Runbook for edits and image conventions: vault `05 - SOPs/Runbook — Walton Trailers Website Edits`.
