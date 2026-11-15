# Bundled skill attribution

Tombuddy includes reviewed, modified skill instructions from the following open-source projects. Attribution does not imply affiliation, sponsorship or endorsement. No claim is made that these are objectively the best skills on the market.

## Anthropic frontend-design
- Author/source: anthropics/skills, frontend-design.
- Fixed revision: 1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064.
- Source: https://github.com/anthropics/skills/blob/1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064/skills/frontend-design/SKILL.md
- License: Apache License 2.0, full copy at skills/frontend-design/LICENSE.txt.
- Unmodified inspected source: skills/frontend-design/UPSTREAM.md.
- Modified instruction adaptation: skills/frontend-design/SKILL.md. Changed/condensed for Tombuddy's actual tools, explicit approvals, public summaries, no built-in browser and user data preservation. The modified file carries its own notice.

## Superpowers
- Copyright (c) 2025 Jesse Vincent.
- Source: https://github.com/obra/superpowers
- Fixed revision: 22f0b463e7a5e579904dd6211a520321035526f7.
- License: MIT. Full copyright/license text is included in each bundled skill directory.
- Included skill adaptations: systematic-debugging, test-driven-development, writing-plans, verification-before-completion, brainstorming.
- Unmodified inspected SKILL.md originals are retained as UPSTREAM.md in each directory. Adapted SKILL.md files explicitly identify modifications.
- Changes remove requirements for unavailable plugin subskills, helper references, subagents/worktrees, visual companions, mandatory commits and destructive deletion of pre-existing user implementation. Replace these with Tombuddy's actual tools, bounded execution, individual approvals and transparent reporting. These are Tombuddy adaptations, not unmodified drop-in copies of the entire upstream ecosystem.

## Tombuddy code-review
- Original skill by Tombuddy, distributed under MIT in skills/code-review/LICENSE.txt.

## Packaging and permissions
All included skills are Markdown workflow instructions. There are no executable upstream scripts, implicit installers, background updates or new tool permissions. Only adapted SKILL.md instructions are loaded into model requests. The original source and full license can be inspected in the desktop skill library. manifest.json records upstream revisions plus SHA-256 hashes of adapted instructions, originals and licenses; the runtime refuses modified bundled content that fails this integrity check. Integrity hashes do not replace macOS app signing or establish global trust.
