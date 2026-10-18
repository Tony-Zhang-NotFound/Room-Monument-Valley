# ROOM interactive test hosting — GitHub Pages

The repository is Public, verified from GitHub's logged-out repository page on 2026-10-18 (`isPrivate: false`, visible Public badge, HTTP 200). No Vercel, Netlify, Pages workflow, CNAME, or local hosting-project binding was found. Use GitHub Pages only; do not configure a second host.

Test deployment is explicitly authorised. G2.5 HOLD remains a quality status, not a reason to prohibit a test site. No production release, backend, new gameplay, or assets are part of this work.

## Files and publishing source

- `main` contains the authoritative source, acceptance history and deployment tooling.
- `g2.5-acceptance` and `g2-baseline` remain preserved.
- `gh-pages` contains generated static files only: a self-contained `index.html`, the unchanged downloadable `ROOM_G2_Play.html`, the engine licence, `.nojekyll`, a test-only robots policy and `deployment.json`.
- `deployment.json` records the exact source commit and HTML SHA256. The live page adds a visible “测试试玩 · G2.5 HOLD” note without modifying the game scripts or frozen source.

Generate a new output directory (must not already exist):

```sh
node scripts/prepare-pages.mjs /tmp/room-pages-site
```

Serve it locally for artifact preflight:

```sh
python3 -m http.server 8877 --bind 127.0.0.1 --directory /tmp/room-pages-site
node tests/e2e/deployed-smoke.cjs http://127.0.0.1:8877/ /tmp/room-pages-local-evidence
```

Publish the generated directory to `gh-pages` while preserving any existing branch history; never force-push. Pages must use **Deploy from a branch → gh-pages → / (root)** in the repository's Settings → Pages. If it is not enabled, this one-time repository-admin setting is needed; do not treat pushing the branch alone as proof that hosting is active.

Expected URL after successful Pages activation/build:

`https://tony-zhang-notfound.github.io/Room-Monument-Valley/`

That is a deployment target, not a claim of verified availability. Check its actual HTTP response, deployment metadata and real browser before reporting success.

## Hosted validation

```sh
node tests/e2e/deployed-smoke.cjs https://tony-zhang-notfound.github.io/Room-Monument-Valley/ /tmp/room-pages-online-evidence
```

The script uses the supplied HTTPS proxy for external hosts and retains TLS verification. It checks WebGL 2 rendering, the HOLD note, rotation, movement, two camera changes, full traversal, replay/reset, the downloadable file hash and game errors. It records the source commit, URL and real browser screenshots. Local preflight is labeled explicitly and cannot substitute for hosted evidence.

## Observed environment and access errors

These are separate failures:

1. The user-visible Codex message was **“无法发布环境。请尝试重新发布。如果仍然失败，请反馈此问题。”** with no error code. This concerns the existing portfolio development environment; it is not a ROOM hosting log. This task cannot inspect the product's hidden publication backend. Its cause remains undiagnosed.
2. In this cloud task, GitHub REST requests fail before reaching GitHub: `Get "https://api.github.com/repos/Tony-Zhang-NotFound/Room-Monument-Valley": Forbidden`. An unauthenticated curl probe confirms **`CONNECT tunnel failed, response 403`** from the egress proxy. The Pages hostname has the same CONNECT failure. This is not evidence that the repository is private or that GitHub rejected the supplied token.

Git transport and public `github.com` HTML work; the source and evidence were re-cloned and checksum-verified. This environment is still bound to the portfolio repository and startup instructions. Preserve that binding, scripts, network configuration, files, branches and remotes. A temporary saved network-draft addition was reverted to its prior custom allowlist; it was not published.

If those network restrictions prevent completion, use a separate ROOM cloud environment rather than altering the portfolio environment. Select `Tony-Zhang-NotFound/Room-Monument-Valley`, branch `main`, and allow `api.github.com` and `tony-zhang-notfound.github.io` alongside the existing GitHub/package-manager presets. Reuse injected GitHub authentication; never request tokens solely because a REST request was blocked by the proxy. Git push access does not establish Pages-admin API access: inspect the actual API response once connectivity works. If Pages-admin access is denied, use the one-time Settings → Pages selection above.

Local source startup in that environment (no npm installation needed):

```sh
cd /workspace/Room-Monument-Valley
python3 -m http.server 8765 --bind 0.0.0.0
```

Then inspect Pages configuration/logs and run the hosted smoke command. Retain screenshots only from actual successful online runs; do not label local screenshots as online.
