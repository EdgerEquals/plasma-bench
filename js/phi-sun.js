/* SHARED SUN ANCHOR + SKY CONSTANTS (rule 13, Danny 12:34 AWST 26 Oct 2026). Loaded sync in <head> (tiny). ONE anchor for every orbit and
   sweep: window.PhiSun. Position = phi-ratio of the viewport, top right: x = 1 - PHI^-xk, y = PHI^-k (from the top). Moving them moves everything.
   15:22 (Danny 26 Oct): the Sun took the big Earth's corner, so x moved one rung out (xk = 5). The video loop still renders its Sun at k
   (tools/render-saturn-loop.py reads k), so PhiSun.video keeps that ratio for the video's object-position (--vsun-x/--vsun-y): the video's
   small Sun then sits under the big Sun glyph. A re-render with xk would put both on one point again.
   The block between the SKY markers is JSON (plus // comments) and is ALSO read by tools/render-saturn-loop.py, so the video loop and the emoji layers
   share these numbers instead of copying them. cite: AU values from the NSSDC Saturn and Uranus fact sheets (J2000 mean elements). */
(function () {
  'use strict';
  var C = /*SKY*/{
    "k": 4,                           // phi: rung exponent of the Sun position (y; and x in the video render)
    "xk": 5,                          // phi: rung exponent of the page Sun's x (15:22: the big Earth's old corner, a little toward the centre)
    "loopSec": 8,                     // anchor: the video loop length (media/space-loop.webm, 8 s)
    "sweepExp": -3,                   // phi: Saturn crosses in LOOP * PHI**-3 (Danny 12:34)
    "spinTurnsExp": 3,                // phi: band turns per pass = PHI**3
    "saturnAU": 9.53707032,           // cite: NSSDC Saturn fact sheet, semimajor axis (AU, J2000)
    "uranusAU": 19.19126393,          // cite: NSSDC Uranus fact sheet, semimajor axis (AU, J2000)
    "saturnEqKm": 60268,               // cite: NSSDC Saturn fact sheet, equatorial radius (km)
    "uranusEqKm": 25559,               // cite: NSSDC Uranus fact sheet, equatorial radius (km)
    "uranusObliquityDeg": 97.77       // cite: NSSDC Uranus fact sheet, obliquity to orbit (deg)
  }/*SKY*/;
  var PHI = (1 + Math.sqrt(5)) / 2;                                      // phi: the golden ratio
  var S = { k: C.k, x: 1 - Math.pow(PHI, -(C.xk || C.k)), y: Math.pow(PHI, -C.k), sky: C,
    video: { x: 1 - Math.pow(PHI, -C.k), y: Math.pow(PHI, -C.k) },     // rule 13: where the video loop draws its Sun (its own frame ratio)
    loop: C.loopSec, sweep: C.loopSec * Math.pow(PHI, C.sweepExp),
    kepler: Math.pow(C.uranusAU / C.saturnAU, 3 / 2),   // cite: Kepler III, period ratio = (semimajor ratio)^(3/2)
    px: function () { return { x: S.x * innerWidth, y: S.y * innerHeight }; } };
  try { var r = document.documentElement.style; r.setProperty('--sun-x', String(S.x)); r.setProperty('--sun-y', String(S.y)); r.setProperty('--vsun-x', String(S.video.x)); r.setProperty('--vsun-y', String(S.video.y)); } catch (e) {}
  window.PhiSun = S;
})();
