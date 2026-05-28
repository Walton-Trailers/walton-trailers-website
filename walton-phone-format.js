/**
 * walton-phone-format.js
 *
 * Auto-formats US phone numbers as the user types: 5551234567 → (555) 123-4567.
 * Loaded site-wide so every <input type="tel"> gets the same behaviour without
 * having to remember to wire it up on each form.
 *
 * Catches inputs that exist at DOMContentLoaded plus anything added later (e.g.
 * modal forms that get rendered on demand) via a MutationObserver.
 *
 * Behaviour:
 *   - Strips non-digits and keeps at most 10 digits (US format only).
 *   - Reformats progressively: "5"          → "(5"
 *                              "555"        → "(555)"
 *                              "5551"       → "(555) 1"
 *                              "5551234567" → "(555) 123-4567"
 *   - Sets input.dataset.formatted = "1" the first time so we don't double-bind.
 *   - Updates the caret to the end of the formatted string (matches what users
 *     expect when they paste a full number).
 */
(function () {
  function formatDigits(digits) {
    digits = digits.slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length < 4) return "(" + digits;
    if (digits.length < 7) return "(" + digits.slice(0, 3) + ") " + digits.slice(3);
    return "(" + digits.slice(0, 3) + ") " + digits.slice(3, 6) + "-" + digits.slice(6);
  }

  function bind(input) {
    if (!input || input.dataset.formatted === "1") return;
    input.dataset.formatted = "1";

    function onInput() {
      var digits = (input.value || "").replace(/\D+/g, "");
      var formatted = formatDigits(digits);
      if (input.value !== formatted) {
        input.value = formatted;
        // Caret to end — simplest behaviour that works for both typing and paste.
        try { input.setSelectionRange(formatted.length, formatted.length); } catch (e) { /* some input types don't support selection */ }
      }
    }

    input.addEventListener("input", onInput);
    // Format any pre-populated value (e.g. a server-rendered default).
    if (input.value) onInput();
  }

  function bindAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll('input[type="tel"]');
    for (var i = 0; i < nodes.length; i++) bind(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bindAll(document); });
  } else {
    bindAll(document);
  }

  // Watch for inputs added later (modal forms, dynamically built UIs).
  var mo = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      for (var j = 0; j < m.addedNodes.length; j++) {
        var n = m.addedNodes[j];
        if (n.nodeType !== 1) continue;
        if (n.matches && n.matches('input[type="tel"]')) bind(n);
        else if (n.querySelectorAll) bindAll(n);
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
