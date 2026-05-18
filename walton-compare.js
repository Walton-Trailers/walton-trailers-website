/* Walton Trailers — Compare Trailers Tool
   Shared module: data, dropdown population, render, open/close.
   Include on any page that uses the compareOverlay HTML. */

/* ── COMPARE DATABASE (15 active models) ── */
var compareData = {
  // Dump (Bumper Pull / Gooseneck)
  dhv207: { url: 'dump-trailers/dhv207.html',     name: 'DHV207 — Dump (14.9K)',     gvwr: '14,900 lbs', length: '14 – 16 ft', pull: 'Bumper Pull / Gooseneck', category: 'Dump Trailers',         type: 'Dump',          axles: '2', warranty: 'Lifetime Structural' },
  dhv208: { url: 'dump-trailers/dhv208.html',     name: 'DHV208 — Dump (18K GN)',    gvwr: '18,000 lbs', length: '14 – 16 ft', pull: 'Bumper Pull / Gooseneck', category: 'Dump Trailers',         type: 'Dump',          axles: '2', warranty: 'Lifetime Structural' },

  // Tilt Equipment
  tmx107: { url: 'tilt-equipment/tmx107.html',    name: 'TMX107 — Tilt (7K)',        gvwr: '7,000 lbs',  length: '12 ft',      pull: 'Bumper Pull',             category: 'Tilt Equipment',        type: 'Tilt',          axles: '1', warranty: 'Lifetime Structural' },
  tsx207: { url: 'tilt-equipment/tsx207.html',    name: 'TSX207 — Tilt (14.9K)',     gvwr: '14,900 lbs', length: '16 – 22 ft', pull: 'Bumper Pull / Gooseneck', category: 'Tilt Equipment',        type: 'Tilt',          axles: '2', warranty: 'Lifetime Structural' },
  tsx208: { url: 'tilt-equipment/tsx208.html',    name: 'TSX208 — Tilt (18K GN)',    gvwr: '18,000 lbs', length: '16 – 22 ft', pull: 'Bumper Pull / Gooseneck', category: 'Tilt Equipment',        type: 'Tilt',          axles: '2', warranty: 'Lifetime Structural' },

  // Deckover (Tag-Along / Bumper Pull)
  bde207: { url: 'Deckover/bde207.html',          name: 'BDE207 — Deckover (14.9K)', gvwr: '14,900 lbs', length: '18 – 22 ft', pull: 'Bumper Pull',             category: 'Deckover (Tag-Along)',  type: 'Deckover',      axles: '2', warranty: 'Lifetime Structural' },
  bde208: { url: 'Deckover/bde208.html',          name: 'BDE208 — Deckover (17.2K)', gvwr: '17,200 lbs', length: '18 – 22 ft', pull: 'Bumper Pull',             category: 'Deckover (Tag-Along)',  type: 'Deckover',      axles: '2', warranty: 'Lifetime Structural' },
  bde210: { url: 'Deckover/bde210.html',          name: 'BDE210 — Deckover (20K)',   gvwr: '20,000 lbs', length: '22 – 28 ft', pull: 'Bumper Pull',             category: 'Deckover (Tag-Along)',  type: 'Deckover',      axles: '2', warranty: 'Lifetime Structural' },
  bde212: { url: 'Deckover/bde212.html',          name: 'BDE212 — Deckover (24K)',   gvwr: '24,000 lbs', length: '24 – 30 ft', pull: 'Bumper Pull',             category: 'Deckover (Tag-Along)',  type: 'Deckover',      axles: '3', warranty: 'Lifetime Structural' },

  // Gooseneck Flatbed
  fbh207: { url: 'Gooseneck/fbh207.html',         name: 'FBH207 — Gooseneck (15.5K)', gvwr: '15,500 lbs', length: '20 – 26 ft', pull: 'Gooseneck',               category: 'Gooseneck Flatbeds',    type: 'Deck-Over',     axles: '2', warranty: 'Lifetime Structural' },
  fbh208: { url: 'Gooseneck/fbh208.html',         name: 'FBH208 — Gooseneck (18K)',   gvwr: '18,000 lbs', length: '20 – 26 ft', pull: 'Gooseneck',               category: 'Gooseneck Flatbeds',    type: 'Deck-Over',     axles: '2', warranty: 'Lifetime Structural' },
  fbh210: { url: 'Gooseneck/fbh210.html',         name: 'FBH210 — Gooseneck (23K)',   gvwr: '23,000 lbs', length: '24 – 30 ft', pull: 'Gooseneck',               category: 'Gooseneck Flatbeds',    type: 'Deck-Over',     axles: '2', warranty: 'Lifetime Structural' },
  fbx210: { url: 'Gooseneck/fbx210.html',         name: 'FBX210 — Gooseneck (23K)',   gvwr: '23,000 lbs', length: '24 – 30 ft', pull: 'Gooseneck',               category: 'Gooseneck Flatbeds',    type: 'Flatbed',       axles: '2', warranty: 'Lifetime Structural' },
  fbx212: { url: 'Gooseneck/fbx212.html',         name: 'FBX212 — Gooseneck (25.5K)', gvwr: '25,500 lbs', length: '24 – 32 ft', pull: 'Gooseneck',               category: 'Gooseneck Flatbeds',    type: 'Flatbed',       axles: '2', warranty: 'Lifetime Structural' },

  // Landscape
  mpr207: { url: 'Landscape/mpr207.html',         name: 'MPR207 — Landscape (14K)',   gvwr: '14,000 lbs', length: '20 – 22 ft', pull: 'Bumper Pull',             category: 'Landscape Trailers',    type: 'Landscape',     axles: '2', warranty: 'Lifetime Structural' }
};

/* ── PATH HELPER (root vs subdirectory pages) ── */
function _wcRelPath() {
  var depth = (window.location.pathname.match(/\//g) || []).length;
  return depth >= 3 ? '../' : '';
}

/* ── DROPDOWN POPULATION (runs on DOMContentLoaded) ──
   Skipped if the page uses the two-step Category → Model UI (presence of #catA).
   On that UI, the inline updateModelSelect() populates #compareA/#compareB after
   the user picks a category, using compareCategories + compareData. */
function _wcPopulateDropdowns() {
  if (document.getElementById('catA')) return; // two-step UI handles its own population
  var a = document.getElementById('compareA');
  var b = document.getElementById('compareB');
  if (!a || !b) return;
  var html = '<option value="">Select a trailer</option>';
  for (var key in compareData) {
    if (Object.prototype.hasOwnProperty.call(compareData, key)) {
      html += '<option value="' + key + '">' + compareData[key].name + '</option>';
    }
  }
  a.innerHTML = html;
  b.innerHTML = html;
  a.disabled = false;
  b.disabled = false;
}

/* ── RENDER ── */
function renderCompare() {
  var keyA = document.getElementById('compareA').value;
  var keyB = document.getElementById('compareB').value;
  var wrap = document.getElementById('compareTableWrap');
  var actions = document.getElementById('compareActions');

  if (!keyA || !keyB) {
    if (wrap) wrap.innerHTML = '<div class="compare-placeholder">Select two trailers above to compare specs</div>';
    if (actions) actions.style.display = 'none';
    return;
  }

  var a = compareData[keyA];
  var b = compareData[keyB];
  if (!a || !b) return;

  var base = _wcRelPath();
  var linkStyle = 'color:#c0392b;text-decoration:none;font-weight:500';
  var rows = [
    ['View Model',
     '<a href="' + base + a.url + '" style="' + linkStyle + '">View ' + a.name + ' →</a>',
     '<a href="' + base + b.url + '" style="' + linkStyle + '">View ' + b.name + ' →</a>'],
    ['Category',  a.category, b.category],
    ['Type',      a.type,     b.type],
    ['GVWR',      a.gvwr,     b.gvwr],
    ['Length',    a.length,   b.length],
    ['Pull Type', a.pull,     b.pull],
    ['Axles',     a.axles,    b.axles],
    ['Warranty',  a.warranty, b.warranty]
  ];

  var html = '<table class="compare-table"><thead><tr>';
  html += '<th class="col-label">Spec</th>';
  html += '<th>' + a.name + '</th>';
  html += '<th>' + b.name + '</th>';
  html += '</tr></thead><tbody>';

  var boldRows = ['GVWR', 'Length'];
  for (var i = 0; i < rows.length; i++) {
    var isHL = boldRows.indexOf(rows[i][0]) !== -1;
    html += '<tr>';
    html += '<td class="row-label">' + rows[i][0] + '</td>';
    html += '<td class="val' + (isHL ? ' highlight' : '') + '">' + rows[i][1] + '</td>';
    html += '<td class="val' + (isHL ? ' highlight' : '') + '">' + rows[i][2] + '</td>';
    html += '</tr>';
  }
  html += '</tbody></table>';
  if (wrap) wrap.innerHTML = html;
  if (actions) actions.style.display = 'flex';
}

/* ── MODAL OPEN / CLOSE ── */
function openCompare() {
  var ov = document.getElementById('compareOverlay');
  if (!ov) return;
  ov.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCompare() {
  var ov = document.getElementById('compareOverlay');
  if (!ov) return;
  ov.classList.remove('open');
  document.body.style.overflow = '';
}

function compareOverlayClick(e) {
  if (e.target.id === 'compareOverlay') closeCompare();
}

/* ── INIT ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _wcPopulateDropdowns);
} else {
  _wcPopulateDropdowns();
}
