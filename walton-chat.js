/* Walton Trailers — Shared Chat Widget
   Include this script on pages that need the chat widget.
   The IIFE auto-detects page depth for correct relative URLs.
*/

(function() {
  /* ── Config ─────────────────────────────────── */
  var AI_ENDPOINT = ''; // e.g. 'https://walton-chat.YOUR-NAME.workers.dev'

  var chatOpen = false;
  var greeted  = false;
  var history  = []; /* conversation history for AI mode */

  /* Detect page depth for correct relative URLs
     GitHub Pages: /repo/subfolder/page.html = 3 slashes
                   /repo/page.html           = 2 slashes          */
  var depth = (window.location.pathname.match(/\//g) || []).length;
  var base  = depth >= 3 ? '../' : '';

  /* ── Knowledge Base ── */
  var PAGES = [
    { title:'Gooseneck Flatbeds',    url: base+'Gooseneck/gooseneck.html',
      tags:['gooseneck','flatbed','fbh','fbx','flat bed','flat-bed','goose neck','goosenecks'] },
    { title:'Dump Trailers',         url: base+'dump-trailers/dump-trailers.html',
      tags:['dump','dho','dhv','hydraulic dump','dumping','dump trailer'] },
    { title:'Tilt Deck Trailers',    url: base+'tilt-equipment/tilt-equipment.html',
      tags:['tilt','tsx','tmx','tilt deck','equipment trailer','tilt-deck','tilt trailers'] },
    { title:'Deckover Equipment',    url: base+'Deckover/deckover.html',
      tags:['deckover','deck-over','bde','wide load','deck over','deckover trailer'] },
    { title:'Landscape Trailers',    url: base+'Landscape/landscape.html',
      tags:['landscape','mpr','lawn','mowing','landscaping','grass','lawn care'] },
    { title:'About Walton Trailers', url: base+'about.html',
      tags:['about','company','history','who are you','founded','walton'] },
    { title:'Become a Dealer',       url: base+'become-a-dealer.html',
      tags:['become dealer','resell','partner','dealership','sell walton','dealer program'] },
    { title:'Careers',               url: base+'careers.html',
      tags:['job','career','hiring','work here','employment','position','apply'] },
    { title:'Video Guides',          url: base+'video-guides.html',
      tags:['video','watch','tutorial','how to','youtube'] }
  ];

  var FAQS = [
    { tags:['warranty','warrant','guarantee','lifetime'],
      answer:'Walton Trailers come with a <strong>Lifetime Structural Warranty</strong> on all models. Contact your local dealer for full warranty terms and claims.' },
    { tags:['price','cost','how much','pricing','quote','msrp','afford'],
      answer:'Pricing varies by model and options. Use the <strong>Get a Quote</strong> button on any product page and a dealer will follow up with current pricing.',
      link:{ text:'Browse Models', url: base+'index.html' } },
    { tags:['dealer','find dealer','near me','closest','local dealer','buy','purchase','where can i'],
      answer:'Walton Trailers are sold through an authorised dealer network across the United States. Use our dealer locator to find the closest one to you.',
      link:{ text:'Find a Dealer', url: base+'find-a-dealer.html' } },
    { tags:['gvwr','weight rating','capacity','payload','how much can','load','tow rating'],
      answer:'GVWR ranges from <strong>14,000 lbs</strong> on entry-level models up to <strong>40,000+ lbs</strong> on heavy-duty equipment trailers. Check each model page for exact specs.',
      link:{ text:'Browse Models', url: base+'index.html' } },
    { tags:['gooseneck vs bumper','bumper pull','difference between','which type','hitch type'],
      answer:'<strong>Gooseneck</strong> trailers mount in the truck bed for maximum stability and heavier payloads. <strong>Bumper pull</strong> trailers use a standard receiver hitch and work with most tow vehicles. Our buying guide explains it in detail.' },
    { tags:['financing','finance','loan','monthly payment','lease','credit'],
      answer:'Financing options are available through Walton dealer locations. Contact your nearest dealer to discuss rates and terms.',
      link:{ text:'Find a Dealer', url: base+'find-a-dealer.html' } },
    { tags:['made in','manufactured','built where','usa','american made','logan','utah'],
      answer:'Every Walton Trailer is <strong>designed and built in Logan, Utah, USA</strong> — American-made quality with over 50 years of experience.' },
    { tags:['color','colour','paint','customize','custom order','options','configuration','build your own'],
      answer:'Walton Trailers can be ordered in various configurations. Hit <strong>Build Your Own</strong> on any product page to explore options, or speak to a dealer about custom builds.' },
    { tags:['parts','accessories','replacement part','repair','service','maintenance','fix'],
      answer:'Genuine Walton parts and service are available through our dealer network. Contact your nearest dealer for parts orders or repair scheduling.',
      link:{ text:'Find a Dealer', url: base+'find-a-dealer.html' } },
    { tags:['owner manual','owners manual','manual','manual download'],
      answer:"Owner's manuals are available for download in our <strong>User Manuals</strong> section. Find your vendor and download the PDF.",
      link:{ text:'User Manuals', url: base+'user-manuals.html' } },
    { tags:['contact','call','phone','email','reach','message','talk','speak','help','support'],
      answer:"I'd be happy to connect you with our team. Fill out a quick message below and we'll get back to you as soon as possible.",
      action:'contact' },
    /* ── Product-specific FAQs ── */
    { tags:['landscape trailer','lawn trailer','mpr','mpr207','lawn care trailer','landscaping trailer'],
      answer:'The <strong>MPR Series</strong> Landscape Trailers are purpose-built for lawn care and landscaping equipment. They feature rear gate ramps and integrated tie-down rails.',
      link:{ text:'View Landscape Trailers', url: base+'Landscape/landscape.html' } },
    { tags:['dump trailer','dhv207','dhv208','hydraulic hoist','dump body','dumping trailer'],
      answer:'The <strong>DHO and DHV Series</strong> Dump Trailers feature heavy-duty hydraulic hoists rated for demanding work. Available in multiple lengths with scissor or cylinder lift.',
      link:{ text:'View Dump Trailers', url: base+'dump-trailers/dump-trailers.html' } },
    { tags:['tilt trailer','tsx207','tsx208','tilt equipment','tilt deck','full tilt','equipment loading'],
      answer:'Our <strong>TSX & TMX Series</strong> Tilt Deck Equipment Trailers feature a full-tilt deck — no ramps needed to load equipment. Great for skid steers, mini excavators, and heavy machinery.',
      link:{ text:'View Tilt Trailers', url: base+'tilt-equipment/tilt-equipment.html' } },
    { tags:['deckover','bde207','bde208','bde210','bde212','wide deck','no wheel wells','deckover trailer','deck over equipment'],
      answer:'The <strong>BDE Series</strong> Deckover Equipment Trailers offer a flush, full-width deck with no wheel wells — perfect for oversized equipment and wide loads.',
      link:{ text:'View Deckover Trailers', url: base+'Deckover/deckover.html' } },
    { tags:['gooseneck','fbh207','fbh208','fbh210','fbx210','fbx212','flatbed gooseneck','gooseneck flatbed','heavy hauling'],
      answer:'Our <strong>FBH and FBX Series</strong> Gooseneck Flatbeds connect in the truck bed for maximum stability and high payload capacity. Available from 14,000 to 40,000+ lbs GVWR.',
      link:{ text:'View Gooseneck Flatbeds', url: base+'Gooseneck/gooseneck.html' } },

    /* ── Common how-to / spec questions ── */
    { tags:['how long','length','deck length','trailer length','size','how big','dimensions','feet','foot'],
      answer:'Trailer lengths vary by model. Most models range from <strong>20 to 40 feet</strong> of deck length. Check the individual model page for exact specs, or ask a dealer about custom lengths.',
      link:{ text:'Browse All Models', url: base+'index.html' } },
    { tags:['axle','dual axle','tandem','triple axle','how many axles','axle configuration'],
      answer:'Walton Trailers are available with tandem (2-axle) and triple-axle configurations depending on the model and GVWR. Heavier loads require more axles for proper weight distribution.' },
    { tags:['electric brake','brake controller','trailer brake','brake','braking'],
      answer:'All Walton Trailers come equipped with <strong>electric trailer brakes</strong> on every axle. You\'ll need a compatible brake controller in your tow vehicle.' },
    { tags:['ramp','loading ramp','beaver tail','slide-in ramp','dovetail','dove tail'],
      answer:'Many Walton models feature built-in slide-in ramps or dovetail beavertails for easy loading. Check each product page for ramp specifications and ramp pocket details.' },
    { tags:['steel','tube steel','construction','material','frame','build quality','how are they built'],
      answer:'Walton Trailers use <strong>heavy-duty tube steel frames</strong>, fully welded cross-members, and treated lumber decking. Every trailer is built to commercial-grade standards in Logan, Utah.' },
    { tags:['coupler','hitch coupler','lunette ring','pintle','ball size','2 5/16','ball hitch'],
      answer:'Gooseneck models use a <strong>standard 2-5/16" ball</strong> coupler or a <strong>lunette ring</strong> for pintle hook setups depending on the configuration. Bumper pull models use a 2-5/16" ball.' },
    { tags:['tie down','chain tie','d-ring','stake pocket','cargo securement','strapping'],
      answer:'Walton Trailers include <strong>recessed D-rings and stake pockets</strong> along the deck for cargo securement. The number and placement vary by model — check the product spec page.' },
    { tags:['spare tire','spare','flat tire','tire','tires','rubber'],
      answer:'A spare tire mount is standard on most Walton models. Tire size varies by axle capacity — check the model page or ask your dealer about tire specs.' },
    { tags:['wiring','lights','7-pin','electrical','led lights','trailer lights','wiring harness'],
      answer:'All Walton Trailers use a <strong>7-pin trailer wiring harness</strong> with DOT-compliant LED lighting throughout. Plug-and-play with any standard 7-pin truck connection.' },
    { tags:['dovetail','dove tail','self-cleaning','loading angle','approach angle'],
      answer:'Many Walton models feature a <strong>self-cleaning dovetail</strong> to reduce the loading angle and make driving equipment on easier. Check individual model pages for dovetail specs.' },

    /* ── Buying / comparison questions ── */
    { tags:['which trailer','what trailer','best trailer','recommend','right trailer','help me pick','choose a trailer','which one should i'],
      answer:'The right trailer depends on your load type, weight, and how it will be towed. Here are the main categories:<br><br>&bull; <strong>Gooseneck Flatbeds</strong> — heavy hauling, stacks well behind pickup<br>&bull; <strong>Dump Trailers</strong> — bulk material hauling<br>&bull; <strong>Tilt Deck</strong> — equipment with no ramps needed<br>&bull; <strong>Deckover</strong> — wide/oversized equipment<br>&bull; <strong>Landscape</strong> — lawn care and lighter equipment<br><br>A dealer can walk you through the best fit for your needs.',
      link:{ text:'Find a Dealer', url: base+'find-a-dealer.html' } },
    { tags:['bumper pull vs gooseneck','fifth wheel vs gooseneck','difference','bumper pull','compared to','versus','vs gooseneck'],
      answer:'<strong>Gooseneck</strong> trailers hitch inside the truck bed over the rear axle — they handle heavier loads, are more stable, and can tow up to 40,000+ lbs. <strong>Bumper pull</strong> trailers use a standard receiver ball hitch and work with any tow vehicle, but are limited to lighter payloads. For work-duty use, most pros prefer gooseneck.' },
    { tags:['how much can i tow','towing capacity','can my truck pull','tow vehicle','truck requirement','what truck do i need'],
      answer:'Your truck\'s tow rating must exceed the trailer\'s <strong>GVWR</strong> (Gross Vehicle Weight Rating). Always check your truck manufacturer\'s towing specs. For gooseneck setups, you also need the payload capacity in the truck bed. A dealer can help match the right trailer to your truck.' },

    /* ── Dealer / purchase ── */
    { tags:['how do i buy','how to order','how to purchase','ordering process','buy online','can i order online','order direct'],
      answer:'Walton Trailers are sold exclusively through our <strong>authorized dealer network</strong> — not direct. Contact your nearest dealer to configure, price, and order your trailer.',
      link:{ text:'Find a Dealer', url: base+'find-a-dealer.html' } },
    { tags:['delivery','shipping','transport','can you deliver','delivery time','lead time','how long to get'],
      answer:'Delivery and lead times vary by dealer location and current inventory. Contact your local Walton dealer for availability and estimated delivery timelines.',
      link:{ text:'Find a Dealer', url: base+'find-a-dealer.html' } },
    { tags:['trade in','trade-in','trade my trailer','trade old trailer'],
      answer:'Trade-in options are handled by individual Walton dealers. Contact your nearest dealer to ask about current trade-in programs.' },

    /* ── Owner support ── */
    { tags:['owner manual','user manual','owners manual','manual download','pdf manual','operator manual'],
      answer:'Owner\'s manuals are available in our <strong>Owner Support Hub</strong>. Find your model and download the PDF manual there.',
      link:{ text:'Go to Owner Resources', url: base+'user-manuals.html' } },
    { tags:['warranty claim','file warranty','submit warranty','how to claim warranty','warranty process'],
      answer:'To file a warranty claim, head to our <strong>Owner Support Hub</strong> and complete the warranty claim form. Have your trailer VIN and purchase date ready.',
      link:{ text:'Submit Warranty Claim', url: base+'warranty.html' } },
    { tags:['video','how to video','watch','youtube','tutorial','how to use','how to maintain','maintenance video'],
      answer:'We have video guides covering maintenance, loading, and more. Check out our Video Guides page.',
      link:{ text:'Watch Video Guides', url: base+'video-guides.html' } },
    { tags:['service','repair','where to repair','service center','fix my trailer','near me repair'],
      answer:'Repairs and service are handled through the <strong>Walton dealer network</strong>. Find your nearest dealer for service scheduling and genuine parts.',
      link:{ text:'Find a Dealer', url: base+'find-a-dealer.html' } },

    /* ── Dealer-specific FAQs ── */
    { tags:['dealer program info','dealer program','authorized dealer','dealer support','dealer info'],
      answer:'The Walton dealer program gives you access to our full line of American-made commercial trailers, co-op marketing support, and factory training. Contact us to learn more.',
      link:{ text:'Dealer Info', url: base+'dealers.html' } },
    { tags:['become a dealer','become dealer','how to become dealer','dealer application','sell walton trailers','want to be a dealer'],
      answer:'Interested in carrying Walton Trailers at your location? Fill out our dealer inquiry form and our team will be in touch with program details.',
      link:{ text:'Become a Dealer', url: base+'become-a-dealer.html' } },
    { tags:['parts ordering','order parts','dealer parts','wholesale parts','dealer order','parts for dealers'],
      answer:'Authorized Walton dealers can order genuine replacement parts through the dealer portal or by contacting our dealer support team directly. Reach out and we\'ll connect you.',
      action:'contact' }
  ];

  /* ══════════════════════════════════════════
     SCORING — handles exact phrases, partial
     word stems, and single-word synonyms
  ══════════════════════════════════════════ */
  function score(input, tags) {
    var lower = input.toLowerCase(), s = 0;
    tags.forEach(function(tag) {
      if (lower.indexOf(tag) !== -1) {
        s += tag.split(' ').length * 2; // exact match = 2× word count
      } else {
        // partial stem match (handles plurals, -ing, -ed etc.)
        var words = tag.split(' ');
        var stem  = words.every(function(w) {
          return w.length > 3 && lower.indexOf(w.substring(0, w.length - 1)) !== -1;
        });
        if (stem) s += words.length;
      }
    });
    return s;
  }

  /* ══════════════════════════════════════════
     LOCAL RESPOND — keyword-based answer engine
  ══════════════════════════════════════════ */
  function respondLocal(input) {
    var lower = input.toLowerCase();

    /* Greetings */
    if (/^(hi|hello|hey|howdy|good morning|good afternoon|good evening|sup|yo|hiya)/.test(lower)) {
      return "Hey there! 👋 Happy to help. I can answer questions about trailers, specs, warranty, dealers, and more. What's on your mind?";
    }
    /* Thanks */
    if (/\b(thank|thanks|thx|appreciate|ty\b|ty!)/i.test(lower)) {
      return "You're welcome! Is there anything else I can help you with?";
    }

    /* FAQ scoring */
    var bestFaq = null, bestFaqScore = 0;
    FAQS.forEach(function(f) {
      var s = score(input, f.tags);
      if (s > bestFaqScore) { bestFaqScore = s; bestFaq = f; }
    });

    /* Page scoring */
    var hitPages = [];
    PAGES.forEach(function(p) {
      var s = score(input, p.tags);
      if (s > 0) hitPages.push({ p: p, s: s });
    });
    hitPages.sort(function(a,b){ return b.s - a.s; });

    if (bestFaqScore >= 2 && bestFaq) {
      var html = bestFaq.answer;
      if (bestFaq.link) html += '<br><br><a href="' + bestFaq.link.url + '">' + bestFaq.link.text + ' &rarr;</a>';
      if (bestFaq.action === 'contact') html += '<br><br><button class="chat-qr-btn" onclick="wcContact()" style="margin-top:4px">Send a Message</button>';
      return html;
    }
    if (hitPages.length) {
      var html = "Here's what I found on our site:";
      hitPages.slice(0,3).forEach(function(r) {
        html += '<br>&bull; <a href="' + r.p.url + '">' + r.p.title + '</a>';
      });
      return html;
    }
    return "I'm not sure about that one — but I'm happy to connect you with someone who can help.<br><br><button class=\"chat-qr-btn\" onclick=\"wcContact()\" style=\"margin-top:4px\">Send a Message</button>";
  }

  /* ══════════════════════════════════════════
     AI RESPOND — calls Cloudflare Worker proxy
     Only active when AI_ENDPOINT is configured
  ══════════════════════════════════════════ */
  function respondAI(input, callback) {
    history.push({ role: 'user', content: input });
    fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var raw = (data && data.reply) ? data.reply : respondLocal(input);
      var reply = sanitizeUntrustedHTML(raw);
      history.push({ role: 'assistant', content: reply });
      callback(reply);
    })
    .catch(function() { callback(respondLocal(input)); });
  }

  /* ══════════════════════════════════════════
     DISPATCH — routes to AI or local matcher
  ══════════════════════════════════════════ */
  function dispatch(input, callback) {
    if (AI_ENDPOINT) {
      respondAI(input, callback);
    } else {
      var delay = 500 + Math.random() * 400; // natural-feeling pause
      setTimeout(function() { callback(respondLocal(input)); }, delay);
    }
  }

  /* ══════════════════════════════════════════
     DOM HELPERS
  ══════════════════════════════════════════ */
  function msgs() { return document.getElementById('wcMsgs'); }

  /* User-supplied input is rendered as plain text (textContent) to prevent
     XSS. Bot replies render as HTML — local FAQ content is Walton-controlled;
     AI Worker replies are run through sanitizeUntrustedHTML() before reaching
     this function (see respondAI). */
  function addMsg(role, content) {
    var m = msgs(); if (!m) return;
    var d = document.createElement('div');
    d.className = 'chat-msg ' + role;
    var b = document.createElement('div');
    b.className = 'msg-bubble';
    if (role === 'user') {
      b.textContent = content;
    } else {
      b.innerHTML = content;
    }
    d.appendChild(b);
    m.appendChild(d);
    m.scrollTop = m.scrollHeight;
  }

  /* Defense-in-depth sanitizer for untrusted bot content (AI Worker replies).
     Removes <script>, <iframe>, <object>, <embed>, <form>, <style>, <link>,
     <meta>, every on* event handler, and javascript:/data:/vbscript: URLs. */
  function sanitizeUntrustedHTML(html) {
    if (typeof html !== 'string') return '';
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    var killTags = /^(script|style|iframe|object|embed|form|link|meta)$/i;
    function clean(node) {
      var kids = Array.prototype.slice.call(node.childNodes);
      for (var i = 0; i < kids.length; i++) {
        var c = kids[i];
        if (c.nodeType !== 1) continue;
        if (killTags.test(c.tagName)) {
          node.removeChild(c);
          continue;
        }
        var attrs = Array.prototype.slice.call(c.attributes);
        for (var j = 0; j < attrs.length; j++) {
          var n = attrs[j].name.toLowerCase();
          if (n.indexOf('on') === 0) c.removeAttribute(attrs[j].name);
          if ((n === 'href' || n === 'src' || n === 'action' || n === 'formaction') &&
              /^\s*(javascript|data|vbscript):/i.test(attrs[j].value)) {
            c.removeAttribute(attrs[j].name);
          }
        }
        clean(c);
      }
    }
    clean(tpl.content);
    return tpl.innerHTML;
  }

  function showTyping() {
    var m = msgs(); if (!m) return;
    var d = document.createElement('div');
    d.className = 'chat-msg bot';
    d.id = 'wc-typing';
    d.innerHTML = '<div class="msg-bubble msg-typing"><span></span><span></span><span></span></div>';
    m.appendChild(d);
    m.scrollTop = m.scrollHeight;
  }

  function hideTyping() {
    var t = document.getElementById('wc-typing');
    if (t) t.remove();
  }

  function hideQR() {
    var qr = document.getElementById('wcQR');
    if (qr) qr.style.display = 'none';
  }

  function handleInput(text) {
    hideQR();
    addMsg('user', text);
    showTyping();
    dispatch(text, function(reply) {
      hideTyping();
      addMsg('bot', reply);
    });
  }

  /* ══════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════ */
  window.wcToggle = function() {
    chatOpen = !chatOpen;
    var win = document.getElementById('wcWin');
    if (win) win.classList.toggle('open', chatOpen);
    if (chatOpen && !greeted) {
      greeted = true;
      showTyping();
      setTimeout(function() {
        hideTyping();
        addMsg('bot', 'Hi! Welcome to Walton Trailers. 👋<br><br>To point you in the right direction — which of these best describes you?');
        var qr = document.getElementById('wcQR');
        if (qr) qr.style.display = 'flex';
      }, 700);
    }
  };

  /* ── Audience picker — sets context and shows tailored quick replies ── */
  window.wcAudience = function(type) {
    hideQR();
    var qr = document.getElementById('wcQR');

    if (type === 'buyer') {
      addMsg('user', '🛒 Looking to buy');
      showTyping();
      setTimeout(function() {
        hideTyping();
        addMsg('bot', 'Great — let\'s find the right trailer for you! Here are some common starting points:');
        if (qr) {
          qr.innerHTML =
            '<button class="chat-qr-btn" onclick="wcQuick(\'What trailers do you offer?\')">What trailers do you offer?</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'What GVWR do I need?\')">What GVWR do I need?</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'Gooseneck vs bumper pull difference\')">Gooseneck vs bumper pull</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'Get a quote\')">Get a quote</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'Find a dealer near me\')">Find a dealer near me</button>';
          qr.style.display = 'flex';
        }
      }, 600);
    }

    else if (type === 'owner') {
      addMsg('user', '🔧 I\'m an owner');
      showTyping();
      setTimeout(function() {
        hideTyping();
        addMsg('bot', 'Welcome back! Here\'s what our owner support hub covers — what do you need?');
        if (qr) {
          qr.innerHTML =
            '<button class="chat-qr-btn" onclick="wcQuick(\'Download owner manual\')">Download my manual</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'Warranty info\')">Warranty info</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'How to file a warranty claim\')">File a warranty claim</button>' +
                        '<button class="chat-qr-btn" onclick="wcQuick(\'Parts and service\')">Parts &amp; service</button>';
          qr.style.display = 'flex';
        }
      }, 600);
    }

    else if (type === 'dealer') {
      addMsg('user', '🤝 I\'m a dealer');
      showTyping();
      setTimeout(function() {
        hideTyping();
        addMsg('bot', 'Thanks for being part of the Walton dealer network! What can I help you with?');
        if (qr) {
          qr.innerHTML =
            '<button class="chat-qr-btn" onclick="wcQuick(\'Dealer program info\')">Dealer program info</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'Become a dealer\')">Becoming a dealer</button>' +
            '<button class="chat-qr-btn" onclick="wcQuick(\'Parts ordering\')">Parts ordering</button>' +
            '<button class="chat-qr-btn" onclick="wcContact()">Contact the team</button>';
          qr.style.display = 'flex';
        }
      }, 600);
    }
  };

  window.wcQuick = function(text) { handleInput(text); };

  window.wcSend = function() {
    var inp = document.getElementById('wcInput');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    handleInput(text);
  };

  window.wcKey = function(e) { if (e.key === 'Enter') wcSend(); };

  window.wcContact = function() {
    var formHtml =
      'Fill this out and we\'ll get back to you shortly.' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' +
        '<input id="wc-name" placeholder="Your name" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:8px 10px;color:#f5f3ef;font-size:13px;font-family:inherit;outline:none;width:100%;box-sizing:border-box">' +
        '<input id="wc-email" type="email" placeholder="Email address" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:8px 10px;color:#f5f3ef;font-size:13px;font-family:inherit;outline:none;width:100%;box-sizing:border-box">' +
        '<textarea id="wc-msg" placeholder="Your message" rows="3" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:4px;padding:8px 10px;color:#f5f3ef;font-size:13px;font-family:inherit;outline:none;resize:none;width:100%;box-sizing:border-box"></textarea>' +
        '<button onclick="wcSubmit()" style="background:#c0392b;color:#f5f3ef;border:none;border-radius:2px;padding:10px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;font-family:inherit">Send Message</button>' +
      '</div>';
    addMsg('bot', formHtml);
  };

  window.wcSubmit = function() {
    var name  = (document.getElementById('wc-name')  || {}).value || '';
    var email = (document.getElementById('wc-email') || {}).value || '';
    var msg   = (document.getElementById('wc-msg')   || {}).value || '';
    if (!name.trim() || !email.trim()) {
      addMsg('bot', 'Please enter your name and email before sending.'); return;
    }
    fetch('https://formspree.io/f/xnjbrgoo', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email, message: msg, source: 'Chat Widget' })
    }).then(function(r) {
      if (r.ok) {
        addMsg('bot', '<strong>Message sent!</strong> &#10003;<br>Thanks, ' + name.split(' ')[0] + '! We\'ll be in touch soon.');
      } else {
        addMsg('bot', 'Something went wrong. Please email us directly at <a href="mailto:info@waltontrailers.com" style="color:#f5a623">info@waltontrailers.com</a>.');
      }
    }).catch(function() {
      addMsg('bot', 'Network error. Please try again or email <a href="mailto:info@waltontrailers.com" style="color:#f5a623">info@waltontrailers.com</a>.');
    });
  };
})();

