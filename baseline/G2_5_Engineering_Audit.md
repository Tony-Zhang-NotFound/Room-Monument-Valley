# ROOM G2 — G2.5 Engineering Audit / 验收合同
Date: 2026-10-18
Scope: source review, risk register, test matrix, refactor plan, GitHub release plan. No new level.
Status: Static JS syntax PASS (`node --check`); browser visual/run QA NOT EXECUTED.
Sources: ROOM_G2_Play.html (1,345,122 bytes); Interior_Puzzle_Development_Booklet_v0_1.docx.

## Verified implementation
- Self-contained HTML embeds Three.js r170 and procedural geometry assets. This is not evidence that independently exported GLB files are integrated into this runtime.
- Sections: `__level`, `__assets`, `__game`, `__scene`, `__main`; fixed nodes S,T,F,G; camera states 0,1,2; four 90-degree turn states.
- Transition T<->F only with turn=0 and camera=0. Screen projected endpoints are measured for debug output, not used to authorize passage.
- `begin` queues pending animation, `commit` applies stable state, blocked inputs during pending, undo up to 40 in memory, stable state in localStorage with schema/version validation.
- `resize` updates orthographic frustum; current implementation must be tested visually on multiple aspect ratios.
- Raycasting uses first intersected object, which may block accessible click targets behind scenery.
- Local save includes stable state only; undo history is lost on refresh by design of implementation.
- Syntax parsed successfully with Node. This is not WebGL or interaction validation.

## Risk register
| ID | Priority | Risk | Evidence | Mitigation |
|---|---|---|---|---|
| R01 | P0 | Visual endpoint mismatch across aspect ratios | projection distance only shown as debug; no asserted tolerance | screenshot + pixel-distance QA; calibrate authoring camera and endpoints |
| R02 | P0 | Animation state and pause/reset desynchronization | separate pending and animation lifecycle | transition invariants, interruption tests, stable-state restore |
| R03 | P0 | Unreproducible development and release | monolithic HTML, embedded engine; project Git repo not confirmed | create clean repository and lock runtime/build |
| R04 | P1 | Raycast targets occluded | first intersection used | filter hits to interactable layer |
| R05 | P1 | Undo history not persisted | history in memory | document behavior; recovery tests |
| R06 | P1 | Asset manifest and runtime mismatch | procedural scene, assets catalogue metadata | inventory external GLB and distinguish runtime assets |
| R07 | P1 | No quantitative visual/UX acceptance evidence | no browser snapshots available in this review | capture named device/browser screenshots and playtest notes |
| R08 | P2 | Performance budget unverified | shadows, 2048 shadow map, pixelRatio capped at 2 | record fps/frame time/render stats on target hardware |

## Acceptance test matrix
| ID | Scenario | Expected | Automation | Evidence |
|---|---|---|---|---|
| T01 | Fresh save | Initial state S/turn 3/camera 1/not won | unit | JSON state |
| T02 | Rotate at S 4 times | 3→0→1→2→3; exact baseline | unit | transition log |
| T03 | Rotate away from S | rejected; no state mutation | unit | assertion |
| T04 | S→T at turn !=0 | rejected | unit | assertion |
| T05 | S→T at turn 0 | succeeds only after commit | unit | state log |
| T06 | T→F camera !=0 | rejected even if turn=0 | unit | assertion |
| T07 | T→F turn=0 camera=0 | succeeds and allows F→G | unit+browser | state and video |
| T08 | Camera change during pending walk/rotation | input rejected | unit+browser | event log |
| T09 | Pause mid-animation/resume | frame and game state remain consistent | browser | video |
| T10 | Reset mid-animation | pending token invalidated, initial visual/state restored | unit+browser | log/screenshot |
| T11 | Undo after movement/rotation | previous stable state restored | unit+browser | assertion |
| T12 | Refresh during pending state | reloads latest committed checkpoint | browser | saved data |
| T13 | Corrupt/wrong-version localStorage | safe initial state, no crash | unit+browser | console |
| T14 | C0 T/F endpoint projection at 16:9, 4:3, 9:16 | within approved authored tolerance; otherwise FAIL | browser screenshot | pixel deltas/screenshots |
| T15 | Wrong camera C1/C2 | no T→F passage regardless of projection | unit+browser | state and video |
| T16 | Full end-to-end journey | complete without page refresh, win state, replay | browser | recorded run |
| T17 | Click interactive objects behind geometry | correct hit or clear fallback | browser | hit log |
| T18 | Reduced motion | all transitions reach stable state promptly | browser | log |
| T19 | WebGL initialization failure | accessible error rather than blank page | manual | screenshot |
| T20 | Desktop performance | log device, FPS, frame time; evaluate Booklet targets | browser | profile |
| T21 | Clean checkout/build/deploy | reproducible install, checks, build, hosted assets not 404 | CI+browser | commit and actions log |

**Gate:** all P0 tests pass; no unexplained mismatch; attach screenshots for C0/C1/C2 at specified viewport sizes, browser+device, commit hash, run log. P1 failures must be tracked with owner and decision. No unqualified PASS without execution.

## Suggested source layout (target, not yet implemented)
```
room-g2/
  README.md
  AGENTS.md
  CLAUDE.md
  package.json
  package-lock.json
  index.html
  public/assets/models/        # GLB only if actually used
  src/game/level.ts
  src/game/state.ts
  src/game/rules.ts
  src/game/routes.ts
  src/game/save.ts
  src/scene/assets.ts
  src/scene/scene.ts
  src/scene/camera.ts
  src/app/input.ts
  src/app/animation.ts
  src/app/ui.ts
  tests/unit/
  tests/e2e/
  evidence/g2_5/               # screenshots and non-sensitive QA logs
  .github/workflows/ci.yml
```

**Refactor strategy:** (1) Freeze unmodified HTML baseline and hash it. (2) Extract pure level constants and transition/save logic without behavior changes. (3) Add unit tests before restructuring 3D rendering. (4) Extract procedural assets + scene; no model replacement. (5) Extract browser UI and interaction. (6) Integrate Vite + TypeScript, only once parity tests are available. (7) Document mapping of old states/events to new modules. Avoid switching engines, adding Supabase, new levels, or visual polish here.

## GitHub landing plan (not executed)
1. Confirm which account/owner and repository are canonical; obtain explicit permission before creating or pushing anything.
2. Create private repository `room-g2-puzzle` (proposed), main protected; import original HTML verbatim and the licensing notice for the embedded Three.js library.
3. Commit `baseline/g2-html`; attach SHA256, screenshots and known defects; tag `g2-baseline`.
4. Branch `audit/g2-5` for tests and `refactor/game-core` for extraction. Each PR has scope, state parity proof and risk updates.
5. CI: dependency installation from lockfile, syntax/type checks, unit tests, build, browser smoke tests; fail if evidence/test result missing.
6. Deploy a *test only* browser demo via chosen static host; validate subpath, WebGL loading, assets and reset/save on actual URL. Preserve rollback to previous commit.
7. Publish `G2_5_ACCEPTANCE.md` with timestamp, commit, browser/OS, test table, screenshot links and GO/NO-GO decision.

## Agent implementation contract
Goal: Stabilize and validate ROOM G2 without adding levels.
Inputs: current HTML and Booklet v0.1; baseline commit must be recorded.
Allowed: tests/, src/game/, CI files, README; any scene or UI changes require separate PR.
Forbidden: new scenes, new mechanics, Supabase, gameplay redesign, unapproved asset replacement, change of game engine.
Deliver: diff summary, test commands and observed results, failing evidence, screenshots for critical poses, PR/commit hash, remaining risks.

## Gate decision
**HOLD G3** until the browser acceptance suite and clean GitHub build pass. `node --check` passed on the inspected copy only; no claim about 3D rendered correctness, functional browser tests, or remote deployment.
