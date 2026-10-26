/* bench-fs.js: tap the header mark -> fullscreen chain visualisation (Danny 26 Oct 2026, t166u).
   TRANSITION, borrowed from Danny's own dashboard logo zoom (dad-page js/dad-mark-zoom.js + css/dad-mark-zoom.css):
     the view grows out of the small mark's own rectangle (FLIP: translate + scale from the mark's box to the target box) over
     PHI^-2 = 0.382 s on cubic-bezier(.2,.8,.2,1), while a black .82 backdrop fades in; black tile, #143A57 hairline, soft cyan glow;
     44 px round X (#1F5478 ring, #9DBCCE glyph, cyan on hover); closes on a tap, the X or Esc; focus stays on the X while open and
     returns to the mark; close runs the same transform in reverse. Mark press feedback: scale .94 over PHI^-3 = 0.236 s.
   ADDED for this page: real fullscreen (Fullscreen API, requested inside the tap) where supported; otherwise (iPhone Safari has no
   element fullscreen) the same fixed full-viewport overlay. Back gesture / back button closes (one history entry while open).
   PLAYBACK starts 0.5 s after the view is fully open (Danny), then loops: a cyan pulse runs Stage 1 > SR1/SR2 > SR3 > SRiso > plug gap,
   then the ~2 us re-strike re-fires at the gap end. Each stop shows its model value and, where readings exist (same localStorage via
   PlasmaBench.summary()), the measured value and deviation in the status colour. Timing on phi rungs: one hop PHI^-1 s, node flash
   PHI^-2 s, rest PHI^0 s between runs. Light: one canvas, one rAF loop only while open and visible, DPR capped at 2.
   Reduced motion: no zoom, no travel; the view opens at once with every stop lit (static). */
(function (root, doc) {
  'use strict';
  var btn = doc.getElementById('pb-zoom'); if (!btn || !root.PlasmaBench) return;
  var PHI = (1 + Math.sqrt(5)) / 2, D = Math.round(1000 * Math.pow(PHI, -2)), START = 500;
  var HOP = Math.pow(PHI, -1), FLASH = Math.pow(PHI, -2), REST = 1, RESTRIKE = Math.pow(PHI, -1);
  var rm = root.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var ov = doc.createElement('div'); ov.className = 'bfs'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Bench chain visualisation');
  ov.innerHTML = '<div class="bfs-fig"><canvas class="bfs-cv" aria-hidden="true"></canvas><p class="bfs-sr sr" aria-live="polite"></p>' +
    '<div class="bfs-cap"><b>Bench chain</b> · model vs measured · tap anywhere to close</div></div>' +
    '<button type="button" class="bfs-x" aria-label="Close visualisation">&times;</button>';
  doc.body.appendChild(ov);
  var fig = ov.querySelector('.bfs-fig'), cv = ov.querySelector('.bfs-cv'), x = ov.querySelector('.bfs-x'), sr = ov.querySelector('.bfs-sr');
  var open = false, closing = false, tm = 0, tStart = 0, raf = 0, t0 = 0, data = [], pushed = false, fsOn = false;
  var CC = PlasmaBench.colors || { none: '#2A3E4E', info: '#6A8CA4', green: '#00FF41', amber: '#F2A541', red: '#FF4D4D' };
  function mark() { return btn.querySelector('img') || btn; }
  function flip() { var a = mark().getBoundingClientRect(); fig.style.transition = 'none'; fig.style.transform = 'none';
    var b = fig.getBoundingClientRect(); if (!b.width || !a.width) return 'none';
    return 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px) scale(' + (a.width / b.width) + ',' + (a.height / b.height) + ')'; }
  // ---- fullscreen helpers (feature-detected; every call wrapped so an unsupported browser just keeps the overlay) ----
  function fsEl() { return doc.fullscreenElement || doc.webkitFullscreenElement || null; }
  function fsReq() { try { var f = ov.requestFullscreen || ov.webkitRequestFullscreen; if (f && (doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) { var p = f.call(ov, { navigationUI: 'hide' }); if (p && p.catch) p.catch(function () {}); } } catch (e) {} }
  function fsExit() { try { if (fsEl()) { var f = doc.exitFullscreen || doc.webkitExitFullscreen; var p = f && f.call(doc); if (p && p.catch) p.catch(function () {}); } } catch (e) {} }
  function onFs() { if (fsEl() === ov) { fsOn = true; size(); } else if (fsOn) { fsOn = false; if (open && !closing) close(true); } }
  doc.addEventListener('fullscreenchange', onFs); doc.addEventListener('webkitfullscreenchange', onFs);
  // ---- open / close ----
  function doOpen() {
    if (open) return; open = true; closing = false; clearTimeout(tm); cancelAnimationFrame(raf);
    data = PlasmaBench.summary(); describe();
    ov.hidden = false; ov.classList.remove('is-open', 'is-playing'); btn.setAttribute('aria-expanded', 'true'); size();
    fsReq();   // inside the tap: browsers only grant fullscreen to a user gesture
    try { history.pushState({ bfs: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
    if (rm.matches) { ov.classList.add('is-open'); fig.style.transform = 'none'; play(true); }
    else { var f = flip(); fig.style.transform = f; void fig.offsetWidth; fig.style.transition = '';
      requestAnimationFrame(function () { ov.classList.add('is-open'); fig.style.transform = 'none'; });
      tm = setTimeout(function () { size(); tm = setTimeout(function () { play(false); }, START); }, D); }   // fully open at D, playback +0.5 s
    x.focus({ preventScroll: true });
  }
  function close(fromFs) {
    if (!open || closing) return; closing = true; clearTimeout(tm); stop();
    if (!fromFs) fsExit();
    if (pushed) { pushed = false; try { if (history.state && history.state.bfs) history.back(); } catch (e) {} }
    ov.classList.remove('is-open', 'is-playing'); btn.setAttribute('aria-expanded', 'false');
    var done = function () { ov.hidden = true; fig.style.transform = ''; open = false; closing = false; btn.focus({ preventScroll: true }); };
    if (rm.matches) { done(); return; }
    // reverse once the page is back to its own size (leaving fullscreen resizes the viewport first)
    requestAnimationFrame(function () { var f = flip(); fig.style.transform = 'none'; void fig.offsetWidth; fig.style.transition = ''; fig.style.transform = f; tm = setTimeout(done, D); });
  }
  btn.addEventListener('click', function (e) { e.preventDefault(); doOpen(); });
  x.addEventListener('click', function (e) { e.stopPropagation(); close(false); });
  ov.addEventListener('click', function () { close(false); });
  addEventListener('popstate', function () { if (open && !closing) { pushed = false; close(false); } });
  doc.addEventListener('keydown', function (e) { if (!open) return;
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(false); } else if (e.key === 'Tab') { e.preventDefault(); x.focus({ preventScroll: true }); } }, true);
  doc.addEventListener('visibilitychange', function () { if (!open) return; if (doc.hidden) cancelAnimationFrame(raf); else if (ov.classList.contains('is-playing') && !rm.matches) loop(); });
  addEventListener('resize', function () { if (open) { size(); if (rm.matches || !raf) draw(-1); } });
  // ---- visualisation ----
  var W = 0, H = 0, dpr = 1, ctx = null, P = [];
  function size() { dpr = Math.min(2, root.devicePixelRatio || 1); W = fig.clientWidth || innerWidth; H = fig.clientHeight || innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); layout(); }
  function layout() {   // portrait: one column top to bottom; landscape: one row left to right
    var n = data.length || 6, land = W > H, padT = 64, padB = 40, padX = 16; P = [];
    for (var i = 0; i < n; i++) {
      if (land) { var cw = (W - padX * 2) / n; P.push({ x: padX + cw * (i + 0.5), y: padT + (H - padT - padB) / 2, w: cw * 0.88, h: Math.min((H - padT - padB) * 0.8, 200) }); }
      else { var ch = (H - padT - padB) / n; P.push({ x: W / 2, y: padT + ch * (i + 0.5), w: Math.min(W - padX * 2, 420), h: ch * 0.7 }); }
    }
  }
  function port(p) { return W > H ? { x: p.x, y: p.y + p.h / 2 } : { x: p.x - p.w / 2 + 3, y: p.y }; }
  function rr(x0, y0, w, h, r) { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r); ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r); ctx.closePath(); }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function text(s, x0, y0, font, col, max) { ctx.font = font; ctx.fillStyle = col; var t = String(s); if (max) while (t.length > 3 && ctx.measureText(t).width > max) t = t.slice(0, -2) + '…'; ctx.fillText(t, x0, y0); }
  // draw at time t (s since playback start); t < 0 = static frame with every stop lit
  function draw(t) {
    if (!ctx) return; ctx.clearRect(0, 0, W, H); var n = P.length, land = W > H, run = n * HOP + RESTRIKE + REST, ph = t < 0 ? -1 : t % run;
    // wire between stops
    ctx.strokeStyle = '#143A57'; ctx.lineWidth = 2; ctx.beginPath(); P.forEach(function (p, i) { var q = port(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke();
    var head = ph < 0 ? n : ph / HOP, mono = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace', body = '"Alegreya Sans",Helvetica,Arial,sans-serif';
    P.forEach(function (p, i) {
      var d = data[i] || {}, lit = ph < 0 || head >= i, since = ph < 0 ? 9 : ph - i * HOP, fl = since >= 0 && since < FLASH ? 1 - since / FLASH : 0;
      if (i === n - 1 && ph >= n * HOP && ph < n * HOP + RESTRIKE) fl = Math.max(fl, 1 - (ph - n * HOP) / RESTRIKE);   // re-strike re-fire
      var sc = CC[d.st] || CC.none, x0 = p.x - p.w / 2, y0 = p.y - p.h / 2;
      ctx.save(); if (fl > 0) { ctx.shadowColor = 'rgba(10,242,255,' + (0.9 * fl).toFixed(3) + ')'; ctx.shadowBlur = 24 * fl; }
      rr(x0, y0, p.w, p.h, Math.min(14, p.h / 4)); ctx.fillStyle = lit ? '#040E19' : '#020812'; ctx.fill();
      ctx.lineWidth = 1 + fl; ctx.strokeStyle = fl > 0 ? '#0AF2FF' : lit ? '#1F5478' : '#143A57'; ctx.stroke(); ctx.restore();
      ctx.fillStyle = sc; ctx.fillRect(x0 + 1, y0 + 6, 4, p.h - 12);   // status edge, same colours as the cards
      var tx = x0 + 14, mw = p.w - 20; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.globalAlpha = lit ? 1 : 0.45;
      var dv = d.dev != null ? (d.dev >= 0 ? '+' : '') + d.dev.toFixed(1) + '%' : '', L;
      if (land) L = [[d.name, 1], ['model ' + d.model, 0], [d.best ? 'best ' + d.best : '', 0], [d.measured ? 'meas. ' + d.measured : 'not measured yet', d.measured ? 2 : 3], [dv, 2]];
      else L = [[d.name, 1], ['model ' + d.model + (d.best ? ' · best ' + d.best : ''), 0], [d.measured ? 'measured ' + d.measured + (dv ? '  ' + dv : '') : 'not measured yet', d.measured ? 2 : 3]];
      var lh = Math.max(12, Math.min(18, p.h / (L.length + 0.9))), fs = Math.max(9, Math.round(Math.min(lh * (land ? 0.78 : 0.8), mw / (land ? 15 * 0.6 : 30 * 0.6)))), nf = Math.max(10, Math.round(Math.min(lh, mw / (land ? 12 * 0.5 : 24 * 0.5))));
      L.forEach(function (l, j) { if (!l[0]) return; var yy = y0 + lh * (0.95 + j * (land ? 1 : 1.05));
        if (l[1] === 1) text(l[0], tx, yy, '700 ' + nf + 'px ' + body, '#9DBCCE', mw);
        else text(l[0], tx, yy, (l[1] === 2 ? '700 ' : '') + fs + 'px ' + mono, l[1] === 2 ? sc : l[1] === 3 ? '#6A8CA4' : '#85A6BB', mw); });
      ctx.globalAlpha = 1;
    });
    // the travelling pulse (eased per hop) + a short trail
    if (ph >= 0 && ph < n * HOP) {
      var k = Math.min(n - 1, Math.floor(head)), f = head - k, a0 = port(P[Math.max(0, k)]), b0 = port(P[Math.min(n - 1, k + 1)]), e = ease(Math.min(1, f));
      var px = k >= n - 1 ? a0.x : a0.x + (b0.x - a0.x) * e, py = k >= n - 1 ? a0.y : a0.y + (b0.y - a0.y) * e;
      var g = ctx.createRadialGradient(px, py, 0, px, py, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(10,242,255,.95)'); g.addColorStop(1, 'rgba(10,242,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, 16, 0, 7); ctx.fill();
    }
    // header line
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    text('2SPI chain · Rev C model', 16, 30, '700 15px ' + body, '#9DBCCE', W - 90);
    var leg = [['green', 'within'], ['amber', 'near'], ['red', 'outside'], ['none', 'no reading']], lx = 16;
    ctx.font = '11px ' + mono; leg.forEach(function (l) { ctx.fillStyle = CC[l[0]]; ctx.fillRect(lx, 46, 8, 8); ctx.fillStyle = '#6A8CA4'; ctx.fillText(l[1], lx + 11, 50); lx += ctx.measureText(l[1]).width + 24; });
  }
  function loop() { cancelAnimationFrame(raf); var fn = function (ts) { if (!t0) t0 = ts; draw((ts - t0) / 1000); raf = requestAnimationFrame(fn); }; raf = requestAnimationFrame(fn); }
  function play(still) { if (!open || closing) return; size(); ov.classList.add('is-playing'); t0 = 0; if (still) draw(-1); else loop(); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function describe() { sr.textContent = data.map(function (d) { return d.name + ': model ' + d.model + (d.measured ? ', measured ' + d.measured + (d.dev != null ? ' (' + d.dev.toFixed(1) + '%)' : '') : ', not measured'); }).join('. '); }
  btn.setAttribute('aria-expanded', 'false');
  root.BenchFS = { open: doOpen, close: function () { close(false); }, isOpen: function () { return open; } };
})(window, document);
