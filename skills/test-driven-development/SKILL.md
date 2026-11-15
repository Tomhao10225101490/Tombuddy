---
name: test-driven-development
description: Implements features and bug fixes through observable red-green-refactor cycles and real behavior assertions.
license: MIT, see LICENSE.txt
---
# Test-Driven Development / 测试驱动开发

Tombuddy adaptation of obra/superpowers test-driven-development. Modified to preserve user work (never auto-delete pre-existing implementation), remove unavailable references and use Tombuddy's approved tools. Original retained in UPSTREAM.md.

## Red → Green → Refactor
1. Understand the requested behavior and existing test conventions before editing. Identify which production mistake would make the test fail.
2. Write one minimal regression/behavior test with a descriptive name and concrete inputs/expected outputs. Prefer real implementation behavior; mock only genuine external boundaries and disclose it.
3. Run the test before the implementation change and inspect the full result. It must fail because the behavior is missing/wrong, not because the import, environment, credentials or test itself is broken. An unexpectedly passing test needs a stronger assertion.
4. Implement the smallest focused production change that satisfies that behavior. Preserve unrelated changes and public interfaces.
5. Run the test again, then the relevant wider suite. Report any failure by name, including pre-existing failures; do not remove tests or weaken assertions to get green.
6. Refactor only after green; rerun checks after refactoring. Repeat for the next behavior.

## Quality checks
- Assert outputs, errors and observable side effects, not merely a mock's call count.
- Cover boundaries and failure paths relevant to the requirement, without overengineering hypothetical features.
- Keep test utilities out of production code. Understand a dependency's side effects before replacing it in a test.
- A newly added passing test without an observed baseline failure is useful coverage but is not evidence of a completed TDD cycle. Label it honestly.
- If implementation already exists, preserve it and use a safe isolated patch, a controlled reversible mutation, or a user-approved baseline to prove the regression test can detect the defect. Never delete user code or reset their repository to enforce a ritual.
- For non-executable deliverables or blocked environments, explain the alternative check and its limits rather than claiming tests passed.

## Execution
Use update_plan for a multi-step feature. Reading tools may inspect files; all writes and commands remain subject to user approval. Choose bounded commands compatible with the 30-second terminal limit. Report the actual red and green command results, changed paths, and unverified behaviors. No hidden subagents or automatic commits/publishing.
