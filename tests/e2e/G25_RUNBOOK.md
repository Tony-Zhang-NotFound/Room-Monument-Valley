# Browser acceptance runbook — executable local G2.5 checks

2026-10-18: real Chromium / WebGL execution is recorded in `evidence/g2_5/current/`; see `G2_5_ACCEPTANCE.md`. The detailed instructions below are the acceptance contract, not a claim that remote hosting or physical hardware QA ran.

## Repeat the automated local run

Use the existing isolated checkout; do not create a worktree unless explicitly requested. Check Git root, remotes and user changes. Preserve `baseline/`, `g2-baseline` and the uploaded bundle. Current tools: Node 24, Python 3, system Chromium, system ffmpeg and cloud-provided Playwright 1.62.1. No application dependency install is needed.

From `/workspace/room-g2`:

```sh
node --test --test-reporter=tap tests/*.test.mjs
ROOM_PROJECTION_OUTPUT=/tmp/room-projection.json node tests/g25-projection.mjs
node scripts/bundle.mjs
sha256sum ROOM_G2_Play.html baseline/ROOM_G2_Play.html
```

In a persistent terminal, serve the parent to exercise a non-root subpath:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory /workspace
```

Do not terminate unrelated listeners. Verify any existing listener serves this checkout, or use a free port and set `ROOM_TEST_BASE_URL`. These URLs are internal checks, not published previews.

Playwright video needs ffmpeg. This instance reuses the installed system binary via Playwright's supported browser-cache override. For the installed version, prepare once, preserving existing files:

```sh
mkdir -p /workspace/.cache/ms-playwright/ffmpeg-1011
test -e /workspace/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux || ln -s /usr/bin/ffmpeg /workspace/.cache/ms-playwright/ffmpeg-1011/ffmpeg-linux
```

Run sequentially to avoid CPU contention. Use a new evidence directory each run; do not overwrite prior evidence. Diagnostics needs an existing output directory. The runners use real WebGL with SwiftShader, not a renderer mock.

```sh
ROOM_EVIDENCE_DIR=/tmp/room-browser-rerun PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright node tests/e2e/browser-acceptance.cjs
ROOM_EVIDENCE_DIR=/tmp/room-browser-rerun node tests/e2e/browser-diagnostics.cjs
ROOM_EVIDENCE_DIR=/tmp/room-browser-rerun node tests/e2e/occluded-rotor.cjs
```

Overrides: `ROOM_TEST_BASE_URL` (trailing slash), `ROOM_CHROMIUM` (executable), `ROOM_EVIDENCE_DIR` (output). Do not substitute old screenshots for failed runs. `browser-results.json` groups T01–T19 and local T21; diagnostics records 30s idle, 30s interacting, C0 marker occlusion and touch emulation. The overview is a derived thumbnail sheet. Endpoint numbers are runtime debug projections, not image-recognition measurements. Engineering tolerance ≤1 CSS px is provisional pending author approval.

The first run failed on a browser-generated `/favicon.ico` 404. Only that exact optional request is now recorded as incidental; game request failures and JavaScript errors still fail. WebGL-disabled errors are expected only in T19's separate browser.

T20 hardware performance, human playtesting, authored visual tolerance, GitHub CI and deployment need separate evidence/decisions. Scripts do not grant permission for remote creation, push, merge or deployment. Candidate core modules remain unintegrated.

## Detailed acceptance steps

Run against the tested commit, on a supported real browser with WebGL. Record browser version, OS/device/GPU, DPR, URL and commit. Preserve browser console and network logs. Do not substitute DOM mocks or CPU renders.

1. Serve the repository at a test URL, including a non-root subpath. Load ROOM_G2_Play.html and source index.html. Verify no missing requests, WebGL canvas visible and no page errors.
2. Clear `room.atrium.g2.02`, reload. Confirm S/3/C1, not won. Rotate, wait for commit, walk to T. During both animations attempt camera input; stable state must remain unchanged until completion.
3. Pause mid-walk. Record player coordinates and stable state via `roomInspect()`, wait, confirm no movement; resume and finish. Repeat with reset while moving, confirm S/3/C1, no later stale completion.
4. At T, C1 and C2 must reject forward travel. Switch C0, traverse to F, then G, inspect win panel, replay without refresh. Record video for this sequence.
5. At T/turn0, capture C0, C1 and C2 at each viewport: 1600×900, 1200×900, 900×1600. Wait for camera animation and fonts. Capture full page plus canvas; name files `C0_1600x900.png` etc. Record actual canvas bounds, DPR and endpoint debug value. Check clipping, controls, character visibility, masking and edge joins. Approve pixel tolerance before marking T14 PASS. A/B are bridge endpoints; T/F are stable player anchors and are not intended to coincide.
6. Refresh during walk and rotation; restore latest committed checkpoint, not pending target. Undo after move/rotation, verify previous stable pose. Refresh intentionally clears in-memory undo history.
7. Set corrupt and wrong-version localStorage, reload; initial state and no crash. Test storage denial separately. Enable reduced motion and traverse all transitions.
8. Click actual visible rotating stairs and movement markers; log coordinates/hit outcomes. Check button fallback when scenery obscures targets. Do not change raycast semantics under this acceptance task.
9. Disable WebGL using supported browser settings and verify visible, readable initialization error. Capture screenshot.
10. On named desktop hardware record FPS/frame times for 30 seconds idle and 30 seconds interacting. Compare with Booklet's approved targets; do not equate software-rendered CI performance with target hardware.
11. Record T01–T21 individually, console/network errors, failure evidence and final reviewer decisions. Screenshot absence or blocked execution keeps release NO-GO.
