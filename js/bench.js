/* PLASMA IGNITION TEST BENCH app (tier 1). Model values: js/bench-data.js (Rev C docs only).
   Storage: this device only (localStorage 'plasmaBench.v1'). No server, no keys, no network calls; JSON export / import by file.
   Status per measured field: within the model value (or the worst..best bracket) ± tolerance = green, within tolerance × φ = amber,
   beyond = red. Criteria from the docs (µ ≥ 1000, Sw ≤ 10, ≥ 390 mJ, re-strike margin ≥ 1.5×) are shown as their own chips.
   Feed-forward: a measured upstream primary value is shown on the next card, with a plain ratio (measured ÷ model) and, where a
   matching downstream value exists, that model value × the ratio, labelled as a simple ratio, not physics. */
(function (root, doc) {
  'use strict';
  var D = root.BENCH_DATA; if (!D) return;
  var PHI = (1 + Math.sqrt(5)) / 2, KEY = 'plasmaBench.v1';
  var $ = function (id) { return doc.getElementById(id); };
  function el(tag, cls, txt) { var e = doc.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  // ---------- state ----------
  function blank() { return { schema: D.schema, entries: [], tol: {}, plans: {} }; }
  function load() { try { var x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && x.schema === D.schema && Array.isArray(x.entries)) { x.tol = x.tol || {}; x.plans = x.plans || {}; return x; } } catch (e) {} return blank(); }
  var S = load(), saveOk = true;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); saveOk = true; } catch (e) { saveOk = false; } pills(); }
  function tol(sid) { var t = +S.tol[sid]; return isFinite(t) && t > 0 ? t : D.tolDefault; }
  function num(v) { if (v == null) return null; var s = String(v).trim().replace(',', '.').replace(/^\u2212/, '-'); if (s === '') return null; var n = Number(s); return isFinite(n) ? n : null; }
  function fmt(n) { if (n == null || !isFinite(n)) return '–'; return String(+(+n).toPrecision(4)); }   // up to 4 significant figures: doc values show as written (40.12, 12.75)
  function fmtPred(f, v) { return (v < 0 ? '\u2212' : '') + fmt(Math.abs(v)) + (f.unit ? ' ' + f.unit : ''); }
  function perth(iso) { try { return new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Perth', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' AWST'; } catch (e) { return iso; } }
  function fieldOf(sid, fid) { var st = D.stages[sid]; for (var i = 0; i < st.fields.length; i++) if (st.fields[i].id === fid) return st.fields[i]; return null; }
  // latest measured value per field (newest entry wins)
  function latest(sid, fid) { for (var i = S.entries.length - 1; i >= 0; i--) { var e = S.entries[i]; if (e.stage === sid && e.values && e.values[fid] != null) return { v: e.values[fid], t: e.t }; } return null; }
  // ---------- status ----------
  var RANK = { none: 0, info: 0, green: 1, amber: 2, red: 3 };
  function compare(f, m, t) {
    if (f.pred == null || m == null) return null;
    var P = f.abs ? Math.abs(f.pred) : f.pred, M = f.abs ? Math.abs(m) : m, B = f.best != null ? (f.abs ? Math.abs(f.best) : f.best) : null;
    var dev = (M - P) / Math.abs(P) * 100, lo = B == null ? P : Math.min(P, B), hi = B == null ? P : Math.max(P, B), out = 0;
    if (M < lo) out = (lo - M) / Math.abs(lo) * 100; else if (M > hi) out = (M - hi) / Math.abs(hi) * 100;
    var st = out <= t ? 'green' : out <= t * PHI ? 'amber' : 'red';
    return { dev: dev, devBest: B == null ? null : (M - B) / Math.abs(B) * 100, out: out, inBracket: B != null && M >= lo && M <= hi, st: st, ratio: M / P };
  }
  function crit(f, m) { if (!f.crit || m == null) return null; var c = f.crit, ok = c.op === '>=' ? m >= c.v : m <= c.v; return { ok: ok, st: ok ? 'green' : (f.id === 'e_half' ? 'red' : 'amber'), txt: ok ? c.pass : c.fail }; }
  function margin(st) {
    var g = st.margin; if (!g) return null; var vr = latest('restrike', 'vrb'); if (!vr) return null;
    var bank = latest(g.bankStage, g.bankField), V = bank ? Math.abs(bank.v) : g.bankPred, r = V / Math.abs(vr.v);
    return { r: r, V: V, measuredBank: !!bank, st: r >= g.design ? 'green' : r >= 1 ? 'amber' : 'red' };
  }
  function stageStatus(sid) {
    var st = D.stages[sid], t = tol(sid), worst = 'none', n = 0;
    st.fields.forEach(function (f) { var L = latest(sid, f.id); if (!L) return; n++;
      var c = compare(f, L.v, t), k = crit(f, L.v); [c, k].forEach(function (x) { if (x && RANK[x.st] > RANK[worst]) worst = x.st; });
      if (!c && !k && RANK.info >= RANK[worst]) worst = worst === 'none' ? 'info' : worst; });
    var mg = margin(st); if (mg && RANK[mg.st] > RANK[worst]) worst = mg.st;
    return { st: worst, n: n };
  }
  // ---------- render: cards ----------
  var STLBL = { none: 'not measured', info: 'logged (no model value)', green: 'within margin', amber: 'near margin', red: 'outside margin' };
  function chip(st, txt) { var c = el('span', 'pb-chip pb-' + st, txt); return c; }
  function kindTag(f) { return f.kind ? el('span', 'pb-kind pb-k-' + f.kind.split(' ')[0].toLowerCase(), f.kind) : null; }
  function renderCards() {
    var host = $('pb-cards'); host.textContent = '';
    D.order.forEach(function (sid) { host.appendChild(card(sid)); });
  }
  function card(sid) {
    var st = D.stages[sid], t = tol(sid), ss = stageStatus(sid);
    var c = el('section', 'pb-card hw-w pb-s-' + ss.st); c.id = 'card-' + sid; c.setAttribute('data-stage', sid);
    var h = el('div', 'pb-ch'); var h2 = el('h2', 'pb-ct', st.name); h.appendChild(h2);
    if (st.unknown) h.appendChild(el('span', 'pb-open', 'open unknown'));
    h.appendChild(chip(ss.st, STLBL[ss.st])); c.appendChild(h);
    c.appendChild(el('p', 'pb-blurb', st.blurb));
    // feed-forward from upstream
    if (st.up) { var ff = feed(sid); if (ff) c.appendChild(ff); }
    // fields
    var list = el('div', 'pb-fields'), inputsBox = el('details', 'pb-inputs'), nIn = 0, inMeasured = false;
    inputsBox.appendChild(el('summary', null, 'Component values (model inputs)'));
    var inputsList = el('div', 'pb-fields'); inputsBox.appendChild(inputsList);
    st.fields.forEach(function (f) {
      var row = el('div', 'pb-f'); row.setAttribute('data-field', f.id);
      var top = el('div', 'pb-fl'); top.appendChild(el('span', 'pb-fn', f.label + (f.unit ? ' (' + f.unit + ')' : ''))); var kt = kindTag(f); if (kt) top.appendChild(kt); row.appendChild(top);
      var mv = el('div', 'pb-mv');
      if (f.pred != null) { mv.appendChild(el('b', null, 'Model ' + fmtPred(f, f.pred))); if (f.best != null) mv.appendChild(el('span', null, ' · best ' + fmtPred(f, f.best))); mv.appendChild(el('span', 'pb-src', ' · ' + f.src)); }
      else if (f.crit) { mv.appendChild(el('b', null, 'no model value yet')); mv.appendChild(el('span', null, ' · criterion ' + (f.crit.op === '>=' ? '≥ ' : '≤ ') + f.crit.v + (f.unit ? ' ' + f.unit : ''))); mv.appendChild(el('span', 'pb-src', ' · ' + f.crit.src)); }
      else mv.appendChild(el('b', 'pb-nomodel', 'no model value yet'));
      row.appendChild(mv);
      if (f.crit && f.pred != null) row.appendChild(el('div', 'pb-note', 'Target ' + (f.crit.op === '>=' ? '≥ ' : '≤ ') + f.crit.v + ' ' + f.unit + ' (' + f.crit.src + ')'));
      if (f.ref) row.appendChild(el('div', 'pb-note', 'Model assumption: ' + f.ref));
      if (f.note) row.appendChild(el('div', 'pb-note', f.note));
      var inp = el('input', 'pb-in'); inp.type = 'text'; inp.setAttribute('inputmode', 'decimal'); inp.autocomplete = 'off'; inp.id = 'in-' + sid + '-' + f.id;
      inp.placeholder = 'measured' + (f.unit ? ' ' + f.unit : ''); inp.setAttribute('aria-label', 'Measured ' + f.label);
      var lab = el('label', 'pb-inrow'); lab.appendChild(inp); row.appendChild(lab);
      var L = latest(sid, f.id), res = el('div', 'pb-res');
      if (L) {
        var cmp = compare(f, L.v, t), k = crit(f, L.v);
        res.appendChild(el('span', 'pb-last', 'Last ' + fmtPred(f, L.v)));
        if (cmp) { res.appendChild(chip(cmp.st, (cmp.dev >= 0 ? '+' : '') + cmp.dev.toFixed(1) + '% vs model')); if (cmp.devBest != null) res.appendChild(chip('info', (cmp.devBest >= 0 ? '+' : '') + cmp.devBest.toFixed(1) + '% vs best' + (cmp.inBracket ? ' · inside bracket' : ''))); }
        if (k) res.appendChild(chip(k.st, k.txt));
        if (!cmp && !k) res.appendChild(chip('info', 'no model value yet'));
      }
      row.appendChild(res);
      if (f.kind === 'MODEL INPUT') { inputsList.appendChild(row); nIn++; if (L) inMeasured = true; } else list.appendChild(row);
    });
    c.appendChild(list);
    if (nIn) { inputsBox.querySelector('summary').textContent = 'Component values, model inputs (' + nIn + ')'; if (inMeasured) inputsBox.open = true; c.appendChild(inputsBox); }
    // re-strike margin
    if (st.margin) { var mg = margin(st), mb = el('div', 'pb-margin');
      mb.appendChild(el('span', null, 'Voltage margin = bank ÷ re-break (' + st.margin.src + '). Model 1.50× (HAND). '));
      if (mg) mb.appendChild(chip(mg.st, fmt(mg.r) + '× with ' + (mg.measuredBank ? 'measured' : 'model') + ' bank ' + fmt(mg.V) + ' kV'));
      else mb.appendChild(el('span', 'pb-dim', 'Enter a re-break voltage to see it.'));
      c.appendChild(mb); }
    // tolerance + note + log button
    var ctl = el('div', 'pb-ctl');
    var tl = el('label', 'pb-tol'); tl.appendChild(el('span', null, 'Tolerance ±'));
    var ti = el('input', 'pb-tin'); ti.type = 'text'; ti.setAttribute('inputmode', 'decimal'); ti.value = String(t); ti.id = 'tol-' + sid; ti.setAttribute('aria-label', st.name + ' tolerance percent');
    ti.addEventListener('change', function () { var v = num(ti.value); if (v != null && v > 0 && v < 1000) S.tol[sid] = v; else delete S.tol[sid]; save(); renderAll(); });
    tl.appendChild(ti); tl.appendChild(el('span', null, '%')); ctl.appendChild(tl);
    var note = el('input', 'pb-note-in'); note.type = 'text'; note.placeholder = 'note (optional)'; note.id = 'note-' + sid; note.maxLength = 200; note.setAttribute('aria-label', st.name + ' note');
    ctl.appendChild(note);
    var b = el('button', 'pb-btn pb-log', 'Log entry'); b.type = 'button'; b.id = 'log-' + sid;
    var msg = el('span', 'pb-msg'); msg.setAttribute('aria-live', 'polite');
    b.addEventListener('click', function () {
      var vals = {}, any = false, bad = [];
      st.fields.forEach(function (f) { var i = $('in-' + sid + '-' + f.id); if (!i || i.value.trim() === '') return; var v = num(i.value); if (v == null) bad.push(f.label); else { vals[f.id] = v; any = true; } });
      if (bad.length) { msg.textContent = 'Not a number: ' + bad.join(', '); return; }
      if (!any) { msg.textContent = 'Type at least one measured value.'; return; }
      S.entries.push({ id: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: new Date().toISOString(), stage: sid, values: vals, note: note.value.trim().slice(0, 200), tol: t });
      save(); renderAll(); var m2 = doc.querySelector('#card-' + sid + ' .pb-msg'); if (m2) m2.textContent = saveOk ? 'Logged ✓' : 'Logged, but this browser would not save it';
    });
    ctl.appendChild(b); ctl.appendChild(msg); c.appendChild(ctl);
    // dated log
    var mine = S.entries.filter(function (e) { return e.stage === sid; }).slice().reverse();
    var lg = el('details', 'pb-logl'); if (mine.length) lg.open = mine.length <= 3;
    lg.appendChild(el('summary', null, 'Entry log (' + mine.length + ')'));
    if (!mine.length) lg.appendChild(el('p', 'pb-dim', 'No entries yet.'));
    mine.forEach(function (e) {
      var li = el('div', 'pb-le'); var hd = el('div', 'pb-leh'); hd.appendChild(el('span', 'pb-led', perth(e.t)));
      var x = el('button', 'pb-del', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Delete entry from ' + perth(e.t));
      x.addEventListener('click', function () { if (!confirm('Delete this entry?')) return; S.entries = S.entries.filter(function (y) { return y.id !== e.id; }); save(); renderAll(); });
      hd.appendChild(x); li.appendChild(hd);
      Object.keys(e.values).forEach(function (fid) { var f = fieldOf(sid, fid); if (!f) return; var cmp = compare(f, e.values[fid], e.tol || t);
        var r = el('div', 'pb-lv'); r.appendChild(el('span', null, f.label + ': ' + fmtPred(f, e.values[fid])));
        if (cmp) r.appendChild(chip(cmp.st, (cmp.dev >= 0 ? '+' : '') + cmp.dev.toFixed(1) + '%')); li.appendChild(r); });
      if (e.note) li.appendChild(el('div', 'pb-len', e.note));
      lg.appendChild(li);
    });
    c.appendChild(lg);
    return c;
  }
  function feed(sid) {
    var st = D.stages[sid], up = D.stages[st.up], pf = fieldOf(st.up, st.upField || up.primary), L = latest(st.up, pf.id);
    var box = el('div', 'pb-ff');
    box.appendChild(el('div', 'pb-ffh', 'Upstream: ' + up.name));
    if (!L) { box.appendChild(el('div', 'pb-dim', pf.label + ': not measured yet (model ' + (pf.pred != null ? fmtPred(pf, pf.pred) : 'none') + ')')); return box; }
    box.appendChild(el('div', null, pf.label + ': measured ' + fmtPred(pf, L.v) + (pf.pred != null ? ' · model ' + fmtPred(pf, pf.pred) : '')));
    if (pf.pred != null) {
      var r = Math.abs(L.v) / Math.abs(pf.pred); box.appendChild(el('div', null, 'Ratio measured ÷ model: ' + fmt(r) + '×'));
      if (st.ffField) { var tf = fieldOf(sid, st.ffField); if (tf && tf.pred != null) box.appendChild(el('div', 'pb-ffr', 'Simple ratio (not a model): ' + tf.label + ' ' + fmtPred(tf, tf.pred) + ' × ' + fmt(r) + ' ≈ ' + fmtPred(tf, tf.pred * r))); }
    }
    return box;
  }
  // ---------- chain chart (canvas, no libraries) ----------
  var CC = { none: '#5C7378', info: '#8FA9AE', green: '#3DDC84', amber: '#F2A541', red: '#E5484D' };
  function drawChain() {
    var cv = $('pb-chart'); if (!cv || !cv.getContext) return;
    var w = cv.clientWidth || 300, h = Math.round(w / PHI), dpr = Math.min(2, root.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px';
    var x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    var pts = D.chain.map(function (sid) { var st = D.stages[sid], f = fieldOf(sid, st.primary), L = latest(sid, f.id), t = tol(sid), c = L ? compare(f, L.v, t) : null;
      var lo = 1, hi = 1; if (f.best != null) { var b = Math.abs(f.best) / Math.abs(f.pred); lo = Math.min(1, b); hi = Math.max(1, b); }
      return { sid: sid, st: st, f: f, L: L, c: c, t: t, lo: lo, hi: hi }; });
    var ymin = 0.5, ymax = 1.5; pts.forEach(function (p) { ymin = Math.min(ymin, p.lo - 0.05); ymax = Math.max(ymax, p.hi + 0.05); if (p.c) { ymin = Math.min(ymin, p.c.ratio - 0.1); ymax = Math.max(ymax, p.c.ratio + 0.1); } });
    ymin = Math.max(0, ymin);
    var L0 = 34, R0 = 10, T0 = 12, B0 = 30, pw = w - L0 - R0, ph = h - T0 - B0;
    function X(i) { return L0 + pw * (i + 0.5) / pts.length; } function Y(v) { return T0 + ph * (1 - (v - ymin) / (ymax - ymin)); }
    x.font = '10px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace'; x.textBaseline = 'middle';
    // axis + grid
    x.strokeStyle = 'rgba(78,170,190,.25)'; x.fillStyle = '#A9C3C8'; x.lineWidth = 1;
    [ymin, 1, ymax].concat([0.5, 1.5].filter(function (v) { return v > ymin && v < ymax; })).forEach(function (v) { x.beginPath(); x.moveTo(L0, Y(v)); x.lineTo(w - R0, Y(v)); x.stroke(); x.textAlign = 'right'; x.fillText(v.toFixed(2), L0 - 4, Y(v)); });
    // per-stage tolerance bands around the model (1.0 or the worst..best bracket)
    pts.forEach(function (p, i) { var bw = pw / pts.length * 0.62, t = p.t / 100;
      x.fillStyle = 'rgba(242,165,65,.13)'; x.fillRect(X(i) - bw / 2, Y(p.hi * (1 + t * PHI)), bw, Y(p.lo * (1 - t * PHI)) - Y(p.hi * (1 + t * PHI)));
      x.fillStyle = 'rgba(61,220,132,.16)'; x.fillRect(X(i) - bw / 2, Y(p.hi * (1 + t)), bw, Y(p.lo * (1 - t)) - Y(p.hi * (1 + t)));
      if (p.hi > p.lo) { x.fillStyle = 'rgba(214,236,239,.35)'; x.fillRect(X(i) - 2, Y(p.hi), 4, Y(p.lo) - Y(p.hi)); } });
    // model line (predicted = 1.0)
    x.setLineDash([4, 3]); x.strokeStyle = '#D6ECEF'; x.beginPath(); x.moveTo(X(0), Y(1)); x.lineTo(X(pts.length - 1), Y(1)); x.stroke(); x.setLineDash([]);
    pts.forEach(function (p, i) { x.fillStyle = '#D6ECEF'; x.beginPath(); x.arc(X(i), Y(1), 2.5, 0, 7); x.fill(); });
    // measured
    x.strokeStyle = 'rgba(246,235,217,.6)'; x.beginPath(); var started = false;
    pts.forEach(function (p, i) { if (!p.c) return; if (!started) { x.moveTo(X(i), Y(p.c.ratio)); started = true; } else x.lineTo(X(i), Y(p.c.ratio)); }); x.stroke();
    pts.forEach(function (p, i) { if (!p.c) return; x.fillStyle = CC[p.c.st]; x.beginPath(); x.arc(X(i), Y(p.c.ratio), 5, 0, 7); x.fill(); x.strokeStyle = '#0B1215'; x.stroke(); });
    // labels
    x.fillStyle = '#F6EBD9'; x.textAlign = 'center';
    pts.forEach(function (p, i) { x.fillText(p.st.short, X(i), h - B0 + 10); x.fillStyle = p.c ? CC[p.c.st] : '#5C7378'; x.fillText(p.c ? (p.c.dev >= 0 ? '+' : '') + p.c.dev.toFixed(0) + '%' : '–', X(i), h - B0 + 23); x.fillStyle = '#F6EBD9'; });
    // text twin for screen readers
    var sr = $('pb-chart-sr'); if (sr) sr.textContent = pts.map(function (p) { return p.st.name + ': ' + (p.c ? 'measured ' + fmt(p.c.ratio) + '× model, ' + STLBL[p.c.st] : 'not measured'); }).join('. ');
    var key = $('pb-chart-key'); if (key) { key.textContent = ''; pts.forEach(function (p) { var d = el('div', 'pb-kr'); d.appendChild(el('b', null, p.st.short + ' ')); d.appendChild(el('span', null, p.f.label + ' · model ' + fmtPred(p.f, p.f.pred) + (p.L ? ' · measured ' + fmtPred(p.f, p.L.v) : ''))); key.appendChild(d); }); }
  }
  // ---------- planned tests ----------
  function renderPlans() {
    var host = $('pb-plan-list'); host.textContent = '';
    D.plans.forEach(function (p, i) {
      var done = S.plans[p.id] && S.plans[p.id].done, it = el('div', 'pb-pl' + (done ? ' done' : ''));
      var hd = el('div', 'pb-plh'); hd.appendChild(el('span', 'pb-pln', String(i + 1))); hd.appendChild(el('b', null, p.title));
      hd.appendChild(chip(done ? 'green' : 'none', done ? 'done ' + perth(S.plans[p.id].t) : 'planned')); it.appendChild(hd);
      it.appendChild(el('p', null, p.what)); it.appendChild(el('p', 'pb-dim', 'Retires: ' + p.retire + ' (' + p.src + ')'));
      var row = el('div', 'pb-plb');
      var go = el('button', 'pb-btn pb-sec', 'Go to ' + D.stages[p.stage].name); go.type = 'button';
      go.addEventListener('click', function () { var c = $('card-' + p.stage); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      var tg = el('button', 'pb-btn', done ? 'Mark planned' : 'Mark done'); tg.type = 'button'; tg.id = 'plan-' + p.id;
      tg.addEventListener('click', function () { if (done) delete S.plans[p.id]; else S.plans[p.id] = { done: true, t: new Date().toISOString() }; save(); renderPlans(); });
      row.appendChild(go); row.appendChild(tg); it.appendChild(row); host.appendChild(it);
    });
  }
  // ---------- export / import ----------
  function wireData() {
    $('pb-export').addEventListener('click', function () {
      var out = { schema: D.schema, exported: new Date().toISOString(), model: D.model, sources: D.sources, tol: S.tol, plans: S.plans, entries: S.entries };
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }), a = doc.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'plasma-bench-' + new Date().toISOString().slice(0, 10) + '.json'; doc.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000); $('pb-data-msg').textContent = 'Exported ' + S.entries.length + ' entries.';
    });
    $('pb-import').addEventListener('change', function (ev) {
      var f = ev.target.files && ev.target.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { var x; try { x = JSON.parse(rd.result); } catch (e) { $('pb-data-msg').textContent = 'That file is not JSON.'; return; }
        if (!x || x.schema !== D.schema || !Array.isArray(x.entries)) { $('pb-data-msg').textContent = 'Not a plasma-bench.v1 export.'; return; }
        var have = {}, added = 0; S.entries.forEach(function (e) { have[e.id] = 1; });
        x.entries.forEach(function (e) { if (!e || typeof e.id !== 'string' || have[e.id] || !D.stages[e.stage] || !e.values || typeof e.values !== 'object') return;
          var v = {}; Object.keys(e.values).forEach(function (k) { var n = num(e.values[k]); if (n != null && fieldOf(e.stage, k)) v[k] = n; });
          S.entries.push({ id: e.id, t: String(e.t || new Date().toISOString()), stage: e.stage, values: v, note: String(e.note || '').slice(0, 200), tol: +e.tol || undefined }); added++; });
        S.entries.sort(function (a, b) { return a.t < b.t ? -1 : a.t > b.t ? 1 : 0; });
        if (x.tol && typeof x.tol === 'object') Object.keys(x.tol).forEach(function (k) { if (D.stages[k] && +x.tol[k] > 0) S.tol[k] = +x.tol[k]; });
        if (x.plans && typeof x.plans === 'object') Object.keys(x.plans).forEach(function (k) { if (x.plans[k] && x.plans[k].done) S.plans[k] = { done: true, t: String(x.plans[k].t || '') }; });
        save(); renderAll(); $('pb-data-msg').textContent = 'Imported ' + added + ' new entries (duplicates skipped).'; ev.target.value = ''; };
      rd.readAsText(f);
    });
    $('pb-clear').addEventListener('click', function () { if (!confirm('Delete every entry on this device? Export first if you want a copy.')) return; S = blank(); save(); renderAll(); $('pb-data-msg').textContent = 'Cleared.'; });
  }
  // ---------- header pills + footer lights ----------
  function pills() {
    var g = 0, a = 0, r = 0, m = 0; D.chain.forEach(function (sid) { var s = stageStatus(sid).st; if (s !== 'none') m++; if (s === 'green') g++; if (s === 'amber') a++; if (s === 'red') r++; });
    var open = D.order.filter(function (sid) { return D.stages[sid].unknown && stageStatus(sid).st !== 'green'; }).length;
    var set = function (id, v) { var e = $(id); if (e) e.textContent = v; };
    set('vStops', m + '/' + D.chain.length); set('vGreen', g); set('vOff', a + r); set('vLog', S.entries.length); set('hs-open', open + ' open');
    var hs = $('hstat'); if (hs) hs.className = 'pb-pill ' + (r ? 'bad' : a ? 'warn' : m ? 'ok' : 'idle');
    set('hs-l', r ? 'off model' : a ? 'near edge' : m ? 'on model' : 'no data');
    var sv = $('ltSave'); if (sv) sv.className = 'lt' + (saveOk ? '' : ' bad'); set('vSave', saveOk ? 'device' : 'off');
    var off = $('ltOff'); if (off) off.className = 'lt' + (r ? ' bad' : a ? ' warn' : '');
  }
  function renderAll() { renderCards(); drawChain(); renderPlans(); pills(); if (root.BenchFit) root.BenchFit.soon(); }
  root.PlasmaBench = { state: function () { return S; }, render: renderAll, KEY: KEY };
  $('pb-tolnote').textContent = D.tolNote;
  wireData(); renderAll();
  var rq = 0; addEventListener('resize', function () { if (!rq) rq = requestAnimationFrame(function () { rq = 0; drawChain(); }); });
})(window, document);
