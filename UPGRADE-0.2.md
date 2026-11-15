# Tombuddy 0.2 — reasoning + curated skills

Historical release checkpoint. Superseded by installed 0.3.0: see `WORKFLOW-0.3.md`, `FIX-CONNECTION-0.2.1.md`, and the latest section of `PROGRESS.md`. Original one-live-request authorization is spent and its guard remains binding.

## Decisions / scope
- User requested stronger Claude-Code-like reasoning experience and built-in high-quality skills. Build real provider controls + honest activity/plan UI, never fabricated hidden chain-of-thought or guaranteed model parity.
- Composer standard/deep/max levels, read-only planning mode; per-provider explicit reasoning protocol (auto/disabled/OpenAI effort/Anthropic budget/adaptive/Gemini budget/level/DeepSeek/Qwen/OpenRouter). Unsupported models produce visible warnings/errors, no silent downgrade/retry bills.
- Real update_plan tool (model-authored public steps, not internal thoughts). App-derived timestamps/status, actual tools/results, usage when provider returns it.
- Preserve exact signed Anthropic thinking blocks and Gemini signatures/parts through tool rounds and restart, isolate by provider/model to avoid replaying encrypted blocks across accounts. DeepSeek reasoning_content replay for tool use.
- Curate 7 non-executable skills; 6 adapted from reviewed upstream originals + original Tombuddy code/security review. Offline packaged source/licenses/provenance. Manual selection, slash commands and transparent deterministic auto activation; disabled skills stay disabled and cannot bypass approvals.
- No new npm runtime dependencies. Existing state backward compatible; upgrade in isolated profiles and keep installed 0.1 app backup before replacement.

## Source review
- GitHub REST API returned 403. Alternative git ls-remote + raw.githubusercontent.com succeeded.
- anthropics/skills pinned 1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064: frontend-design SKILL.md + per-skill Apache-2.0 LICENSE.txt read in full.
- obra/superpowers pinned 22f0b463e7a5e579904dd6211a520321035526f7: systematic-debugging, test-driven-development, writing-plans, verification-before-completion, brainstorming SKILL.md + MIT LICENSE read in full.
- Use explicitly marked adaptations to remove unsupported subagent/worktree/plugin dependencies, never auto-delete user work, preserve approval boundaries. Original sources retained for inspection; no upstream scripts execute.
- Provider docs downloaded/reviewed: platform.claude.com extended-thinking/thinking (budget >=1024, max_tokens > budget, adaptive for new Claude generations, exact signature/redacted block preservation); OpenAI reasoning guide; Gemini thinking guide; DeepSeek thinking mode (reasoning_content replay with tools). Review files /tmp/tombuddy-api-review, upstream originals /tmp/tombuddy-skill-review.

## Implementation / verification plan
1. Failing reasoning request, exact replay, skill selection/integrity and planning-validation tests.
2. Backend skills/reasoning modules; integrate main loop and preload.
3. Modular UI skills library, composer thinking controls and activity panel; retain existing app features.
4. Build/test/audit; package; run old desktop tests + new 0.2 skill/planning/reasoning/restart tests (120s bound each). Explicitly synthetic local API fixture, not real external model evidence.
5. Upgrade installed app without modifying user profile data, verify final installed bytes and clean default startup. Archive/hashes/docs.

## Status checkpoint
- Implemented offline 7-skill library, provenance/license/source viewer, selection + disable + automatic preferences, slash dispatch, real prompt injection and permission-preserving adapters.
- Added native thinking protocol controls, public update_plan, real timestamped activity, usage reporting, exact signed Anthropic/Gemini replay, account-context isolation and interrupted-response recovery.
- 18/18 core tests pass. Packaged .app passes original regression desktop script and new 0.2 acceptance script; audit 0 vulnerabilities. /tmp/tombuddy-02-pack.log and artifacts/02-desktop-results.json contain evidence.
- Fixed stable accessible API protocol labels after the first 0.2 UI test timeout; retested successfully rather than weakening assertions.
- User authorized opening CC Switch. Read its sqlite DB read-only, found DeepSeek / claude-desktop endpoint https://api.deepseek.com/anthropic and a nonempty credential; never printed secret values, changed CC Switch or made a model request at that stage.
- User then explicitly authorized importing that configuration into Tombuddy and ONE potentially billable real API test. Implemented a single no-tools connection probe (requested output <=256 tokens; DeepSeek low effort), no automatic retries, no redirects, encrypted key storage and a durable attempt marker that prevents accidental reruns.
- Reviewed DeepSeek official Anthropic compatibility docs: thinking enabled/disabled supported, budget_tokens ignored, output_config.effort supported. Added distinct deepseek-anthropic protocol instead of pretending a Claude thinking budget works. Source config has no model; choose documented deepseek-flash rather than expensive claude-opus mapping, explicitly record choice.

## Final verified delivery
- Backed up the installed 0.1 app to release/backups/Tombuddy-0.1.0.app, and original state to a private state.before-0.2-*.json file. Installed 0.2 atomically via staging; app.asar `cmp` matches final build.
- Ran `node scripts/import-ccswitch-deepseek.cjs --authorize-one-live-request` ONCE after the user's explicit authorization. Imported into the actual default Tombuddy profile using safeStorage. CC Switch DB was opened read-only and never changed by our code.
- Real endpoint https://api.deepseek.com/anthropic, documented model deepseek-flash (source did not specify a model), requested thinking enabled / low effort, max_tokens 256, no tools, no redirect and no automatic retries.
- REAL RESULT: OK, ~0.6s, input_tokens 46, output_tokens 2, cache counts 0. Observed exactly 1 main-process fetch to api.deepseek.com. No public thinking summary returned on this trivial prompt. This proves connectivity, not complex reasoning quality or tool competence.
- Evidence and rerun guard: artifacts/deepseek-live-attempt.json (status passed, requestsObserved 1), artifacts/deepseek-live-result.png. DO NOT delete/overwrite the attempt marker or spend again without fresh user authorization.
- Verified actual key absent from public renderer state and plaintext state.json; encryptedKey present. Scanned 61 project source/artifact files for the actual credential without printing it: 0 plaintext matches.
- `npm test`: 18/18 pass. `npm audit`: 0 vulnerabilities. `npm run test:desktop` passes BOTH original regression and 0.2 acceptance against packaged build, then again with `TOMBUDDY_TEST_EXECUTABLE="$HOME/Applications/Tombuddy.app/Contents/MacOS/Tombuddy"` against installed copy. All automated model responses use explicit local fixtures and isolated profiles; native dialogs stubbed. No additional live billable tests.
- Restarted final installed app with DEFAULT profile: version 0.2.0, app.isPackaged true, file:// installed app.asar renderer, 7 built-in skills, real imported DeepSeek key retained, no fixture providers. Evidence artifacts/02-installed-startup.json and 02-installed-home.png. No live test invoked during startup check.
- Final app opened normally via `open "$HOME/Applications/Tombuddy.app"`, process confirmed running. Development server not required.
- Archive release/Tombuddy-0.2.0-mac-arm64.zip (~119 MB), SHA256 01215e7f0e3ab9c3fb177de38a47dc7ee817e8deac3e7094797c166998d5bd99.
- Final app.asar SHA256 e471d15ab539754c01b53c002d9b3e6bc8781d29372ba0e3cca49ce22d3315cb. Checksums in artifacts/SHA256SUMS-0.2.txt.
- README.md updated for 0.2, skills/source/licenses, actual DeepSeek evidence, billing limits, signed context, permissions and remaining parity limits.

## Remaining limits / next step
- User can use the imported DeepSeek provider immediately and select deep/high thinking plus skills from the composer. All further model conversations may incur provider charges under the user's normal app usage; do not initiate extra harness tests without authorization.
- Real Anthropic/OpenAI/Gemini account requests, long multi-round DeepSeek project work and quality improvements are not independently live-verified. Local fixtures establish transport/workflow behavior only.
- No private Claude chain-of-thought or guaranteed 1:1 model parity. No MCP/subagent/plugin ecosystem/attachments/full terminal/context compaction. Only macOS arm64 tested; app remains unsigned/unnotarized.
- If continuing, first read this checkpoint and the live-attempt marker. Do not repeat the authorized single live test.
