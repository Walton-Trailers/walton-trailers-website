/* Walton Trailers — Trailer Finder Tool
   Provides the Help Me Choose / Trailer Finder modal functionality.
   Include on any page that uses the finderOverlay HTML.
*/

/* ── EQUIPMENT DATABASE ── */
var equipmentDB = [
  { name: 'Skid Steer (Small)', weight: 5000 },
  { name: 'Skid Steer (Large)', weight: 9500 },
  { name: 'Mini Excavator 1-3T', weight: 6500 },
  { name: 'Mini Excavator 3-5T', weight: 11000 },
  { name: 'Excavator 5-10T', weight: 22000 },
  { name: 'Compact Track Loader', weight: 8800 },
  { name: 'Backhoe Loader', weight: 14000 },
  { name: 'Wheel Loader Small', weight: 18000 },
  { name: 'Trencher Walk-Behind', weight: 1200 },
  { name: 'Trencher Ride-On', weight: 5500 },
  { name: 'Telehandler', weight: 17000 },
  { name: 'Utility Tractor 40-60HP', weight: 5500 },
  { name: 'Utility Tractor 60-100HP', weight: 8000 },
  { name: 'Farm Tractor 100-200HP', weight: 16000 },
  { name: 'Zero-Turn Mower', weight: 1100 },
  { name: 'Stand-On Mower', weight: 900 },
  { name: 'Riding Lawn Mower', weight: 600 },
  { name: 'Walk-Behind Mower', weight: 90 },
  { name: 'Wood Chipper Small', weight: 1800 },
  { name: 'Wood Chipper Large', weight: 6500 },
  { name: 'Stump Grinder', weight: 2800 },
  { name: 'Pallet of Concrete Blocks', weight: 2500 },
  { name: 'Ton of Gravel or Dirt', weight: 2000 },
  { name: 'Portable Generator', weight: 800 },
  { name: 'Air Compressor', weight: 500 },
  { name: 'Forklift 3-5T', weight: 9500 },
  { name: 'Scissor Lift', weight: 6000 },
  { name: 'Boom Lift', weight: 15000 },
  { name: 'Bulldozer Small', weight: 20000 },
  { name: 'ATV or UTV', weight: 1400 },
  { name: 'Side-by-Side', weight: 1700 },
  { name: 'Plate Compactor', weight: 350 },
  { name: 'Concrete Mixer Towable', weight: 1400 },
  { name: 'Kubota SVL75 Track Loader', weight: 9000 },
  { name: 'John Deere 333G Track Loader', weight: 10400 },
  { name: 'Caterpillar 299D3 Track Loader', weight: 11300 },
  { name: 'Bobcat T595', weight: 9900 },
  { name: 'Case CX57C Mini Excavator', weight: 12800 },
  { name: 'Kubota KX057 Mini Excavator', weight: 12900 },
  { name: 'John Deere 35G Mini Excavator', weight: 7720 }
];

/* ── TRAILER DATABASE ── */
var trailerDB = {
  dump_light:    { name: 'Dump Trailer',      sub: 'Light Duty (DHV)',       gvwr: '14,000 lbs', payload: '10,000 lbs', category: 'Dump Trailers' },
  dump_medium:   { name: 'Dump Trailer',      sub: 'Medium Duty (DHO)',      gvwr: '20,000 lbs', payload: '16,000 lbs', category: 'Dump Trailers' },
  dump_heavy:    { name: 'Dump Trailer',      sub: 'Heavy Duty (DHO)',       gvwr: '30,000 lbs', payload: '26,000 lbs', category: 'Dump Trailers' },
  dump_deckover: { name: 'Dump Trailer',      sub: 'Heavy Duty Deck-Over',   gvwr: '40,000 lbs', payload: '36,000 lbs', category: 'Dump Trailers' },
  tmx:           { name: 'Tilt Equipment',    sub: 'TMX107',                 gvwr: '14,000 lbs', payload: '10,000 lbs', category: 'Equipment & Tilt' },
  tsx:           { name: 'Tilt Equipment',    sub: 'TSX Series',             gvwr: '24,000 lbs', payload: '20,000 lbs', category: 'Equipment & Tilt' },
  fbx:           { name: 'Gooseneck Flatbed', sub: 'FBX Series',             gvwr: '24,000 lbs', payload: '20,000 lbs', category: 'Gooseneck Flatbeds' },
  fbh:           { name: 'Gooseneck Flatbed', sub: 'FBH Series (Deck-Over)', gvwr: '35,000 lbs', payload: '31,000 lbs', category: 'Gooseneck Flatbeds' },
  landscape:     { name: 'Landscape Trailer', sub: 'MPR Series',             gvwr: '7,000 lbs',  payload: '4,800 lbs',  category: 'Landscape Trailers' }
};

/* ── RECOMMENDATION ENGINE ── */
function recommend(use, unload, lbs, freq) {
  var match, alts, why;
  alts = [];

  /* ── Crane / Forklift loading always means an open flatbed ── */
  if (unload === 'crane-fork') {
    if (lbs > 30000) {
      match = 'fbh'; alts = ['fbx', 'tsx'];
      why = 'The FBH Gooseneck Deck-Over gives you maximum open deck space and the highest flatbed payload in the Walton lineup — ideal for crane or forklift unloading of very heavy loads.';
    } else {
      match = 'fbx'; alts = ['fbh', 'tsx'];
      why = 'The FBX Gooseneck Flatbed provides a clean, open deck that\'s purpose-built for forklift or crane loading and unloading. Strong, flat, and rated for serious commercial payloads.';
    }

  /* ── Landscaping or light manual unloading ── */
  } else if (use === 'landscaping' || (unload === 'manual' && lbs < 5000)) {
    match = 'landscape';
    alts  = ['dump_light', 'tmx'];
    why   = 'For landscaping crews hauling mowers, tools, and debris daily, the Landscape Trailer is purpose-built. Low deck height makes loading fast and the open design handles your full equipment range.';

  /* ── Dump / Hydraulic unloading (or bulk construction materials) ── */
  } else if (unload === 'dump') {
    if (lbs > 26000) {
      match = 'dump_deckover'; alts = ['dump_heavy', 'fbh'];
      why = 'Your load requires maximum lifting capacity. The Heavy Duty Deck-Over handles your largest job site loads with the highest GVWR in the Walton dump lineup.';
    } else if (lbs > 16000) {
      match = 'dump_heavy'; alts = ['dump_deckover', 'dump_medium'];
      why = 'For heavy-duty construction dumps, the Heavy Duty Dump Trailer delivers the frame strength and payload rating your job demands.';
    } else if (lbs > 10000) {
      match = 'dump_medium'; alts = ['dump_light', 'dump_heavy'];
      why = 'The Medium Duty Dump Trailer is the workhorse for mid-range construction loads: gravel, topsoil, demo debris.';
    } else {
      match = 'dump_light'; alts = ['dump_medium', 'landscape'];
      why = 'For lighter dump loads such as mulch, small debris, and landscaping material, the Light Duty Dump Trailer gives you hydraulic convenience at a compact size.';
    }

  /* ── Equipment drives or walks off under its own power ── */
  } else if (unload === 'drive-off') {
    if (lbs > 20000) {
      match = 'tsx'; alts = ['fbh', 'tmx'];
      why = 'The TSX Tilt Equipment Trailer is built for heavy machinery that drives on under its own power. High GVWR and a fully tilting bed handle your largest equipment safely — no ramps required.';
    } else {
      match = 'tmx'; alts = ['tsx', 'fbx'];
      why = 'The TMX Tilt Trailer is excellent for smaller self-propelled equipment. The tilting bed eliminates ramp setup for fast, safe loading.';
    }

  /* ── Construction use without a specific unload method chosen ── */
  } else if (use === 'construction') {
    if (lbs > 20000) {
      match = 'fbx'; alts = ['fbh', 'dump_heavy'];
    } else if (lbs > 10000) {
      match = 'tsx'; alts = ['tmx', 'fbx'];
    } else {
      match = 'dump_medium'; alts = ['dump_light', 'tmx'];
    }
    why = 'For construction use, the right trailer depends on how you\'re loading and unloading. Based on your weight estimate, this is your best Walton match. Talk to a dealer to confirm the right configuration for your job.';

  /* ── Agriculture ── */
  } else if (use === 'agriculture') {
    match = (lbs > 15000) ? 'tsx' : 'tmx';
    alts  = ['fbx', 'dump_medium'];
    why   = 'For farm and ag use you need a trailer that handles rugged terrain, heavy equipment, and seasonal abuse. Walton equipment trailers are engineered for exactly that.';

  /* ── Rental fleet ── */
  } else if (use === 'rental') {
    match = (freq === 'daily') ? 'dump_heavy' : 'dump_medium';
    alts  = ['tsx', 'fbx'];
    why   = 'Rental fleet operators need trailers that hold up through constant use. Walton commercial-grade build and lifetime structural warranty make them the smart fleet investment.';

  /* ── General / other ── */
  } else {
    if (lbs > 20000)      { match = 'fbx';       alts = ['tsx', 'fbh']; }
    else if (lbs > 10000) { match = 'tsx';        alts = ['tmx', 'fbx']; }
    else if (lbs > 5000)  { match = 'tmx';        alts = ['tsx', 'dump_light']; }
    else                  { match = 'landscape';  alts = ['tmx', 'dump_light']; }
    why = 'Based on your planned use and load requirements, this is the best Walton match for you. Every trailer carries a lifetime limited structural warranty and is built to commercial grade standards.';
  }

  return { match: match, alts: alts, why: why };
}

/* ── FINDER STATE ── */
var finderAnswers = { use: null, unload: null, freq: null, totalLbs: 0 };
var addedEquipment = [];

/* ── MODAL OPEN / CLOSE ── */
function openFinder() {
  document.getElementById('finderOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeFinder() {
  document.getElementById('finderOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function overlayClick(e) {
  if (e.target.id === 'finderOverlay') closeFinder();
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeFinder(); closeMenu(); }
});

/* ── STEP NAVIGATION ── */
function goToStep(n) {
  document.querySelectorAll('.step').forEach(function(s) { s.classList.remove('active'); });
  var target = (n === 'Result') ? document.getElementById('stepResult') : document.getElementById('step' + n);
  if (target) target.classList.add('active');
  var progressN = (n === 'Result') ? 5 : n;
  for (var i = 1; i <= 4; i++) {
    var dot = document.getElementById('ps' + i);
    if (!dot) continue;
    if (i < progressN)       dot.className = 'progress-step done';
    else if (i === progressN) dot.className = 'progress-step active';
    else                      dot.className = 'progress-step';
  }
  var modal = document.getElementById('finderModal');
  if (modal) modal.scrollTop = 0;
}

function selectOption(el, key, val) {
  var grid = el.closest('.option-grid');
  grid.querySelectorAll('.option-card').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
  finderAnswers[key] = val;
  if (key === 'use')    document.getElementById('next1').disabled = false;
  if (key === 'unload') document.getElementById('next2').disabled = false;
  if (key === 'freq')   document.getElementById('next4').disabled = false;
}

/* ── EQUIPMENT SEARCH ── */
function searchEquipment(q) {
  var box = document.getElementById('eqResults');
  if (!q || !q.trim()) { box.classList.remove('show'); return; }
  var lower = q.toLowerCase();
  var matches = [];
  for (var i = 0; i < equipmentDB.length; i++) {
    if (equipmentDB[i].name.toLowerCase().indexOf(lower) !== -1) {
      matches.push(equipmentDB[i]);
      if (matches.length >= 8) break;
    }
  }
  if (!matches.length) { box.classList.remove('show'); return; }
  var html = '';
  for (var j = 0; j < matches.length; j++) {
    var item = matches[j];
    html += '<div class="equipment-result-item" onclick="addEquipment(' + j + ',' + item.weight + ',\'' + encodeURIComponent(item.name) + '\')">';
    html += '<span>' + item.name + '</span>';
    html += '<span class="eq-weight">' + item.weight.toLocaleString() + ' lbs</span>';
    html += '</div>';
  }
  box.innerHTML = html;
  box.classList.add('show');
  box._matches = matches;
}

function addEquipment(idx, weight, encodedName) {
  var name = decodeURIComponent(encodedName);
  addedEquipment.push({ name: name, weight: weight });
  document.getElementById('eqSearch').value = '';
  document.getElementById('eqResults').classList.remove('show');
  renderEquipmentTags();
  updateWeightTotal();
}

function removeEquipment(i) {
  addedEquipment.splice(i, 1);
  renderEquipmentTags();
  updateWeightTotal();
}

function renderEquipmentTags() {
  var html = '';
  for (var i = 0; i < addedEquipment.length; i++) {
    html += '<div class="eq-tag">';
    html += addedEquipment[i].name + ' - ' + addedEquipment[i].weight.toLocaleString() + ' lbs';
    html += '<span class="remove" onclick="removeEquipment(' + i + ')">x</span>';
    html += '</div>';
  }
  document.getElementById('addedEquipment').innerHTML = html;
}

function updateWeightTotal() {
  var total = 0;
  for (var i = 0; i < addedEquipment.length; i++) { total += addedEquipment[i].weight; }
  var v1 = parseInt(document.getElementById('loadWeight').value, 10);
  var v2 = parseInt(document.getElementById('cargoWeight').value, 10);
  if (!isNaN(v1)) total += v1;
  if (!isNaN(v2)) total += v2;
  document.getElementById('totalWeight').textContent = total.toLocaleString() + ' lbs';
  document.getElementById('gvwrWarning').classList.toggle('show', total > 36000);
  finderAnswers.totalLbs = total;
}

/* ── RESULT ── */
function showResult() {
  var r = recommend(finderAnswers.use, finderAnswers.unload, finderAnswers.totalLbs || 0, finderAnswers.freq);
  var t = trailerDB[r.match];
  var displayName = t.sub ? (t.name + ' — ' + t.sub) : t.name;
  document.getElementById('resultName').textContent = displayName;
  document.getElementById('resultWhy').textContent  = r.why;
  document.getElementById('resultSpecs').innerHTML =
    '<div class="spec-item"><div class="spec-label">Category</div><div class="spec-value" style="font-size:15px;letter-spacing:0;line-height:1.3">' + t.category + '</div></div>' +
    '<div class="spec-item"><div class="spec-label">GVWR</div><div class="spec-value">' + t.gvwr + '</div></div>' +
    '<div class="spec-item"><div class="spec-label">Est. Payload</div><div class="spec-value">' + t.payload + '</div></div>';
  var altHtml = '';
  for (var i = 0; i < Math.min(r.alts.length, 3); i++) {
    var alt = trailerDB[r.alts[i]];
    var altLabel = alt.sub || alt.name;
    altHtml += '<div class="alt-pill" onclick="swapResult(\'' + r.alts[i] + '\')">' + altLabel + '</div>';
  }
  document.getElementById('altOptions').innerHTML = altHtml;

  /* Set direct model page link */
  var depth = (window.location.pathname.match(/\//g) || []).length;
  var base  = depth >= 3 ? '../' : '';
  var ll = document.getElementById('finderLearnLink');
  if (ll && trailerPageLinks[r.match]) {
    ll.href = base + trailerPageLinks[r.match];
    ll.textContent = 'View ' + t.name + ' →';
  }
  var dl = document.getElementById('finderDealerLink');
  if (dl) dl.href = base + 'find-a-dealer.html';

  goToStep('Result');
}

function swapResult(key) {
  var t = trailerDB[key];
  document.getElementById('resultName').textContent = t.sub ? (t.name + ' — ' + t.sub) : t.name;
  document.getElementById('resultSpecs').innerHTML =
    '<div class="spec-item"><div class="spec-label">Category</div><div class="spec-value" style="font-size:15px;letter-spacing:0;line-height:1.3">' + t.category + '</div></div>' +
    '<div class="spec-item"><div class="spec-label">GVWR</div><div class="spec-value">' + t.gvwr + '</div></div>' +
    '<div class="spec-item"><div class="spec-label">Est. Payload</div><div class="spec-value">' + t.payload + '</div></div>';
  /* Update view link for swapped result */
  var depth = (window.location.pathname.match(/\//g) || []).length;
  var base  = depth >= 3 ? '../' : '';
  var ll = document.getElementById('finderLearnLink');
  if (ll && trailerPageLinks[key]) {
    ll.href = base + trailerPageLinks[key];
    ll.textContent = 'View ' + t.name + ' →';
  }
}

function restartFinder() {
  finderAnswers = { use: null, unload: null, freq: null, totalLbs: 0 };
  addedEquipment = [];
  document.getElementById('addedEquipment').innerHTML = '';
  document.getElementById('eqSearch').value = '';
  document.getElementById('loadWeight').value = '';
  document.getElementById('cargoWeight').value = '';
  document.getElementById('totalWeight').textContent = '0 lbs';
  document.getElementById('gvwrWarning').classList.remove('show');
  document.querySelectorAll('.option-card').forEach(function(c) { c.classList.remove('selected'); });
  document.getElementById('next1').disabled = true;
  document.getElementById('next2').disabled = true;
  document.getElementById('next4').disabled = true;
  goToStep(1);
}

/* Trailer specific model page links */
var trailerPageLinks = {
  dump_light:    'dump-trailers/dhv207.html',
  dump_medium:   'dump-trailers/dho210.html',
  dump_heavy:    'dump-trailers/dho212.html',
  dump_deckover: 'dump-trailers/dho215.html',
  tmx:           'tilt-equipment/tmx107.html',
  tsx:           'tilt-equipment/tsx207.html',
  fbx:           'Gooseneck/fbx210.html',
  fbh:           'Gooseneck/fbh207.html',
  landscape:     'Landscape/mpr205.html'
};
