# Plasma Ignition Test Bench (local build)

Static page for the two-stage plasma ignition (2SPI) bench: one card per bench stop, Rev C model value next to what was measured,
deviation %, status (green / amber / red), a dated entry log, a chain chart (measured ÷ model), the three planned tests, and
JSON export / import. Everything is stored in this browser only (localStorage `plasmaBench.v1`). No server, no keys, no third-party calls.

Model values: `js/bench-data.js`, copied only from `sim/RevC_reply.md` (R) and `sim/RevC_design_out_by_margin.md` (M) in
EdgerEquals/plasma-ignition, each with its source line and kind (SIMULATED / HAND / MODEL INPUT). Fields with no source value
show "no model value yet".

Shell (fixed header and footer, space-loop video, star streaks, matrix rain, Dad palette, load tiers, phi timing) is taken from
EdgerEquals/dad-page with the content window emptied and every non-bench part removed. No dad-page history is included.

Run locally: `python3 -m http.server 8000` in this folder, open http://127.0.0.1:8000/.
Page guard: `bash tools/install_page_guard.sh` (pre-push check, see tools/PAGE_GUARD.md).
