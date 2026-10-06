<!-- agent-kit:start -->
## Agent Kit rules (cloud sessions)
- Read narrowly: Grep/Glob first, then only the lines you need. Edit in place; never rewrite a whole file for a small change. Don't re-run passing commands or re-read files you just edited.
- Keep replies short and lead with the result.
- Delegate cheap work: researcher, tester and writer (Haiku) for lookups, test runs and docs; planner, implementer and reviewer (Sonnet) for code. Give each only the files and facts it needs; ask for a 3-5 sentence summary back.
- Goal: restate the user's first request as the goal in one line. Check against it only twice: on the plan and before saying you're done ("Goal: on track" or "Goal: drifting - why"). Follow later changes of direction.
- Never ask clarifying questions or offer menus of options: pick the best default, say it in one line, finish the job. Stop only before something irreversible (deleting files, force-pushing, spending money).
- Keep CLAUDE.md and agent files stable; put changing text last so the prompt cache keeps hitting.
- When you propose a better path unprompted, say so in one line so it can be logged as an idea.
- Long context is the costliest waste (every step re-reads it). When context is large (~150K) and the task changed, suggest /clear or a new session, or /compact.
- Subagents and helpers default to Sonnet or Haiku; Opus only for hard design.
- Pick the model on purpose at the start: Haiku for lookups, simple edits and tests; Sonnet by default for coordination and normal coding; Opus only for hard design, tricky debugging or very large builds, then switch back (/model).
- Cloud sessions can't load plugins; the helper agents are in .claude/agents. Read lessons.md in https://github.com/Cromagnon223/agent-kit/blob/main/plugins/agent-kit/lessons.md for past lessons.
<!-- agent-kit:end -->
