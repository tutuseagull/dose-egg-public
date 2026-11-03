/* ═══════════════════════════════════════════════════════════════════
   DoseEgg clock display: the ONE copy of the 12 / 24-hour rule.
   Decided 2026-11-03 (Tutu): times follow the phone's own setting, everywhere.
   A US phone set to 12-hour reads "2:30 PM"; a 24-hour phone reads "14:30".

   How, in the prototypes: the pages write every time as 24-hour "HH:MM",
   which keeps the data and the arithmetic simple. This file rewrites what is
   SHOWN, after each render, when the phone uses a 12-hour clock. The data never
   changes. Time fields (<input type="time">) are the platform's own control and
   already follow the phone, so they are left alone, as are text fields.
   A real app formats at the source instead; this is the prototype's shortcut.

   Review override: add ?clock=12 or ?clock=24 to the address.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  const force = (location.search.match(/[?&]clock=(12|24)\b/) || [])[1];
  const sys = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
  const twelve = force ? force === '12' : (sys === 'h11' || sys === 'h12');
  document.documentElement.dataset.clock = twelve ? '12' : '24';
  if (!twelve) return;                         /* 24-hour phone: nothing to change */

  const fmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  const show = (h, m) => fmt.format(new Date(2000, 0, 1, +h, +m));
  /* "14:30" but not "2:30 PM" again, not part of "07:30:15" or a date */
  const RX = /\b([01]\d|2[0-3]):([0-5]\d)\b(?!\s?[AaPp]\.?[Mm])(?!:\d)/g;
  const HAS = new RegExp(RX.source);           /* non-global: .test() keeps no state between nodes */
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

  function fix(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && !SKIP.has(n.parentElement.tagName) &&
                        !n.parentElement.closest('[data-clock-skip]') && HAS.test(n.nodeValue))
                        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const hits = []; let n; while ((n = w.nextNode())) hits.push(n);
    hits.forEach(t => { RX.lastIndex = 0; t.nodeValue = t.nodeValue.replace(RX, (_, h, m) => show(h, m)); });
    /* aria-labels say times too */
    root.querySelectorAll && root.querySelectorAll('[aria-label]').forEach(e => {
      const v = e.getAttribute('aria-label');
      if (HAS.test(v)) { RX.lastIndex = 0; e.setAttribute('aria-label', v.replace(RX, (_, h, m) => show(h, m))); }
    });
  }
  const start = () => {
    fix(document.body);
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'characterData') { const p = m.target.parentElement; if (p) fix(p); }
      else m.addedNodes.forEach(a => fix(a.nodeType === 1 ? a : a.parentElement || document.body));
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
