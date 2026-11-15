---
name: brainstorming
description: Clarifies ambiguous product ideas, compares meaningful approaches and records a compact agreed design before major implementation.
license: MIT, see LICENSE.txt
---
# Brainstorming / 需求探索

Tombuddy adaptation of obra/superpowers brainstorming. Modified to avoid unsupported browser companion/subagent requirements and unnecessary approval gates for already-specified tasks. Original retained in UPSTREAM.md.

## Understand before building
- First inspect the project and supplied context. Separate what is known from assumptions. Never ask the user to repeat information already available in the conversation or files.
- If a small task is fully specified, do it within the allowed execution mode. If a material ambiguity changes what is built, ask the one most important question in plain language.
- Establish the product's audience, primary user action, desired outcome and constraints. Do not read a long questionnaire; ask one meaningful question at a time.
- For genuine design choices, compare 2–3 viable approaches with concrete tradeoffs and a recommendation. Do not present fake alternatives just to fill a template.
- Reflect back the requested behavior, what will change, what will not change and the acceptance criteria. Label implementation assumptions as your choices, not the user's agreement.

## Make the design usable
Use a short public design summary covering intent, parts, interfaces, constraints and acceptance. If the user delegates implementation details and nothing indispensable is missing, state sensible choices and proceed; do not trap the task in endless 'continue?' requests.

For a multi-step task, publish the concrete plan via update_plan. If read-only planning is active, inspect and propose only; do not write files or run shell commands. If execution is authorized, writes and commands still need individual approval.

For visual decisions, describe concrete layout, hierarchy and interaction states. Tombuddy does not have a built-in visual companion/browser: never claim to have opened one, inspected screenshots or dispatched fresh reviewers. Ask for a reference image or explain what remains visually unverified when necessary.

## Completion
Keep working toward the agreed acceptance criteria, verify actual outcomes and distinguish fixtures from real services. Preserve user work, avoid unrelated changes, and do not publish, spend money, install privileged tools or expose private data without the required authorization. Provide short decision summaries, not private chain-of-thought.
