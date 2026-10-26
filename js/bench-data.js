/* PLASMA IGNITION TEST BENCH: model values (Rev C, "Design-out by margin").
   EVERY number here is copied from one of two files in EdgerEquals/plasma-ignition (main):
     R = sim/RevC_reply.md                    M = sim/RevC_design_out_by_margin.md
   Each value carries its source line ("R:22" = RevC_reply.md line 22) and its kind as the docs mark it:
     SIMULATED = ngspice-39 run in sim/run_revc.py      HAND = hand estimate in the docs
     MODEL INPUT = a component value used in the SIMULATED runs (not itself a result)
   Chosen stage-2 bank: 5.63 kV / 63.2 nF / 1.0 J (R:18, R:23). The abandoned auto-size in revc_summary.json is NOT used (R:18).
   A field with pred:null shows "no model value yet". Nothing here is invented; tolerance default 5% = the docs' flag threshold (R:18).
   Polarity: plug/gap voltages are negative in the docs; the bench compares magnitudes, so a measured 25.1 or -25.1 both work. */
(function (root) {
  'use strict';
  var D = {
    schema: 'plasma-bench.v1',
    model: 'Rev C – Design-out by margin (Rev B topology held)',
    sources: {
      R: 'sim/RevC_reply.md (EdgerEquals/plasma-ignition, main)',
      M: 'sim/RevC_design_out_by_margin.md (EdgerEquals/plasma-ignition, main)'
    },
    tolDefault: 5,           // % (R:18 "Every move past 5% is flagged")
    tolNote: 'Default tolerance 5% = the Rev C flag threshold (R:18). Amber band = tolerance × φ: a display rule, not a model value.',
    // chain order (for the chart and feed-forward)
    chain: ['s1', 'sr12', 'sr3', 'sriso', 'gap', 'restrike'],
    // card order on screen: the three open unknowns first
    order: ['sr3', 'sriso', 'restrike', 's1', 'sr12', 'gap'],
    stages: {
      s1: {
        name: 'Stage 1 bank', short: 'S1',
        blurb: 'Rev B stage-1 values carried unchanged into the Rev C runs (0% difference, M:39).',
        primary: 'v0a',
        fields: [
          { id: 'v0a', label: 'Bank charge V0a', unit: 'kV', pred: 1.1, kind: 'MODEL INPUT', src: 'M:39' },
          { id: 'c0a', label: 'Bank capacitance C0a', unit: 'nF', pred: 96, kind: 'MODEL INPUT', src: 'M:39' },
          { id: 'n', label: 'Transformer ratio n', unit: '', pred: 31, kind: 'MODEL INPUT', src: 'M:39' },
          { id: 'plug_ideal', label: 'Stage-1 plug peak, ideal SR3', unit: 'kV', pred: -55.84, kind: 'SIMULATED', src: 'M:27, R:32', abs: true,
            note: 'Ideal-SR3 reference only; with the real SR3 this is not reached (R:34).' },
          { id: 'e1', label: 'Stage-1 stored energy', unit: 'J', pred: null }
        ]
      },
      sr12: {
        name: 'SR1 / SR2', short: 'SR1/2',
        blurb: 'Lossy SR1/SR2 hold the gap near −40 kV before SR3 (M:195). Retire with one stage-1 shot into a dummy load with the real SR1 and SR2 cores.',
        primary: 'gap_lossy', up: 's1',
        fields: [
          { id: 'gap_lossy', label: 'Full-chain gap, lossy SR1/SR2', unit: 'kV', pred: -40.12, kind: 'SIMULATED', src: 'M:29, R:32', abs: true },
          { id: 'gap_ideal', label: 'Full-chain gap, ideal SR1/SR2 (no breakdown)', unit: 'kV', pred: -50.92, kind: 'SIMULATED', src: 'M:28, R:32', abs: true },
          { id: 'lsat1', label: 'SR1 Lsat', unit: 'µH', pred: 81, kind: 'MODEL INPUT', src: 'M:37' },
          { id: 'lsat2', label: 'SR2 Lsat', unit: 'µH', pred: 3.2, kind: 'MODEL INPUT', src: 'M:37' },
          { id: 'vs1', label: 'SR1 volt-seconds VS1', unit: 'mV·s', pred: 17, kind: 'MODEL INPUT', src: 'M:39' },
          { id: 'vs2', label: 'SR2 volt-seconds VS2', unit: 'mV·s', pred: 3.4, kind: 'MODEL INPUT', src: 'M:39' }
        ]
      },
      sr3: {
        name: 'SR3 (hot ferrite)', short: 'SR3', unknown: true,
        blurb: 'Worst-case 4C65-class NiZn at 120 °C does NOT saturate: SR3 is a ~45 ns pass-through and the −55 kV edge is not available until measured (R:22, R:34).',
        primary: 'gap', up: 'sr12', upField: 'gap_lossy', ffField: 'gap_lossy12',
        fields: [
          { id: 'mu', label: 'Hot µ at 120 °C (40 ns / 0.5 T pulse)', unit: '', pred: null, crit: { op: '>=', v: 1000, src: 'M:192',
            pass: 'µ ≥ 1000: the §2.1 sensitivity core can switch', fail: 'µ < 1000: SR3 stays a ~45 ns pass-through' },
            ref: 'worst-case assumption µ 100, best 150 (M:49)' },
          { id: 'sw', label: 'Switching constant Sw at 120 °C', unit: 'A·µs/m', pred: null, crit: { op: '<=', v: 10, src: 'M:192',
            pass: 'Sw ≤ 10: fast-edge core is possible', fail: 'Sw > 10: SR3 stays a ~45 ns pass-through' },
            ref: 'worst-case assumption 40, best 10 (M:50)' },
          { id: 'gap', label: 'Full-chain gap, ideal SR1/SR2', unit: 'kV', pred: -25.8, best: -26.5, kind: 'SIMULATED', src: 'R:22, M:76-77', abs: true },
          { id: 'edge', label: '10–90% edge at the gap', unit: 'ns', pred: 45, best: 56, kind: 'SIMULATED', src: 'R:22, M:76-77' },
          { id: 'gap_lossy12', label: 'Full-chain gap, lossy SR1/SR2', unit: 'kV', pred: -22.4, kind: 'SIMULATED', src: 'R:26, M:78', abs: true },
          { id: 'lsat3', label: 'SR3 Lsat (26 turns, 25×60 mm, 4.1 mm stack)', unit: 'nH', pred: 714, kind: 'MODEL INPUT', src: 'R:22, M:61' },
          { id: 'bias3', label: 'SR3 bias, worst corner', unit: 'A-t', pred: 359, kind: 'MODEL INPUT', src: 'R:22, M:63' }
        ]
      },
      sriso: {
        name: 'SRiso', short: 'SRiso', unknown: true,
        blurb: 'Chosen bank 5.63 kV, 63.2 nF, 1.0 J, N = 6, film rated ≥ 9 kV with 100% reversal (R:23, R:28). JA model not re-run (M:105).',
        primary: 'e_half', up: 'sr3',
        fields: [
          { id: 'v0b', label: 'Bank charge V0b', unit: 'kV', pred: 5.63, kind: 'MODEL INPUT', src: 'R:23, M:113' },
          { id: 'c0b', label: 'Bank capacitance C0b', unit: 'nF', pred: 63.2, kind: 'MODEL INPUT', src: 'R:18, R:23, M:114' },
          { id: 'e_half', label: 'First half-cycle energy at 1 Ω', unit: 'mJ', pred: 575, best: 708, kind: 'SIMULATED', src: 'R:23, M:133-134',
            crit: { op: '>=', v: 390, src: 'R:28 (HAND table: 78% of 0.5 J)', pass: '≥ 390 mJ target', fail: 'under the 390 mJ target' },
            note: 'Pred = TTU (worst); best = eddy.' },
          { id: 'ipk', label: 'First-half peak current', unit: 'kA', pred: 1.37, best: 1.71, kind: 'SIMULATED', src: 'M:133-134', note: 'TTU / eddy.' },
          { id: 'rev', label: 'Reversal', unit: '%', pred: 65, best: 52, kind: 'SIMULATED', src: 'M:133-134', note: 'TTU / eddy. Reverse peak about −2.9 kV (R:28).' },
          { id: 'delay', label: 'SRiso delay', unit: 'µs', pred: 2.20, best: 2.00, kind: 'SIMULATED', src: 'M:119', note: 'TTU / eddy.' },
          { id: 'lsatiso', label: 'SRiso Lsat', unit: 'µH', pred: 0.32, kind: 'MODEL INPUT', src: 'M:14, M:118' },
          { id: 'vsiso', label: 'SRiso volt-seconds', unit: 'mV·s', pred: 12.75, kind: 'MODEL INPUT', src: 'R:23, M:116' }
        ]
      },
      gap: {
        name: 'Plug gap', short: 'Gap',
        blurb: 'GX120 at 25° BTDC, 0.75 mm gap. The gap still fires against the ~14 kV cold break even with SR3 as a pass-through (M:80).',
        primary: 'cold', up: 'sr3', upField: 'gap', ffField: 'vgap',
        fields: [
          { id: 'cold', label: 'Cold breakdown, HHO / water mix', unit: 'kV', pred: 14.4, kind: 'HAND', src: 'R:30, M:147' },
          { id: 'cold_air', label: 'Cold breakdown, air', unit: 'kV', pred: 13.1, kind: 'HAND', src: 'M:146' },
          { id: 'vgap', label: 'Gap voltage delivered (full chain)', unit: 'kV', pred: -25.8, best: -26.5, kind: 'SIMULATED', src: 'R:22, M:76-77', abs: true,
            note: 'Same SR3 worst/best corners; −22.4 kV with lossy SR1/SR2 (M:78).' }
        ]
      },
      restrike: {
        name: 'Re-strike (~2 µs)', short: 'Re-str', unknown: true,
        blurb: 'Bank 5.63 kV = 1.5× the 3.75 kV worst re-break. No clamp. The voltage bracket is HAND; the re-break itself is SIMULATED (R:24, R:30).',
        primary: 'vrb', up: 'sriso',
        fields: [
          { id: 'vrb', label: 'Re-break voltage at ~2 µs', unit: 'kV', pred: 3.75, best: 0.98, kind: 'HAND', src: 'R:30, M:155-157',
            note: 'Bracket: best 0.98, mid 1.95, worst 3.75 kV. A bracket, not a measurement (M:159).', margin: true },
          { id: 'trb', label: 'Re-break time', unit: 'µs', pred: 2.27, kind: 'SIMULATED', src: 'R:30, M:169' },
          { id: 'revr', label: 'Reversal on re-strike', unit: '%', pred: 52, kind: 'SIMULATED', src: 'R:30, M:169' },
          { id: 'irb', label: 'First-half current', unit: 'kA', pred: 1.71, kind: 'SIMULATED', src: 'R:30, M:169' }
        ],
        // margin = bank voltage / re-break voltage (the docs' own definition, M:161); design 1.5×, re-breaks at ≥ 1.0×
        margin: { bankStage: 'sriso', bankField: 'v0b', bankPred: 5.63, design: 1.5, src: 'R:24, M:161' }
      }
    },
    // the three suggested bench measurements (R:34, M:192-194), first planned tests
    plans: [
      { id: 'p1', stage: 'sr3', title: 'SR3 core pulse at 120 °C', what: 'One 40 ns / 0.5 T pulse on the SR3 candidate core at 120 °C. Measure µ and Sw.', retire: 'If Sw ≤ 10 A·µs/m and µ ≥ 1000, wind the §2.1 sensitivity core. If not, SR3 stays a 45 ns pass-through.', src: 'R:34, M:192' },
      { id: 'p2', stage: 'sriso', title: 'Kiloamp pulse on the real SRiso core', what: 'One kiloamp, few-microsecond pulse on the real SRiso core into a resistive load.', retire: 'Picks the model: TTU 61% vs eddy 77% (JA 80% not re-run).', src: 'R:34, M:193' },
      { id: 'p3', stage: 'restrike', title: 'Double pulse at ~9 atm, real mix', what: 'One double pulse in a pressurised gap at ~9 atm and ~540 K (or on the GX120 with a sense resistor), delay about 2 µs, in the real HHO / water mix.', retire: 'Turns the 1–4 kV re-break bracket into a measured margin.', src: 'R:34, M:194, M:197' }
    ]
  };
  root.BENCH_DATA = D;
})(window);
