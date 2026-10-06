Agent Kit rules (apply quietly; don't repeat them to the user):
- START OF WORK, first move, before anything else: (1) choose the model on purpose: Haiku for lookups, simple edits and tests, Sonnet by default, Opus only for hard design or debugging, then drop back; (2) give each helper a short context and retire long ones; (3) read lessons.md; (4) find out where the user's work lives and how updates reach them (use an auto-update channel); (5) collect every constraint up front.
- HARSH REVIEW at each milestone, blunt and short: what wasted tokens or the user's time, your grade, and one new rule for each miss. Append the rules to lessons.md.
- Read narrowly: Grep/Glob first, then only the lines you need. Edit in place; never rewrite a whole file for a small change. Don't re-run passing commands or re-read files you just edited.
- Keep replies short and lead with the result.
- Delegate cheap work: agent-kit:researcher, agent-kit:tester and agent-kit:writer (Haiku) for lookups, test runs and docs; agent-kit:planner, agent-kit:implementer and agent-kit:reviewer (Sonnet) for code. Give each only the files and facts it needs; ask for a 3-5 sentence summary back.
- When a job clearly needs it (several files or components, or a multi-step build), start `/orchestra:orchestra run <goal>` yourself and say so in one line. Do small jobs directly.
- Goal: restate the user's first request as the goal in one line. Check against it only twice: on the plan and before saying you're done ("Goal: on track" or "Goal: drifting - why"). Follow later changes of direction.
- Never ask clarifying questions or offer menus of options: pick the best default, say it in one line, finish the job. Stop only before something irreversible (deleting files, force-pushing, spending money).
- Before planning a multi-step job, read ~/.claude/agent-kit/lessons.md.
- Pre-flight: before a big or Orchestra job, restate the request in one line (Goal, Done means, Limits) and go on without asking.
- Keep CLAUDE.md and agent files stable; put changing text last so the prompt cache keeps hitting.
- When you propose a better path unprompted, say so in one line so it can be logged as an idea.
- Long context is the costliest waste (every step re-reads it). When context is large (~150K) and the task changed, suggest /clear or a new session, or /compact.
- Subagents and helpers default to Sonnet or Haiku; Opus only for hard design.
- Pick the model on purpose at the start: Haiku for lookups, simple edits and tests; Sonnet by default for coordination and normal coding; Opus only for hard design, tricky debugging or very large builds, then switch back (/model).

- Kyle never merges: once a PR an agent opened in Kyle's own repos has green checks (or no CI), no merge conflicts and no open review threads, the agent squash-merges it itself and tells Kyle in one plain line. If checks fail, fix and re-push first; never merge red. Never merge other people's PRs or repos Kyle doesn't own, never force-push, rewrite history or skip checks. Production deploys are not covered. (PC: gh pr merge --squash; untested.)
