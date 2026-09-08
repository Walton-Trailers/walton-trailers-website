#!/usr/bin/env python3
"""
optimize_images.py — responsive WebP derivatives for the static site.

What it does
  1. Finds every local JPG/PNG referenced by an <img src> or an inline
     background-image:url(...) in the active HTML pages.
  2. Writes WebP derivatives next to each source:  <stem>-800.webp,
     <stem>-1200.webp, <stem>-1600.webp (never wider than the source).
     The logo gets 330 / 660 px (1x / 2x of its 165 px slot) with alpha kept.
  3. Rewrites the <img> tags to point at the derivatives with srcset + sizes,
     and adds loading="lazy" decoding="async" to any image that isn't already
     marked eager (fetchpriority="high") or lazy. Inline background urls are
     pointed at the 1200 px derivative.

Originals are left in place and untouched; nothing links to them afterwards.
Re-running is safe: derivatives are only regenerated when the source is newer.

Usage
  python3 optimize_images.py                # generate + rewrite
  python3 optimize_images.py --dry-run      # report only
  python3 optimize_images.py --measure imgwidths.jsonl
        # optional: per-page rendered widths (see --measure format below) so
        # the sizes attribute matches the real slot instead of the default

--measure format: one JSON object per line,
  {"vp":"1366x900","page":"Gooseneck/fbx212","imgs":[{"src":"Images/x.jpg","w":601},...]}
  {"vp":"375x812", ...}
Images are matched to tags by src, in document order.

Requires Pillow with WebP support (python3 -c "from PIL import features; print(features.check('webp'))").
"""
import argparse, json, os, re, sys, collections
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
WIDTHS = [800, 1200, 1600]
LOGO_WIDTHS = [330, 660]
QUALITY = 82
DEFAULT_SIZES = "(max-width: 768px) 100vw, 50vw"
PAGE_GLOBS = ["*.html", "Gooseneck/*.html", "Deckover/*.html", "Landscape/*.html",
              "dump-trailers/*.html", "tilt-equipment/*.html"]
SKIP_PAGES = {"404.html"}
RASTER = (".jpg", ".jpeg", ".png")

IMG_TAG = re.compile(r"<img\b[^>]*>")
SRC_ATTR = re.compile(r'\bsrc="([^"]+)"')
BG_URL = re.compile(r"url\((['\"]?)([^'\")]+\.(?:jpe?g|png))\1\)", re.I)


def pages():
    import glob
    out = []
    for g in PAGE_GLOBS:
        for p in sorted(glob.glob(os.path.join(ROOT, g))):
            rel = os.path.relpath(p, ROOT)
            if rel in SKIP_PAGES:
                continue
            out.append(rel)
    return out


def resolve(page, src):
    src = src.split("?")[0].split("#")[0].replace("%20", " ")
    if src.startswith(("http:", "https:", "//", "data:")):
        return None
    if src.startswith("/"):
        p = os.path.join(ROOT, src.lstrip("/"))
    else:
        p = os.path.normpath(os.path.join(ROOT, os.path.dirname(page), src))
    return p if os.path.isfile(p) and p.lower().endswith(RASTER) else None


def is_logo(path):
    return "/logos/" in path.replace("\\", "/")


def derivative_widths(path):
    with Image.open(path) as im:
        w = im.size[0]
    if is_logo(path):
        return [x for x in LOGO_WIDTHS if x <= w] or [w]
    ws = [x for x in WIDTHS if x <= w]
    return ws or [w]


def derivative_path(path, width):
    stem, _ = os.path.splitext(path)
    return f"{stem}-{width}.webp"


def build(path, dry):
    """Write derivatives; return list of (width, path)."""
    made = []
    src_mtime = os.path.getmtime(path)
    for w in derivative_widths(path):
        out = derivative_path(path, w)
        if os.path.exists(out) and os.path.getmtime(out) >= src_mtime:
            made.append((w, out))
            continue
        if not dry:
            with Image.open(path) as im:
                has_alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
                im = im.convert("RGBA" if has_alpha else "RGB")
                if im.size[0] > w:
                    h = round(im.size[1] * w / im.size[0])
                    im = im.resize((w, h), Image.LANCZOS)
                im.save(out, "WEBP", quality=QUALITY, method=6)
        made.append((w, out))
    return made


def rel_url(page, target):
    """Path from the page's directory to target, URL-style."""
    return os.path.relpath(target, os.path.join(ROOT, os.path.dirname(page))).replace(os.sep, "/")


def load_measurements(fn):
    """{(page, src): {vp: [w, w, ...]}} in document order."""
    m = collections.defaultdict(lambda: collections.defaultdict(list))
    if not fn:
        return m
    for line in open(fn):
        line = line.strip()
        if not line.startswith("{"):
            continue
        d = json.loads(line)
        page = d["page"] + ".html"
        vp = d["vp"].split("x")[0]
        for im in d["imgs"]:
            m[(page, im["src"])][vp].append(im.get("w", 0))
    return m


def sizes_for(measure, page, src, cursor):
    """Compute a sizes attribute from measured widths, consuming one measurement per call."""
    key = (page, src)
    if key not in measure:
        return DEFAULT_SIZES
    i = cursor[key]
    cursor[key] += 1
    mob = measure[key].get("375", [])
    desk = measure[key].get("1366", [])
    mw = mob[i] if i < len(mob) else (mob[-1] if mob else 0)
    dw = desk[i] if i < len(desk) else (desk[-1] if desk else 0)
    if not mw and not dw:
        return DEFAULT_SIZES
    vw = max(1, min(100, round((mw or 375) / 375 * 100)))
    dpx = dw or 600
    return f"(max-width: 768px) {vw}vw, {dpx}px"


def rewrite_img(tag, page, path, derivs, sizes):
    largest = max(w for w, _ in derivs)
    default_w = max([w for w, _ in derivs if w <= 1200] or [largest])
    default_url = rel_url(page, derivative_path(path, default_w))
    if is_logo(path):
        srcset = ", ".join(f"{rel_url(page, p)} {i + 1}x" for i, (w, p) in enumerate(sorted(derivs)))
        new = SRC_ATTR.sub(f'src="{rel_url(page, sorted(derivs)[0][1])}" srcset="{srcset}"', tag, count=1)
    else:
        srcset = ", ".join(f"{rel_url(page, p)} {w}w" for w, p in sorted(derivs))
        new = SRC_ATTR.sub(f'src="{default_url}" srcset="{srcset}" sizes="{sizes}"', tag, count=1)
    if not re.search(r"\b(loading|fetchpriority)=", new) and not is_logo(path):
        new = new.replace("<img ", '<img loading="lazy" decoding="async" ', 1)
    elif "decoding=" not in new and not is_logo(path):
        new = new.replace("<img ", '<img decoding="async" ', 1)
    return new


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--measure", help="jsonl of rendered widths (see docstring)")
    args = ap.parse_args()
    measure = load_measurements(args.measure)

    # Pass 1: collect sources
    sources = {}
    for page in pages():
        html = open(os.path.join(ROOT, page), encoding="utf-8").read()
        for tag in IMG_TAG.findall(html):
            m = SRC_ATTR.search(tag)
            if not m:
                continue
            p = resolve(page, m.group(1))
            if p:
                sources.setdefault(p, set()).add(page)
        for m in BG_URL.finditer(html):
            p = resolve(page, m.group(2))
            if p:
                sources.setdefault(p, set()).add(page)

    # Pass 2: derivatives
    derivs = {}
    before = 0
    for p in sorted(sources):
        before += os.path.getsize(p)
        derivs[p] = build(p, args.dry_run)
        if not args.dry_run:
            sizes_kb = [f"{w}:{os.path.getsize(o)//1024}KB" for w, o in derivs[p]]
            print(f"  {os.path.relpath(p, ROOT)}  {os.path.getsize(p)//1024}KB -> {' '.join(sizes_kb)}")
    print(f"{len(sources)} source images, {before//1048576} MB total")

    # Pass 3: rewrite pages
    for page in pages():
        fn = os.path.join(ROOT, page)
        html = open(fn, encoding="utf-8").read()
        cursor = collections.Counter()
        changed = 0

        def img_sub(m):
            nonlocal changed
            tag = m.group(0)
            sm = SRC_ATTR.search(tag)
            if not sm:
                return tag
            p = resolve(page, sm.group(1))
            if not p or p not in derivs:
                return tag
            s = sizes_for(measure, page, sm.group(1), cursor)
            changed += 1
            return rewrite_img(tag, page, p, derivs[p], s)

        def bg_sub(m):
            nonlocal changed
            p = resolve(page, m.group(2))
            if not p or p not in derivs:
                return m.group(0)
            ws = [w for w, _ in derivs[p] if w <= 1200] or [derivs[p][-1][0]]
            changed += 1
            return f"url({m.group(1)}{rel_url(page, derivative_path(p, max(ws)))}{m.group(1)})"

        new = IMG_TAG.sub(img_sub, html)
        new = BG_URL.sub(bg_sub, new)
        if new != html and not args.dry_run:
            open(fn, "w", encoding="utf-8").write(new)
        print(f"  {page}: {changed} references rewritten")


if __name__ == "__main__":
    main()
