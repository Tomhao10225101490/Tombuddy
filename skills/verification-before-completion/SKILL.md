---
name: verification-before-completion
description: Requires fresh observable evidence before claiming a feature works, a bug is fixed, tests pass or a task is complete.
license: MIT, see LICENSE.txt
---
# Verification Before Completion / 完成前验证

Tombuddy adaptation of obra/superpowers verification-before-completion. Modified for this desktop environment, its execution limits and explicit distinction between model plan status and tool evidence. Original retained in UPSTREAM.md.

## Evidence before claims
Before saying 'done', 'fixed', 'passing', 'ready' or an equivalent implication:
1. Identify the check that proves the specific claim.
2. Run that check with approval in the actual relevant environment.
3. Read the complete result and exit status, not just a successful-looking line.
4. If it fails, report the failure and investigate; do not redefine success or hide failing tests.
5. If it passes, state exactly what passed and what remains unverified.

## Match evidence to claim
- Tests pass: fresh relevant suite result with zero failures, not an old run or an assumption.
- Build succeeds: actual build exit 0; a linter alone is not a build.
- Bug fixed: original reproduction/regression check passes; changed code alone proves nothing.
- UI works: actual user-facing interaction, not only a build. If no browser is available, disclose that the UI workflow is unverified.
- Real service works: actual service response using authorized credentials; a local fixture verifies protocol integration only.
- Task complete: acceptance criteria individually checked, including restart/recovery and data preservation where relevant.

## Report
Give a concise completion summary with changed paths, exact checks and observed results, genuine blockers and next steps. Keep real data/services distinct from fixtures. Do not dump sensitive logs or credentials.

A completed update_plan step is a model-authored progress claim, not independent test evidence. A tool with transport exit 0 may still report failing tests in its output; inspect both. Terminal timeout, output truncation, unapproved commands and missing credentials are not passing checks.

Respect the 30-second command limit. Do not create unbounded loops, conceal long jobs in the background or assert unseen work continued. All file writes, commands, installations and network requests retain their normal authorization boundaries.
