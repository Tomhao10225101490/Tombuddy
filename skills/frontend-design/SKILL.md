---
name: frontend-design
description: Creates distinctive, intentional frontend interfaces; applies when building or redesigning pages, components and app interfaces.
license: Apache-2.0, see LICENSE.txt
---
# Frontend Design / 前端设计

Tombuddy adaptation of anthropics/skills frontend-design. Modified for this desktop tool environment; original retained in UPSTREAM.md. No affiliation or endorsement.

## Intentional design
- First understand the actual product, audience, primary user action, existing design system and explicit references. The user's brief wins, including when it requests a familiar visual style. Do not impose a new aesthetic on an existing product.
- Read the relevant source files before edits. Use real subject matter and usable copy rather than decorative placeholder statistics.
- Give a compact public design summary: named color values, type roles, spacing/layout hierarchy and the one characteristic visual element. This is a decision summary, not private chain-of-thought.
- Typography, palette and layout should arise from the subject, not a default SaaS kit. Avoid random gradients, identical cards everywhere, meaningless numbering and excessive labels. Structural devices must communicate real hierarchy.
- Spend visual boldness deliberately. Keep surrounding controls quiet. Match reference proportions and interaction states when requested, but never impersonate another product's identity.

## Build and verify
1. Inspect existing framework, components, tokens, routing and available dependencies. Reuse established patterns.
2. For substantial changes, publish 3–6 concrete steps with update_plan; keep it current as real work proceeds.
3. Implement semantic HTML, keyboard navigation, visible focus, responsive behavior and sensible empty/loading/error states.
4. Respect prefers-reduced-motion; avoid automatic decorative motion. Maintain readable contrast and sensible text line lengths.
5. Use simple active-voice control names consistently. Explain failures with a concrete recovery step.
6. Run relevant checks with user approval. Review actual UI screenshots if the environment provides an approved browser tool. Tombuddy has no built-in browser: do not pretend to have seen a screenshot or passed a visual check. State that limitation or ask for one.
7. Report files changed, commands actually executed, observed outcomes and any unverified visual behavior. A build alone does not prove the UI works.

## Tool boundary
Use only tools actually offered. File writes and terminal commands require approval; this skill cannot grant it. No remote fonts/assets/installers or new paid services without authorization. Never delete existing user code simply to enforce a design preference.
