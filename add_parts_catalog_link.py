#!/usr/bin/env python3
"""
add_parts_catalog_link.py
-------------------------
One-shot helper to insert a "Parts Catalog" nav item adjacent to the existing
"Dealer Portal" item across the walton-trailers-website global nav.

Approach: pattern-based and idempotent. Finds every line containing the exact
markup

    <li><a href="dealer-portal.html">Dealer Portal</a></li>

and inserts an immediately following sibling line linking to
walton-parts-catalog.vercel.app, preserving the original line's indentation.
If the script is run twice, the second run is a no-op (idempotency guard).

Usage (from the repo root):

    python3 add_parts_catalog_link.py --dry-run    # report what would change
    python3 add_parts_catalog_link.py              # apply changes

This script is a one-shot. After the change is merged, it can be deleted.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# 15 active HTML pages that carry the global nav (post-pull, HEAD=8b946af).
# Includes dealer-portal.html — Taylor's Coming Soon landing page also carries
# the full global nav now, so for consistency the Parts Catalog item must
# appear there too (otherwise 14/15 pages have it and 1 is out of step).
# Excludes _archive/learn.html (robots-disallowed per robots.txt).
# Excludes login.html (deleted entirely by Taylor in the SF-01 closure).
FILES = [
    "about.html",
    "become-a-dealer.html",
    "careers.html",
    "contact.html",
    "dealer-portal.html",
    "find-a-dealer.html",
    "index.html",
    "parts.html",
    "privacy.html",
    "register.html",
    "terms.html",
    "user-manuals.html",
    "video-guides.html",
    "warranty.html",
    "warranty-policy.html",
]

NEW_LINK_HREF = "https://walton-parts-catalog.vercel.app"
NEW_LINK_TEXT = "Parts Catalog"

# Match the existing Dealer Portal <li>, capturing its leading whitespace.
DEALER_PORTAL_RE = re.compile(
    r'^(?P<indent>\s*)<li><a href="dealer-portal\.html">Dealer Portal</a></li>\s*$',
    re.MULTILINE,
)

# Idempotency sentinel — if the new href is already in the file, skip it.
ALREADY_APPLIED_RE = re.compile(
    r'<li><a href="' + re.escape(NEW_LINK_HREF) + r'"'
)


def apply_to_file(path: Path, dry_run: bool) -> tuple[int, bool]:
    """
    Returns (insertions_made, skipped_because_already_applied).
    """
    text = path.read_text(encoding="utf-8")

    if ALREADY_APPLIED_RE.search(text):
        return (0, True)

    def replacer(m: re.Match) -> str:
        indent = m.group("indent")
        original_line = m.group(0).rstrip()
        new_li = (
            f'{indent}<li><a href="{NEW_LINK_HREF}" '
            f'target="_blank" rel="noopener noreferrer">{NEW_LINK_TEXT}</a></li>'
        )
        return f"{original_line}\n{new_li}"

    new_text, n = DEALER_PORTAL_RE.subn(replacer, text)

    if n > 0 and not dry_run:
        path.write_text(new_text, encoding="utf-8")

    return (n, False)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Insert a Parts Catalog nav link adjacent to Dealer Portal."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without writing files.",
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path("."),
        help="Path to repo root (default: current directory).",
    )
    args = parser.parse_args()

    total = 0
    missing: list[str] = []
    already: list[str] = []
    edited: list[str] = []

    for fname in FILES:
        path = args.repo_root / fname
        if not path.exists():
            missing.append(fname)
            print(f"  MISSING: {fname}")
            continue

        n, was_applied = apply_to_file(path, args.dry_run)
        if was_applied:
            already.append(fname)
            print(f"  already-applied: {fname}")
        else:
            print(f"  {fname}: {n} insertion(s)")
            total += n
            if n > 0:
                edited.append(fname)

    verb = "Would insert" if args.dry_run else "Inserted"
    print()
    print(f"{verb}: {total} <li> across {len(edited)} files")
    if already:
        print(f"Skipped (already applied): {len(already)} file(s)")
    if missing:
        print(f"Missing files: {missing}")
        return 1

    if not args.dry_run and total > 0:
        print()
        print("Next: review the diff with `git diff --stat` and `git diff index.html`")

    return 0


if __name__ == "__main__":
    sys.exit(main())
