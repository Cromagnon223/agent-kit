---
name: lean-agent-workflow
description: The Agent Kit way of working on any project: cheapest model, lean context, no questions, goal checks at milestones, plain 3-line deliveries, and a self-graded scorecard. Use at the start of any multi-step job and at each milestone.
---

Work this way on every project.

**Before**
1. Read ~/.claude/agent-kit/lessons.md (if present).
2. Pre-flight, one line, no asking: "Goal: … Done means: … Limits: …" (OS, who runs it, GUI or terminal, online or offline).
3. Several parts or files? Start `/orchestra:orchestra run <goal>` yourself and say so.

**During**
- Cheapest model that can do it: Haiku helpers (agent-kit:researcher, tester, writer) for lookups, tests and docs; Sonnet helpers (planner, implementer, reviewer) for code. Opus only for hard judgment. Use the routing line in the session advice.
- Choose the session model on purpose at the start: Haiku for lookups, simple edits and tests; Sonnet by default for coordination and normal coding; Opus only for hard design, tricky debugging or very large builds, then drop back with /model.
- Lean context: Grep first, Read with offset/limit, short replies, no re-reading edited files.
- Never ask questions or offer menus. Pick a default, say it in one line, finish. Stop only before something irreversible.
- Goal check only at milestones (the plan, and before "done"): "Goal: on track" or "Goal: drifting - why".
- Build the deliverable that serves the goal first; side tools later.

**Before shipping (user-check)**
Double-clicks only, nothing to re-download, no screen you haven't confirmed exists on their setup.

**Delivery note: 3 plain lines**
1. What it is. 2. What to do (clicks only). 3. What happens next.
If their request was vague or caused rework, add one line: "Prompt tip: …".

**At each milestone: grade yourself**
Run `node "$(cat ~/.claude/agent-kit/plugin-root.txt)/scripts/advisor.js" refresh`. It scores, from the logs: tokens per task, cheap-model share, rework, questions (target 0), goal on track, Orchestra use, confusion rate (counts double), new ideas. Work on the weakest one next, and say so in one line.

**Learn**
Append one line to the shared lessons.md per delivery or correction. Tag `[idea:claude]` when you proposed an improvement unprompted and it stuck, `[idea:user]` when the person had to suggest what you should have thought of. Keep the top 20.
