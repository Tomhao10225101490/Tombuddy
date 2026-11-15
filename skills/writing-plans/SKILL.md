---
name: writing-plans
description: Converts multi-step requirements into concrete implementation plans with file paths, interfaces, acceptance checks and explicit constraints.
license: MIT, see LICENSE.txt
---
# Writing Plans / 任务规划

Tombuddy adaptation of obra/superpowers writing-plans. Modified to remove mandatory worktrees, plugin subskills, fresh-agent gates and automatic Git commits that Tombuddy does not provide. Original retained in UPSTREAM.md.

## A plan is a set of actionable decisions
- Read the relevant project structure, requirements and existing code. Reuse project conventions. Ask only questions whose answers would materially change the deliverable and are not already known.
- State the goal, assumptions, non-goals and acceptance criteria. Separate what the user asked from your implementation choices.
- Identify exact files/modules, the small interface changes connecting them, and failure cases. Group work into independently verifiable tasks, not dozens of ceremonial setup steps.
- Publish 3–8 short steps through update_plan, one in_progress step at a time. Put detailed public decisions in the response or, only with approval, a project plan file.

## Each implementation task includes
1. Exact paths to create/modify and existing interfaces to preserve.
2. A concrete behavior test or verification command and the observation that means success.
3. A minimal implementation step, with exact values where the spec fixes them.
4. A fresh verification step including the original user-facing workflow, not compilation alone.
5. Any required approval, credentials, service or platform dependency.

## Self-review
- Every requirement maps to a task and observable acceptance check.
- Names and interfaces agree across tasks. Dependencies occur in a sensible order.
- Cover likely inputs/failures the spec did not explicitly mention: empty states, cancellation, permission failure, unexpected API errors and preserving real user data.
- The plan should be shorter than the implementation, not a transcript of all the code.
- Distinguish planned checks from executed checks. Mark completed only after the work was actually done; test success still requires an actual result.

## Planning-only mode
When Tombuddy says read-only planning, do not call write_file or run_command and do not claim implementation occurred. Use list_files/read_file/update_plan only, produce the plan and report that no files changed. In execution mode, proceed within the user's task authorization and per-operation approvals without repeatedly asking for routine continuation.

Do not invent subagent execution, browser inspection, commits or background work. Refer only to capabilities actually available in this app.
