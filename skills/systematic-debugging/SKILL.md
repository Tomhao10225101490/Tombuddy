---
name: systematic-debugging
description: Investigates reproducible root causes of bugs, test failures, build errors and unexpected behavior before making targeted fixes.
license: MIT, see LICENSE.txt
---
# Systematic Debugging / 系统化调试

Tombuddy adaptation of obra/superpowers systematic-debugging. Modified to remove unavailable plugin/reference dependencies, prevent credential logging, and fit explicit approval and bounded execution. Original retained in UPSTREAM.md.

## Core rule
Find evidence for the root cause before proposing fixes. Do not guess repeatedly or disguise symptom suppression as repair.

## Four phases
1. **Investigate.** Read the full error and stack trace; identify exact reproduction steps, expected versus actual result and environment. Inspect recent relevant changes when Git is available. Read key files before editing. At component boundaries, inspect which value/config enters and leaves. Log secret presence only, never API keys, tokens or full credential-bearing environments.
2. **Compare.** Find a working nearby example. List relevant differences in inputs, versions, configuration and state. Follow the bad value backward to its source, not just the last place it crashes.
3. **Test a hypothesis.** State a short public hypothesis with the observed evidence and the smallest discriminating test. This is a concise decision summary, not private internal reasoning. Change one variable at a time. If the result disproves it, update the hypothesis rather than stacking patches.
4. **Repair and verify.** Add a minimal regression test; observe its specific failure; implement a focused fix; rerun the original reproduction plus the relevant suite. Report exact commands, exit status and remaining limits.

## Working behavior
- For a multi-step task, call update_plan with investigation, reproduction, fix and validation steps. Mark only genuinely performed steps complete; plan status is not proof of passing tests.
- If tests need services/credentials or a browser Tombuddy lacks, say so. Never silently replace the failing real dependency with fixture data and claim the issue fixed.
- Preserve unrelated changes and user data. Avoid broad refactors in a focused bug fix.
- After 3 unsuccessful hypotheses, stop guessing, summarize evidence and reassess the architecture or ask for the missing indispensable input.
- Respect execution limits. Terminal calls time out after 30 seconds; use an appropriately bounded command or explain why the test cannot complete here. Do not spawn hidden background work to evade limits.
- If the cause remains environmental or external, distinguish evidence from uncertainty and report the actual blocker.

## Permissions
A skill does not authorize destructive work, installations, network access, spending money or skipping write/command approval. Use only the tools offered by Tombuddy; do not request unavailable subagents or referenced upstream helper files.
