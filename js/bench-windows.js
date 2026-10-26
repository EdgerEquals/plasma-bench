/* bench-windows.js: the content window's portrait-fit sizing, taken from the dashboard's js/home-windows.js (fit fix, 26 Oct) with the
   six home windows removed. What it keeps:
     THE SCROLL REGION: html/body stay overflow:hidden; #home-main becomes a fixed box from the header's bottom to the footer's top
       (measured, safe areas included) and scrolls inside, its own bar hidden. Header and footer stay put.
     FIT: every box is border-box and never wider than its container; portrait is ONE column of the measured content width (bench
       cards carry inputs, so the dashboard's two-column portrait rule becomes one column); landscape auto-fills on a phi-rung minimum.
     UNIT: --hw-u = the box's short side x PHI^-1 in portrait (the dashboard's fit2 start rung), larger of h x PHI^-1 and w x PHI^-2
       in landscape. Gaps and paddings are phi rungs of it. Text is the reader's own size and never shrinks.
   Re-fit on resize, rotation, visualViewport changes, font load and header/footer size changes. Tier 1 (after first paint). */
(function (root, doc) {
  'use strict';
  var PHI = (1 + Math.sqrt(5)) / 2;
  function r(n) { return +Math.pow(PHI, n).toFixed(4); }
  var main = doc.getElementById('home-main'); if (!main) return;
  var U = 'var(--hw-u,min(100vw,100svh * ' + r(-1) + '))', G = 'calc(' + U + ' * ' + r(-6) + ')';
  function u(n) { return 'calc(' + U + ' * ' + r(n) + ')'; }
  var css =
    '#home-main{position:fixed;left:0;right:0;top:var(--hm-top,0px);height:var(--hm-h,100svh);max-width:none;margin:0;box-sizing:border-box;' +
      'padding:' + u(-6) + ' max(env(safe-area-inset-right,0px),calc((100% - min(100%,860px)) / 2 + ' + u(-5) + ')) ' + u(-3) + ' max(env(safe-area-inset-left,0px),calc((100% - min(100%,860px)) / 2 + ' + u(-5) + '));' +
      'overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:none;touch-action:pan-y}' +
    '#home-main::-webkit-scrollbar{display:none}' +
    '.hw,.hw-w{box-sizing:border-box;max-width:100%;min-width:0}' +
    '.hw{position:relative;z-index:1;display:grid;gap:' + G + ';margin:0 auto ' + G + ';width:100%;' +
      'grid-template-columns:repeat(auto-fill,minmax(min(100%,' + r(8) + 'rem),1fr))}' +
    '@media (orientation:portrait){.hw{grid-template-columns:minmax(0,1fr)}}' +
    '.hw-w{position:relative;width:100%;padding:' + u(-6) + ';border-radius:' + u(-6) + ';overflow:hidden;overflow-wrap:anywhere}' +
    '.pb-gap{height:' + G + '}';
  var st = doc.createElement('style'); st.id = 'bench-windows-css'; st.textContent = css; doc.head.appendChild(st);
  var de = doc.documentElement, hd = doc.getElementById('q-head'), ft = doc.querySelector('.foot'), fq = 0;
  function fit() {
    fq = 0;
    var top = hd ? Math.max(0, hd.getBoundingClientRect().bottom) : 0, bot = ft ? ft.getBoundingClientRect().top : innerHeight;
    var w = de.clientWidth, h = Math.max(0, bot - top), portrait = de.clientWidth <= innerHeight;
    var uu = portrait ? Math.min(w, h) / PHI : Math.max(h / PHI, w * Math.pow(PHI, -2));
    de.style.setProperty('--hm-top', top + 'px'); de.style.setProperty('--hm-h', h + 'px'); de.style.setProperty('--hw-u', uu + 'px');
  }
  function soon() { if (!fq) fq = requestAnimationFrame(fit); }
  fit(); addEventListener('resize', soon); addEventListener('orientationchange', soon);
  if (root.visualViewport) visualViewport.addEventListener('resize', soon);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(soon);
  if (root.ResizeObserver) { var ro = new ResizeObserver(soon); if (hd) ro.observe(hd); if (ft) ro.observe(ft); }
  root.BenchFit = { fit: fit, soon: soon };
})(window, document);
