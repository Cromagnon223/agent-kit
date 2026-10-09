# Project Mind bootstrap

For the Claude that reads this: use a Haiku or Sonnet sized budget, ask the user nothing, and finish with 3 plain lines: what you found, what you did, what happens next.

## 1. Work out which case you are in
- **Claude app project, you are the coordinator** (you can edit project settings and see the project's repositories): case A.
- **Claude app project, you are a thread session** (no settings tool): you cannot edit project instructions. Do the repo part of case A if a repo exists, then tell the coordinator in one line that the instructions step is theirs.
- **Cloud Claude Code session inside a repo**: case B.
- **Claude Code on the user's PC with the agent-kit plugin installed**: case C.

## 2. Do the missing setup
**A. Instructions.** Read the project instructions. If they contain the line `Project Mind: active`, skip. Otherwise append the text under the line in `project-mind/project-instructions.md` (from github.com/Cromagnon223/agent-kit, main) to the project instructions with the settings tool (the `instructions` field), keeping what is already there.

**A/B. Repo.** If the project has a repo, check it for `.claude/agents/` and a rules block marked from `CLAUDE.agent-kit.md` at the end of `CLAUDE.md`. If either is missing, have a thread (or yourself in case B) copy `cloud/.claude/agents/` and the block in `cloud/CLAUDE.agent-kit.md` from the agent-kit repo onto a new branch, then open a PR, wait for its checks, and merge it yourself (squash) once checks are green or absent, there are no conflicts and no open review threads; fix and re-push if checks fail, never merge red. Never push straight to the default branch. Kyle never merges: once a PR an agent opened in Kyle's own repos has green checks (or no CI), no merge conflicts and no open review threads, the agent squash-merges it itself and tells Kyle in one plain line. If checks fail, fix and re-push first; never merge red. Never merge other people's PRs or repos Kyle doesn't own, never force-push, rewrite history or skip checks. Production deploys are not covered.

**C.** Nothing to do. Say "the kit is already active here".

**No repo? Make one.** If the project (case A or B) has no repo, create it yourself with the GitHub create-repository tool: under Cromagnon223, private, named after the project in kebab-case, with a short README. Then attach it to the project (`add_repo` or project settings as your tools allow) and do the repo setup above. Never ask Kyle to create or connect a repo. If your tools cannot create one, say so in one line and pass the job to a session that can (coordinator, or a thread with GitHub create access), never to Kyle.

If the project has a repo, has no repo but cannot make one, and needs no instructions, say "nothing needed".

**Never guess.** Only state what you checked with a tool or can point to; say when something is inferred or unchecked. Unsure of a fact: look it up or leave it out. Unsure whether an action is safe or wanted: don't do it. (Unsure of a choice: pick a default and say which.)

**Keep tokens low.** Coordinator only routes; each session checks its model first and switches to Sonnet or cheaper (Haiku for simple work, Opus/Fable only for hard design, with a one-line reason in the brief); one task per thread, retire it when done; big files and logs go in a file, not the chat. At milestones read the Usage panel: Coordinator share above 30% or any session above 2M tokens means fix the cause first.

## 3. Report
At each milestone, also build or refresh the project's performance report page by following `project-mind/REPORT.md`.

3 plain lines. Mark anything you could not do as not done.

## Verification status
Written 2026-10-06. Untested: the settings tool name and `instructions` field (taken from the coordinator's tool list, not run), the repo check and open-PR-then-self-merge flow, and whether a brand-new project's first message reliably triggers this. The plugin check in case C is untested.

Merge tools by environment: cloud sessions have the GitHub MCP merge_pull_request tool (and enable_pr_auto_merge); `gh` exists in this container too. Neither has been run for a self-merge here, so untested. On Kyle's PC `gh` or git is assumed but untested (not checked on the device).
