# Tombuddy 0.2.1 — apparent API disconnect investigation

**Delivered inside 0.3.0**, alongside the user's subsequent fixed-plan/Claude-style-control request. 0.2.1 was a development milestone, not a separate installed release. Final acceptance and installed bytes: `WORKFLOW-0.3.md`.

## Observed evidence (private content not copied)
- User reports repeated API disconnects. Existing installed app 0.2.0; exactly one running main process.
- Read only sanitized metadata from default profile: DeepSeek provider still present with encryptedKey=true, correct Anthropic endpoint/model. 2 sessions; state file ~832 KB; no corrupt-state recovery backups.
- Actual failed response A: content length 0, API reasoning length 33,015 characters; warning explicitly says output limit reached; old generic error '模型未返回文本或工具调用，请检查模型、推理预算与内容限制。'. This is output-budget exhaustion, NOT lost credentials.
- Actual failed response B: 12 completed API tool rounds, 15 completed tools and persisted 27 wire messages, followed by hard-limit error. This is task-budget exhaustion, NOT API disconnection.
- Existing UI routes every failure to '检查 API 配置', causing both valid configuration and completed work to appear disconnected.

## Plan / safety
1. Add regression fixtures for reasoning-only max_tokens, truncated/malformed SSE, interrupted tool JSON, HTTP auth vs network errors, and 12-round pause + continuation. No new paid API requests. Prior ONE-live-request authorization is spent; do not rerun import/live script or remove its marker.
2. Low-effort balanced standard mode specifically for DeepSeek to reduce reasoning-only starvation; retain explicit deep/high options and disclose semantics. Do not blindly increase token budgets or retry automatically.
3. Preserve partial output/usage on output-limit pause, never execute incomplete tool calls. Require an explicit stream completion signal before executing tools/claiming success.
4. Tool-round cap remains bounded at 12, but becomes a saved, resumable pause rather than a connection error; manual continuation is visible and may incur API fees. No automatic retry or unbounded loop.
5. Distinguish authentication/rate limit/server/network/timeout/protocol errors in UI; API settings remain stored. Add bounded metadata-only diagnostics (no prompts, outputs or secrets).
6. Protect normal local configuration workflow: persist model selection, independent skill/state loading, single-instance guard. Avoid deleting/reimporting user's key. Preserve both real sessions and encrypted credential during upgrade.
7. Build/core tests + packaged and installed isolated desktop acceptance, original regressions and new failure/recovery workflows. Back up current app and private state, install final 0.2.1, restart actual default profile with NO model requests.

## Status
- Implemented the fixes, encrypted credential retained on blank-key edits, persistent provider selection, independent skills/config loading, single-instance guard, and bounded shutdown flush.
- Red/green evidence: initial 7 new failure tests ALL failed against 0.2.0 (`/tmp/tombuddy-021-red.log`); after implementation 28 core tests and ALL THREE packaged desktop suites passed (`/tmp/tombuddy-021-desktop.log`). New suite proves 12 signed tool rounds pause, survive restart and continue with original results; synthetic fixture makes exactly 13 requests only after manual continuation, not automatic retry.
- Visual inspection found fast tool bursts can confuse old auto-follow scroll state; fixed user-intent tracking so app-derived scrolling doesn't suppress follow. Also exit immediately on explicit [DONE]/message_stop even if a proxy leaves the socket open; added a regression (now 29 core tests expected).
- COMPLETE in 0.3.0: 35 core tests, ALL FOUR packaged AND installed desktop suites, two actual default-profile startups via `scripts/verify-installed.cjs`, live credential decrypts and 54-file source scan (0 matches), both real sessions/content/tools/wire preserved and two legacy failures recovered as pauses. Final ZIP extracted and independently booted. No fresh real model request; marker unchanged. Backups retained, installed app opened normally.
- Before upgrade: 1 real provider, 2 original sessions, 0 unfinished responses; old app PID 51605 was idle and quit normally before replacement. After upgrade these counts/data and the encrypted key were independently verified unchanged. Current installed app is 0.3.0, reopened normally after final checks.
- Do not claim external network reliability independently verified: no fresh billable request is authorized or needed for these reproducible defects.
