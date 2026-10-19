# Quiet Arles evidence

before/: exact pre-art source 4ab193c, with a read-only renderer.info seam. Actual browser screenshots and first 10s idle measurement.
after/: tested art source e4a0574, actual default/aligned/bed-detail/fallback screenshots; quality.json includes paired full-route measurements, stable-idle actual render count, 12 resets and fault injection.
regression-final/: final 10 grouped browser checks covering T01-T19/local T21, 9 full-page + 9 canvas screenshots and recorded browser video. Per-run commit/browser/viewport metadata is in browser-results.json.
regression/: earlier candidate 899a6e1, retained as historical execution, not the final run.
experiments/: actual intermediate performance measurements, not final results.
first-pass-performance.json: original exploratory first art pass.
before-after.png and nine-view-overview.png: derived thumbnail sheets from real browser captures, not independent renders.
provenance.json: unchanged gameplay and frozen baseline hashes. Input reference photographs are not production assets and are not included here.

All Chromium performance here is SwiftShader software rendering on the same cloud machine. Idle requestAnimationFrame scheduling is not actual rendered FPS. The final animated full-route result remains below baseline; physical-device budget/sign-off is outstanding.
