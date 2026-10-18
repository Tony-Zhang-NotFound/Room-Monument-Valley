# G2.5 acceptance — NO-GO / HOLD G3

Run date: 2026-10-18 UTC. Scope: existing ROOM G2 only. No levels, mechanics, backend services or assets added. This is a partial acceptance execution with an explicit browser blocker, not a release approval.

## Provenance and freeze

- Read the complete `baseline/G2_5_Engineering_Audit.md` and the current playable's gameplay, scene, UI and interaction sections.
- Authoritative playable matched the existing local project byte-for-byte before any changes.
- Baseline commit: `08150508bfc2589e9dc292abb3eaaba6a9f82f90`, tag `g2-baseline`.
- Tested extraction commit: `b9ce0f80d9d219b4a4b2a0542bed0b7b59deabd1`, branch `audit/g2-5`.
- HTML SHA256: `8e336fca344ebe9fc0a4e1b2f8dd681f34ddc25f4c70bf4d3ffbb88fb178fbab` (1,345,122 bytes).
- `baseline/SHA256SUMS` also records the audit hash. Baseline snapshot remains untouched. The final evidence-only commit is recorded in the delivery receipt and included Git bundle.

## Extraction and parity

The supplied project already had pure `src/game.mjs` and `src/level.mjs`. To establish provenance independently, extracted the frozen HTML's `__game` and `__level` bodies into `src/game/game.mjs` and `src/game/level.mjs`. Only the module boundary changed: the level namespace dependency became an ES import and the wrapper return became named exports.

These candidate modules are tested independently; runtime integration is deliberately deferred. The playable, existing runtime modules, UI, scene, geometry, engine, save schema and interaction timing are unchanged. This is not a completed Vite/TypeScript migration. No rendering refactor was attempted before browser parity could be established.

| Frozen section | Extracted candidate | Responsibility |
|---|---|---|
| `__level` | `src/game/level.mjs` | Constants, paths, path sampling |
| `__game` | `src/game/game.mjs` | Initial/valid state, transitions, saves, pending commits, reset, undo |
| `__assets`, `__scene`, `__main` | Existing files unchanged | Procedural assets, rendering, UI and animation |

Node v24.19.0, Linux 6.18.55. **19 tests passed, 0 failed** in the working checkout and again in a clean local clone of the tested commit. Evidence: `evidence/g2_5/unit.tap`, `clean-checkout.tap`, `clean-build.log`.

- 96 state candidates (21 valid stable states), 11 commands, two implementations versus the embedded baseline: 2,112 transition comparisons.
- 10,000 deterministic mixed lifecycle operations compare baseline, existing source and extraction, including stale commits, cancellation, reset and undo.
- Explicit expected-state tests cover fresh state, four rotations, movement guards, deferred commit, busy rejection, reverse travel, save validation and recovery.
- Level constants and forward/reverse path samples match the baseline.
- Existing geometry tests and simulated DOM/controller tests also pass. The latter use a mocked WebGL renderer and are **not browser tests**.
- `node scripts/bundle.mjs` in the clean clone reproduced the frozen standalone HTML byte-for-byte. No dependency download is needed for this existing vendored build. This does not prove a lockfile-based Vite install or hosted deployment.

## Acceptance matrix

PASS below applies only to the named executed layer; PARTIAL is not a release pass.

| Test | Observed result | Evidence / remaining work |
|---|---|---|
| T01 fresh save | UNIT PASS | Extracted initial-state assertion |
| T02 four rotations | UNIT PASS | Exact 3→0→1→2→3 assertion |
| T03 rotate away from S | UNIT PASS | Rejected at T; exhaustive state comparisons |
| T04 blocked stairs | UNIT PASS | Rejected at initial turn 3 |
| T05 committed stairs | UNIT PASS | Stable S until token commit, then T |
| T06 wrong camera | UNIT PASS | C1/C2 reject T→F |
| T07 T→F→G | PARTIAL | Unit route passes; browser/video not executed |
| T08 camera while pending | PARTIAL | Unit busy lock passes; browser not executed |
| T09 pause/resume | NOT EXECUTED in browser | Simulated controller passes only |
| T10 reset mid-animation | PARTIAL | Token invalidation passes; visual reset unverified |
| T11 undo | PARTIAL | Stable state recovery passes; visual pose unverified |
| T12 refresh while pending | NOT EXECUTED in browser | Stable checkpoint serialization tested; actual reload unverified |
| T13 invalid save | PARTIAL | Invalid JSON/version unit tests pass; browser console unverified |
| T14 endpoint visual matrix | BLOCKED | Nine screenshots absent; tolerance not approved |
| T15 wrong-view passage | PARTIAL | Unit guards pass; browser/video absent |
| T16 full journey/replay | NOT EXECUTED in browser | No browser recording |
| T17 raycast target access | NOT EXECUTED | First-hit behavior unchanged; fallback buttons exist, accessibility unverified |
| T18 reduced motion | NOT EXECUTED in browser | Simulated controller passes only |
| T19 WebGL failure | NOT EXECUTED | No real browser error screenshot |
| T20 desktop performance | NOT EXECUTED | No target hardware/browser FPS or frame-time measurements |
| T21 build/deploy | PARTIAL | Clean local clone tests/build pass; GitHub CI and hosted URL unverified |

## Browser evidence and nine requested views

Browser preflight executed; browser tests **did not execute**. Supported browser-control capability is missing (skill discovery reported `/root/.codex/skills/browser` absent). Managed preview guidance forbids installing a browser or improvising a control path when that capability is missing. The existing Playwright Chromium executable is also absent. See `evidence/g2_5/browser-preflight.json`. No server was started and no browser-launch success is claimed. Browser/version/device/GPU/DPR: unavailable, not measured.

| Viewport | C0 | C1 | C2 |
|---|---|---|---|
| 1600×900 — 16:9 | NOT EXECUTED; no screenshot | NOT EXECUTED; no screenshot | NOT EXECUTED; no screenshot |
| 1200×900 — 4:3 | NOT EXECUTED; no screenshot | NOT EXECUTED; no screenshot | NOT EXECUTED; no screenshot |
| 900×1600 — 9:16 | NOT EXECUTED; no screenshot | NOT EXECUTED; no screenshot | NOT EXECUTED; no screenshot |

Supplemental `viewport-matrix.json` records CPU analytical A/B projection for those nine dimensions using the runtime frustum formula. C0 deltas are effectively zero; C1/C2 remain separated. These calculations assume canvas equals viewport and do not validate responsive CSS, rendered pixels, clipping, occlusion or screenshots. No browser tolerance was invented. The audit's T/F wording refers to passage; actual intended coincident bridge endpoints are A/B, while T/F are different player anchors.

Existing `previews/` images are inherited CPU renders, **not G2.5 browser screenshot evidence**. Screenshot evidence count for this run: **0**. Reproduction steps and required filenames are in `tests/e2e/G25_RUNBOOK.md`.

## Failures, owners and decisions

No executed assertion failed. The acceptance gate remains failed/incomplete due to missing execution evidence.

| Risk | Status / owner | Decision |
|---|---|---|
| R01 P0 visual match | Open — author/QA | Approve tolerance and capture nine browser poses before GO |
| R02 P0 interruption parity | Unit/simulated checks pass — QA | Browser pause/reset/reload still mandatory |
| R03 P0 reproducibility | Local freeze/build pass — repository owner | Canonical GitHub destination, CI and hosted checks outstanding |
| R04 P1 raycast occlusion | Open — interaction QA | Preserve behavior; test first-hit and button fallback before any separate UI PR |
| R05 P1 undo persistence | Documented — game owner | History intentionally in memory, lost on refresh; stable checkpoint persists |
| R06 P1 asset inventory | Source verified — engineering | Runtime builds procedural assets from `src/assets-source.js`; `models/*.glb` are exported references, not runtime loads |
| R07 P1 visual/UX evidence | Blocked — browser QA | No waiver; no screenshots or video fabricated |
| R08 P2 performance | Open — hardware QA | Measure actual target hardware against Booklet budget |

No GitHub repository was created or pushed; no canonical remote was provided. No deployment or CI run is claimed. Vite/TypeScript, lockfile migration and runtime integration remain deferred until parity can be checked in a browser.

## Reproduce and recommendation

From the repository root: `node --test tests/*.test.mjs`, `node tests/g25-projection.mjs`, `node scripts/bundle.mjs`, then compare `ROOM_G2_Play.html` with `baseline/ROOM_G2_Play.html`. The bundled Git history preserves both baseline and extraction commits for rollback or review.

**NO-GO for G3 or release.** Accept the pure-core extraction and local parity evidence for review. Resume the browser runbook in a supported browser environment, attach all screenshots/videos/logs, resolve P0 items, and validate CI/hosted deployment before changing this recommendation.
