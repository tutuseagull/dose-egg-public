/* ═══════════════════════════════════════════════════════════════════
   DoseEgg sheet handle: the ONE copy of how a sheet's grey handle behaves.
   Linked by Today, Look Back and the Medicine Cabinet:

     <script src="../sheet-handle.js" data-close="closeSheets"></script>

   data-close names the page's own close function, so each page keeps its own
   tidy-up (the Cabinet drops an empty form, Look Back re-renders).

   What the handle does (decided 2026-10-23, after Tutu found it did nothing):
     · TAP closes the sheet. This is the main path: one tap, no gesture.
     · DRAG DOWN follows the finger and closes past 80px or on a quick flick;
       a short drag springs back. The drag is a bonus, never the only way out:
       sustained drags are hard with tremor or rigidity (Nunes et al. 2016, DG5).
     · Enter or Space closes it from a keyboard. Escape and the scrim still work.
   Its styling (bigger hit area, no pull-to-refresh) lives in motion.css.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  const closeName = document.currentScript.dataset.close;
  const CLOSE_AT = 80;     /* px dragged before letting go closes the sheet */
  const FLICK = 0.5;       /* px per ms: a quick flick closes even if short */
  const TAP = 6;           /* px: anything smaller is a tap, not a drag */

  function closeSheet() { if (typeof window[closeName] === 'function') window[closeName](); }

  /* the handle is announced as a button, so a screen reader can find the way out */
  function label() {
    document.querySelectorAll('.sheet .pull').forEach(p => {
      p.setAttribute('role', 'button');
      p.setAttribute('aria-label', 'Close');
      p.tabIndex = 0;
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', label);
  else label();

  document.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.closest && ev.target.closest('.sheet.open .pull')) {
      ev.preventDefault(); closeSheet();
    }
  });

  document.addEventListener('pointerdown', ev => {
    const pull = ev.target.closest && ev.target.closest('.sheet.open .pull');
    if (!pull) return;
    const sheet = pull.closest('.sheet');
    ev.preventDefault();                       /* no text selection, no page scroll */
    pull.setPointerCapture(ev.pointerId);
    const y0 = ev.clientY, t0 = ev.timeStamp;
    let dy = 0;
    sheet.style.transition = 'none';           /* follow the finger exactly */

    function move(e) {
      dy = Math.max(0, e.clientY - y0);        /* down only; up does nothing */
      sheet.style.transform = `translate(-50%, ${dy}px)`;
    }
    function end(e) {
      pull.removeEventListener('pointermove', move);
      pull.removeEventListener('pointerup', end);
      pull.removeEventListener('pointercancel', end);
      const speed = dy / Math.max(1, e.timeStamp - t0);
      const shouldClose = e.type !== 'pointercancel' &&
                          (dy < TAP || dy > CLOSE_AT || speed > FLICK);
      sheet.style.transition = '';             /* hand back to the page's settle curve */
      if (shouldClose) closeSheet();           /* the sheet animates on from where the finger left it */
      sheet.style.transform = '';
    }
    pull.addEventListener('pointermove', move);
    pull.addEventListener('pointerup', end);
    pull.addEventListener('pointercancel', end);
  });
})();
