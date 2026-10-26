/* PHI TIMING (shared module, copied from the dashboard's inline phi-timing block for the Plasma Ignition Test Bench).
   Standing rules: /home/box/.config/phi-timing-rules.md and /home/box/.config/adaptive-phi-principle.md (Danny). Summary:
   1. PHI = 1.6180339887; every timed interval is PHI^n seconds. Fast elements make small moves, slow ones big moves.
   2. Start offsets: element k (fixed order below) starts at period * frac(k * 0.6180339887), the golden angle.
      CSS uses a negative animation-delay (var(--phi-NAME-d)) so nothing waits blank on load.
   3. Base ladder slots by role: blinks PHI^2, slow glow PHI^5, rain PHI^5, slow drift PHI^8/9.
   4. "Fast palette" elements (status lights, cursor) run 1.5 phi steps faster: period = slot * PHI^-1.5.
   5. Weather sweep hook kept (setWeather), but this page has no weather feed, so s = 0 (rule 6: no weather data, s = 0).
      Preview override: ?weather=hot|sun|storm|cloud|rain|fog|night|deep.
   6. Message-status layer kept as an API (setMsg) but unused here: the bench has no messages.
   Functional timers (save debounce, fit pass) are not animations. Reduced motion is respected. */
(function(root){
  "use strict";
  var PHI = 1.6180339887, G = 0.6180339887, SIM = Math.pow(PHI, -1.5);
  var E = [
    // [name, base-ladder exponent, fast palette (x PHI^-1.5)?, weather loop (never swept)?]  ORDER IS THE k NUMBERING: append, never reorder.
    ["light-a",2,1],["light-b",2,1],["light-c",2,1],["light-d",2,1],["cursor",2,1],
    ["status",2,1],["status-warn",1,1],["status-bad",0,1],
    ["card-glow",5,0],["chain-pulse",4,0],["mark-breathe",5,0],
    ["rain",5,0],["code-panel",9,1],["bg-pulse",5,0]
  ];
  var T = {}, list = [];
  E.forEach(function(e, i){
    var k = i + 1, n = e[2] ? e[1] - 1.5 : e[1], s = Math.pow(PHI, n), f = (k * G) % 1;
    T[e[0]] = {k:k, n:n, fast:!!e[2], weather:!!e[3], base:s, frac:f};
    list.push(e[0]);
  });
  var SWEEP = {hot:-1, sun:-0.5, storm:0, cloud:0, rain:0.5, fog:1, night:1.5, deep:2};
  var MSG = {idle:5, "new":3, dad:2, urgent:1};
  var sw = 0, msgState = null, msgForced = null, wxForced = null, retimeN = 0;   // retimeN: animations waiting for a period change at their next loop
  var RM = (typeof window !== "undefined" && window.matchMedia) ? window.matchMedia("(prefers-reduced-motion: reduce)") : {matches:false};
  try{ var q = new URLSearchParams(location.search); wxForced = q.get("weather"); if(!(wxForced in SWEEP)) wxForced = null;
    msgForced = q.get("msg"); if(!(msgForced in MSG)) msgForced = null; }catch(e){}
  function g(name){ var t = T[name]; if(!t) throw new Error("phi-timing: unknown element " + name); return t; }
  function shift(t){ return (t.weather || RM.matches) ? 0 : sw; }
  function per(name){ var t = g(name); return t.base * Math.pow(PHI, shift(t)); }
  function perthHour(){ try{ return +new Date().toLocaleString("en-AU", {timeZone:"Australia/Perth", hour:"2-digit", hour12:false}) % 24; }catch(e){ return new Date().getHours(); } }
  var weatherKey = null;   // last weather mood the page reported (null = no weather state on this page)
  function sweepFor(key){ if(wxForced) return SWEEP[wxForced];   // ?weather= preview wins exactly (use ?weather=deep for deep night)
    if(key == null) return 0; var h = perthHour(); if(h >= 0 && h < 5) key = "deep"; return SWEEP[key] || 0; }
  var api = {
    PHI:PHI, list:list, SWEEP:SWEEP, MSG:MSG,
    s:per, ms:function(n){ return Math.round(per(n) * 1000); },
    base:function(n){ return g(n).base; },
    off:function(n){ return per(n) * g(n).frac; }, offMs:function(n){ return Math.round(api.off(n) * 1000); },
    info:function(n){ var t = g(n); return {k:t.k, n:t.n, fast:t.fast, weather:t.weather, base:t.base, s:per(n), off:api.off(n), shift:shift(t)}; },
    sweep:function(){ return RM.matches ? 0 : sw; },
    // repeating timer: first tick at the golden-angle offset, then one per period; re-reads the period every cycle,
    // so a new sweep lands at the next cycle boundary. returns {stop}
    every:function(n, fn){ var h = {t:null, dead:false};
      function tick(){ if(h.dead) return; fn(); h.t = setTimeout(tick, api.ms(n)); }
      h.t = setTimeout(tick, api.offMs(n)); h.stop = function(){ h.dead = true; clearTimeout(h.t); }; return h; },
    // the page tells the module its weather mood (sun|hot|cloud|fog|rain|storm|night) or null when it has none
    setWeather:function(key){ weatherKey = key || null; setSweep(sweepFor(weatherKey)); },
    weatherOverride:function(){ return wxForced; },
    // message-status layer (rule 7): idle|new|dad|urgent; ?msg= wins
    setMsg:function(state){ setMsg(state); }, msg:function(){ return msgState; },
    // for JS-managed animations (mark the element data-phi-js): change the period at a cycle boundary without a jump
    retime:function(a, ms){ retime(a, ms); }
  };
  root.PhiTiming = api;

  // ---------- CSS side ----------
  var doc = (typeof document !== "undefined") ? document : null, rootStyle = doc && doc.documentElement.style;
  function writeVars(){ list.forEach(function(n){ var t = T[n]; rootStyle.setProperty("--phi-" + n, per(n).toFixed(3) + "s"); rootStyle.setProperty("--phi-" + n + "-d", (-api.off(n)).toFixed(3) + "s"); }); }
  // which keyframes belong to the weather loop (never swept) or the message layer (own pump)
  var FIXED = /^(wx-drift|wx-sway|wx-fadein|wx-blip|bw-|msg-pulse)/;
  function sweepable(a){ return a && a.animationName && !FIXED.test(a.animationName) && a.effect && a.effect.getTiming().iterations === Infinity &&
    !(a.effect.target && a.effect.target.closest && a.effect.target.closest(".wx-mq-track,.wx-seq,.wx-icon,#wx-mq-track,.bw-sticker,[data-phi-js]")); }
  // retime a running CSS animation at an iteration boundary without a visible jump
  function retime(a, D){ var t = a.effect.getTiming(), ct = a.currentTime; if(ct == null || !t.duration) return;
    var it = Math.round((ct - t.delay) / t.duration); a.effect.updateTiming({duration:D, delay:t.delay}); a.currentTime = t.delay + it * D; }
  function setSweep(next){
    if(RM.matches) next = 0;
    if(next === sw) return; var f = Math.pow(PHI, next - sw);
    if(doc && doc.getAnimations){ doc.getAnimations().forEach(function(a){ if(!sweepable(a)) return;
      var t = a.effect.getTiming(); if(a._phiD == null){ a.effect.updateTiming({duration:t.duration, delay:t.delay}); a._phiD = t.duration; }   // pin to its current period
      if(a._phiNext == null) retimeN++; a._phiNext = (a._phiNext || a._phiD) * f; }); }
    sw = next; if(rootStyle) writeVars();   // new elements start on the new periods
    if(doc) doc.documentElement.setAttribute("data-phi-sweep", String(sw));
  }
  if(doc){
    writeVars();
    doc.addEventListener("animationiteration", function(ev){
      if(!retimeN) return;   // load-order fix (26 Oct): nothing queued = no getAnimations() (it forced a style pass on every loop of every animation)
      var el = ev.target; if(!el.getAnimations) return;
      el.getAnimations().forEach(function(a){
        if(a.animationName !== ev.animationName) return;
        if(a._phiNext != null){ retime(a, a._phiNext); a._phiD = a._phiNext; a._phiNext = null; retimeN = Math.max(0, retimeN - 1); }
        if(a.animationName === "msg-pulse" && a._msgNext != null){ retime(a, a._msgNext); a._msgNext = null; retimeN = Math.max(0, retimeN - 1); }
      });
    }, true);
    // deep night starts/ends on the Perth clock (functional check once a minute, not an animation)
    setInterval(function(){ if(weatherKey || wxForced) setSweep(sweepFor(weatherKey)); }, 60000);
    if(wxForced) setTimeout(function(){ setSweep(sweepFor(null)); }, 0);
    if(RM.addEventListener) RM.addEventListener("change", function(){ setSweep(sweepFor(weatherKey)); });
  }
  // ---------- message-status layer ----------
  function msgPer(st){ return Math.pow(PHI, MSG[st]); }
  function setMsg(state){
    if(msgForced) state = msgForced; if(!(state in MSG)) state = "idle";
    if(state === msgState || !doc) return; msgState = state; var D = msgPer(state) * 1000;
    rootStyle.setProperty("--phi-msg", (D/1000).toFixed(3) + "s");
    doc.documentElement.setAttribute("data-msg", state);
    if(doc.getAnimations) doc.getAnimations().forEach(function(a){ if(a.animationName === "msg-pulse"){
      var t = a.effect.getTiming(); if(!a._msgPinned){ a.effect.updateTiming({duration:t.duration, delay:t.delay}); a._msgPinned = true; } if(a._msgNext == null) retimeN++; a._msgNext = D; } });
  }
  if(typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : this);
