# Current local G2.5 evidence — 2026-10-18

Authoritative conclusions: ../../../G2_5_ACCEPTANCE.md.

- browser-results.json: 10 real Chromium/WebGL groups passed; 9 viewport/camera poses. Metadata records tested commit and dirty files; no runtime files changed.
- C0/C1/C2 screenshots: full page and canvas each. nine-view-overview.png is a derived contact sheet, not additional independent evidence.
- video/*.webm: full browser recording; video-metadata.json confirms VP8, dimensions, duration.
- unit.tap / clean-checkout.tap: 19 tests passed each; the latter ran in a fresh clone of the exact commit recorded in runtime-provenance.json.
- build.log / clean-build.log / html-sha256.txt: standalone rebuild matches the frozen HTML.
- cpu-viewport-matrix.json / projection.log: supplemental CPU calculation only, not browser evidence.
- performance.json: 30s idle and 30s interacting, SwiftShader software rendering. Not a target-hardware budget pass.
- pointer-occlusion.json: real target-center clicks T/F/G; all selected centers were accessible.
- occluded-stair.json / .png / .log: separate real mask-obscured stair click leaves state unchanged; labeled rotation button works. Existing P1 limitation retained.
- touch-emulation.json / touch-emulation-win.png: 390x844 DPR2 emulation, not a physical touch device.
- runtime-provenance.json: runtime hashes and empty diff versus delivery HEAD.

../runs/baseline-first retains the first complete run's raw evidence and favicon classification failure. Its browser-fatal.json is an intentional historical failure record; current run has no fatal file. Original inherited evidence in the parent directory was not overwritten.

All test services were local-only. No GitHub repository, CI run or deployment was created. Authored visual tolerance, hardware performance and human playtesting remain unsigned.
