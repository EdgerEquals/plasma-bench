/* VORTEX STARS (Danny 16:07 AWST 26 Oct 2026). The four grey falling-star streaks (.rain i in index.html) keep their look; this
   module adds a shimmer (the Sun's soft glow at the head + the travelling sheen used on the footer) and replaces their
   straight fall with a vortex: each spirals down its diagonal axis (js/phi-axes.js frame, ratios along/across A or B) on a golden
   logarithmic spiral, big at the top and tightening (half a turn per PHI rung of shrink) toward a near-singular point, where it pops
   (one PHI-sized flash) and fizzles (flicker decay), then respawns off the top on a golden-sequence lane. Nose along the path.
   Adopted per streak at the end of its current CSS pass (off-screen), so nothing jumps. Idle tier, one capped rAF loop, transforms +
   opacity only, paused while hidden or paused, nothing under reduced motion (the CSS fall stays). */
(function () {
  'use strict';
  var doc = document, root = window, R = doc.querySelector('.rain');
  if (!R || (root.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var PHI = (1 + Math.sqrt(5)) / 2, IP = 1 / PHI, TAU = 2 * Math.PI, MS = 1e3;   // phi; unit: a turn, ms per s
  var LP = Math.log(PHI);
  var DESC = Math.pow(PHI, 5), POP = Math.pow(IP, 1), FIZ = Math.pow(PHI, 0), REST = Math.pow(IP, 2);   // phi: descent PHI^5 s (the old rain period), pop PHI^-1 s, fizzle 1 s, rest PHI^-2 of a descent
  var R0 = Math.pow(IP, 3), WEND = Math.pow(IP, 5), SEND = Math.pow(IP, 3);   // phi: spiral radius PHI^-3 of a half-diagonal at the top, shrinks to PHI^-5 of that; length ends at PHI^-3
  var css = '.rain i.vx{left:0;top:0;transform-origin:50% 100%;animation:none;will-change:transform,opacity}' +   // unit: pivot at the head (bottom centre)
    '.rain i.vx::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(to bottom,transparent 38.2%,rgba(255,255,255,.618) 50%,transparent 61.8%);' +   // phi: sheen stops 38.2 / 50 / 61.8 percent, white at PHI^-1
      'background-size:100% 261.8%;animation:vxShim var(--vs) ease-in-out infinite alternate}' +   // phi: sheen band PHI^-1 .. PHI^-2 stops, travel PHI^2 of the bar
    '.rain i.vx::before{content:"";position:absolute;left:50%;bottom:0;width:261.8%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,50%);' +   // phi: glow 261.8% = PHI^2 of the width; unit: 50% centring, circle
      'background:radial-gradient(circle closest-side,rgba(255,255,255,.618),rgba(255,215,0,.236),transparent);opacity:var(--vg,.382)}' +   // phi: head glow PHI^2 x the width, Sun glow colours
    '@keyframes vxShim{from{background-position:0 100%}to{background-position:0 0}}';   // unit: sheen from the tail to the head
  var st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
  R.style.setProperty('--vs', PHI + 's');                                   // phi: one shimmer pass per PHI s
  var pump = null;
  function k() { var P = root.PhiPumps; if (P && !pump) pump = P.node('vortex', 3, 5, Math.pow(IP, 4), P.page, 55); try { return pump ? pump.out() : 1; } catch (e) { return 1; } }   // phi: 3 pumps, rungs 5.., depth PHI^-4
  var S = Array.prototype.map.call(R.querySelectorAll('i'), function (e, i) { return { e: e, i: i, on: false, t0: 0, n: i, w: 0, h: 0 }; });
  function lane(s) {                                                     // golden-sequence lane, axis and turn direction per descent
    var g = (s.n + 1) * IP; g -= Math.floor(g);
    s.ax = s.n % 2;                                                      // unit: even descents ride A, odd ride B
    s.across = (2 * g - 1) * Math.pow(IP, 2);                            // phi: lane offset across the axis, within PHI^-2
    s.th0 = TAU * g; s.dir = g < IP ? 1 : -1; s.D = DESC * k();           // phi: golden split of the turn direction
  }
  function size(s) { s.w = s.e.offsetWidth || 1; s.h = s.e.offsetHeight || 1; }   // unit: measured box, on adopt + frame change
  function ab(s, u) {                                                    // axis coordinates of the head at descent fraction u
    var along = -1 - Math.pow(IP, 3) + (1 + Math.pow(IP, 3) + Math.pow(IP, 2)) * u * u;   // phi: from just past the top corner to PHI^-2 past the centre, accelerating
    var w = 1 - u * (1 - WEND), r = R0 * w, th = s.th0 + s.dir * Math.PI * Math.log(1 / w) / LP;   // golden log spiral: half a turn per PHI rung of shrink
    var p = along + r * Math.cos(th), q = s.across + r * Math.sin(th);
    return s.ax ? { a: q, b: p, w: w } : { a: p, b: q, w: w };
  }
  function place(s, now) {
    var A = root.PhiAxes; if (!A) return;
    var t = (now - s.t0) / MS, D = s.D, e = s.e.style;
    if (t < D) {
      var u = t / D, c = ab(s, u), d = ab(s, Math.min(1, u + Math.pow(IP, 8))), P = A.at(c.a, c.b), Q = A.at(d.a, d.b);   // phi: look-ahead step for the heading
      var rot = Math.atan2(Q.y - P.y, Q.x - P.x) - Math.PI / 2, sc = SEND + (1 - SEND) * Math.pow(c.w, IP);   // unit: element's +y is its nose; phi: length shrinks with the spiral
      e.transform = 'translate3d(' + (P.x - s.w / 2) + 'px,' + (P.y - s.h) + 'px,0) rotate(' + rot + 'rad) scale(' + Math.sqrt(sc) + ',' + sc + ')';   // unit: head on the point
      e.opacity = 1; e.setProperty('--vg', Math.pow(IP, 2) + (IP - Math.pow(IP, 2)) * (1 - c.w)); s.last = P; s.rot = rot; return;   // phi: glow grows as it tightens
    }
    var v = t - D, P0 = s.last || A.at(0, 0);
    if (v < POP) { var f = v / POP, ps = SEND * (1 + (PHI - 1) * Math.sin(Math.PI * f));   // phi: one PHI-sized flash
      e.transform = 'translate3d(' + (P0.x - s.w / 2) + 'px,' + (P0.y - s.h) + 'px,0) rotate(' + (s.rot || 0) + 'rad) scale(' + ps + ')'; e.opacity = 1; e.setProperty('--vg', 1); return; }
    v -= POP;
    if (v < FIZ) { var g = v / FIZ; e.opacity = Math.pow(1 - g, PHI) * (1 / 2 + Math.sin(TAU * Math.pow(PHI, 4) * g) / 2); e.setProperty('--vg', IP * (1 - g)); return; }   // phi: flicker PHI^4 per second, decays
    e.opacity = 0;
    if (v - FIZ > REST * s.D) { s.n += S.length; lane(s); s.t0 = now; }   // respawn on the next golden lane
  }
  var raf = 0, last = 0, FRAME = MS * Math.pow(IP, 7);                  // phi: frame cap PHI^-7 s
  function tick(now) { raf = 0; if (doc.hidden) return; if (now - last >= FRAME && !doc.body.classList.contains('paused')) { last = now; S.forEach(function (s) { if (s.on) place(s, now); }); } raf = requestAnimationFrame(tick); }
  function go() { if (!raf && !doc.hidden) raf = requestAnimationFrame(tick); }
  function adopt(s) { if (s.on) return; s.on = true; s.e.classList.add('vx'); size(s); lane(s); s.t0 = performance.now(); go(); }
  S.forEach(function (s) { s.e.addEventListener('animationiteration', function () { adopt(s); }, { once: true }); });
  setTimeout(function () { S.forEach(adopt); }, DESC * MS * PHI);       // phi: fallback if an iteration event never fires (paused CSS)
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) { var n = performance.now(); S.forEach(function (s) { if (s.on) s.t0 = n - Math.min(n - s.t0, s.D); }); go(); } });
  if (root.PhiAxes) PhiAxes.on(function () { S.forEach(size); });
  root.VortexStars = { info: function () { return { streaks: S.length, adopted: S.filter(function (s) { return s.on; }).length, descent: DESC }; } };
})();
