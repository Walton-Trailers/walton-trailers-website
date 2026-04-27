# Walton Trailers — Full Site Audit
**Date:** March 6, 2026
**Pages audited:** 45 HTML files across 6 directories
**Live site:** https://taylor-nielsen.github.io/walton-trailers-website

---

## Summary

The site is structurally solid and professionally built. Navigation, SEO, analytics, the chatbot, the dealer locator map, and the overall design system are all working. The main gaps are **placeholder content** (photos, copy, and form IDs that were always intended to be filled in), a handful of **dead-end links**, and one form that **silently drops submitted data**. None of these are bugs in the traditional sense — they're the natural "phase 2" fill-in work after a build like this.

---

## ✅ What's Working Well

**Navigation & Structure**
- Mega menu with full dropdown works on all pages
- Mobile hamburger menu works sitewide
- Footer is consistent across all 45 pages
- All major internal links (nav, footer, CTAs) resolve correctly

**Technical Foundation**
- SEO meta tags and canonical URLs on every page
- Google Analytics (G-S1DJR65JZJ) tracking on all pages
- Favicon displays correctly (32px, 192px, 512px, apple-touch-icon)
- Google Maps live and working on Find a Dealer page
- Responsive breakpoints (768px, 480px) throughout the site

**Owner & Support Pages**
- User Manuals page: real PDFs linked from Dexter, KTI, RAM, Stillwell, and Walton
- Warranty Policy: clean, well-written coverage summary and claims process
- Parts & Accessories: model filter, parts catalog, and "Don't see your part?" CTA all functional
- Learning Center: blog layout with search bar and category filters working

**Product Pages (all 22)**
- Standard Features accordion collapses/expands correctly
- Full Specifications accordion collapses/expands correctly
- Quick Overview specs card (GVWR, Length, Pull Type, MSRP) displays correctly
- 3-slot image carousel is wired up and ready for real photos
- "Help Me Choose" and chatbot widgets load on every page

**Interactive Tools**
- Help Me Choose finder: 5-step flow, correct model recommendations, links to model pages
- Chatbot: loads on all pages, 40-entry FAQ keyword engine, audience triage
- Compare Models (homepage): two-step category → model flow, works correctly

**Category Pages (all 5)**
- Correct model listings with "View Full Specs" links to individual model pages
- Deckover, Dump Trailers, Tilt Equipment, and Landscape all have at least one real photo

---

## ❌ Issues Found

### Priority 1 — Contact Forms Are Broken
**File:** `contact.html`
All 4 contact forms still use `YOUR_FORMSPREE_ID` as the action. When a visitor submits any form (Buy a Trailer, Owner Support, Dealer Inquiry, General Question), the submission will fail or go nowhere.

**Fix:** Sign in at formspree.io, create a form endpoint, and replace `YOUR_FORMSPREE_ID` in the 4 form `action` attributes in `contact.html`. Free plan handles up to 50 submissions/month.

---

### Priority 2 — Registration Form Silently Loses Data
**File:** `register.html`
The "Register My Trailer" button runs `submitRegistration()`, which validates the fields then hides the form and shows a success message — but **never actually sends the data anywhere**. Customers think they registered, but nothing is recorded.

**Fix:** Either connect this form to Formspree the same way as contact.html, or redirect visitors to your dealer for registration. This is the highest-risk issue because it creates a false impression of success.

---

### Priority 3 — No Photos on Product Pages (All 22 Models)
**File:** All product pages (e.g., `dhv207.html`, `fbh207.html`, etc.)
Every model page carousel shows three grey "Photo Slot — Add image here" placeholders. This is the most visible gap to any visitor who clicks into a model page.

**Fix:** Drop 2–3 photos per model into each carousel slot. Photos just need to be uploaded into the page's `Images/` folder and referenced in the three `carousel-slide` divs. This is the single biggest UX improvement available.

---

### Priority 4 — "Build Now" / "Build Your Own" Buttons Are Dead
Every model page has a "Build Now" CTA button and every category page has "Build Your Own" buttons — all pointing to `href="#"` which does nothing. These are high-intent conversion points that currently lead nowhere.

**Fix (easy option):** Change `href="#"` on those buttons to `href="contact.html"` or `href="find-a-dealer.html"` so visitors at least end up somewhere useful. A full quote/configurator tool could come later.

---

### Priority 5 — Homepage Hero Has No Real Photos (3 Slides)
**File:** `index.html`
The hero carousel has 3 slides with dark gradient placeholders. This is the first thing every visitor sees.

**Fix:** Drop one hero photo per slide and update the `style="background:..."` on each `.hero-bg-placeholder` div to `background-image: url('Images/your-photo.jpg')`.

---

## ⚠️ Other Issues

### Dead Social Links (Every Page)
The Facebook, Instagram, YouTube, and LinkedIn icons in the footer all have `href="#"`. They display correctly but clicking them does nothing.

**Fix:** Update the 4 `footer-social-btn` links on all pages with real social profile URLs. This can be done with a quick find-and-replace script like the ones used earlier.

---

### "Apparel" and "Inventory" Nav Items Go Nowhere
In the Trailers mega menu, "Apparel" and "Inventory" both link to `href="#"`. These show up on every single page in the nav.

**Fix:** Either remove them from the nav until those pages exist, or replace with a placeholder page that says "Coming Soon." As-is, they look like broken links to anyone who clicks them.

---

### Video Guides Page Has No Videos
**File:** `video-guides.html`
The page has nicely styled video cards (with hover effects and play buttons) but they are not clickable — no `href` or `onclick` — and no video is embedded anywhere. It's a design shell with no content.

**Fix:** Either embed YouTube/Vimeo videos inside each card, or add `href="https://youtube.com/..."` links to the cards so they open the right videos. Cards already have duration labels that just need updating.

---

### Careers Page Apply Links Are Dead
**File:** `careers.html`
There are 4 job listing cards, each with an "Apply Now →" button pointing to `href="#"`.

**Fix:** Link each Apply Now button to an email (`mailto:jobs@waltontrailers.com`) or a Google Form for applications.

---

### Missing Category Photos (Gooseneck + Some Dump/Tilt Models)
On the Gooseneck category page, 5 of 7 model cards show "Add photo here" text (FBH207, FBH208, FBH210, FBH307, FBX215). Only the FBX210 and FBX212 have real photos.

On the Dump Trailers category page, DHO210/DHO212/DHO215 have no photo (only DHV207 has one). Same pattern on Tilt (only TSX207 has a photo).

**Fix:** Add category-sized photos for the remaining models into each subdirectory's `Images/` folder.

---

### Product Description Copy Is Placeholder Text (All 22 Pages)
Every model page has a paragraph ending with `[Replace this with 1–2 additional sentences specific to this model's size, GVWR, and ideal applications.]` and a "Dimensions diagram placeholder" in the specs section. This shows up if visitors read the page carefully.

---

### Minor HTML Bug — user-manuals.html
The file has a duplicate `</body></html>` at the very end (added by an external editor). This doesn't break the page visually but is invalid HTML.

**Fix:** Remove the last two lines of the file (`</body>` and `</html>` at the very bottom).

---

## 📋 Suggested Priority Order

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Wire up Formspree on contact.html | 15 min | High — forms currently broken |
| 2 | Fix register.html to actually send data | 20 min | High — silently loses customer data |
| 3 | Add product photos to all 22 model carousels | Hours (photo prep) | High — biggest visual gap |
| 4 | Point "Build Now" / "Build Your Own" to contact.html | 10 min | High — dead conversion points |
| 5 | Add real homepage hero photos (3 slides) | 30 min (once photos ready) | High — first impression |
| 6 | Update social media footer links sitewide | 10 min | Medium |
| 7 | Add real dealers to find-a-dealer.html | 30–60 min | Medium |
| 8 | Embed or link real videos on video-guides.html | 30 min | Medium |
| 9 | Fill in model description copy (22 pages) | Content writing | Medium |
| 10 | Fix Apparel/Inventory nav items (remove or build pages) | 10 min | Low–Medium |
| 11 | Add missing category photos (Gooseneck FBH series, DHO dumps) | 30 min | Low |
| 12 | Fix careers Apply Now links | 5 min | Low |
| 13 | Fix duplicate </body></html> in user-manuals.html | 2 min | Low |

---

## 🔮 Longer-Term Suggestions

**Real-time inventory / quote configurator** — The "Build Now" and "Inventory" placeholders in the nav suggest this is already on the roadmap. A simple form-based quote request (trailer type → size → options → dealer contact) would convert the dead CTA buttons into a real lead capture tool.

**Blog content pipeline** — The Learning Center is set up as a blog. As articles get published, the filter/search functionality will become genuinely useful. Even 4–6 solid articles would make the page feel active.

**Dealer data in Find a Dealer** — The map works beautifully. Populating it with real dealer names, addresses, and phone numbers is a quick win since the infrastructure is already there.

**AI chatbot upgrade** — The `chatbot-worker.js` file already has instructions for connecting the chatbot to Claude via a Cloudflare Worker. That upgrade would take it from a keyword-matching FAQ bot to a genuinely useful assistant.

---

*Report generated by Claude, March 6, 2026*
