# Browser acceptance runbook — NOT EXECUTED

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
