# Agent Kit for Claude Code

This kit makes Claude Code use fewer tokens and cheaper models, and it tunes itself from your own usage. It installs from this repo and updates itself.

Starting a new project: [starter/](starter/README.md). How it all fits together, in plain words: [PIPELINE.md](PIPELINE.md).

## Install (Windows, one time)

Download **connect-agent-kit.zip**, unzip it, and double-click **Connect Agent Kit.bat**. It installs Git, Node.js and Claude Code if they're missing, then connects Claude Code to this repo with auto-update turned on.

On any OS, from a terminal:

```
claude plugin marketplace add Cromagnon223/agent-kit
claude plugin install agent-kit@agent-kit
```

## What's in it

| Plugin | What it does |
| --- | --- |
| `agent-kit` | 6 lean helper agents. `planner`, `implementer` and `reviewer` run on Sonnet; `researcher`, `tester` and `writer` run on Haiku. Each has minimal tools. Every session starts with short token-saving rules plus advice worked out from your last 7 days of Claude Code logs. At the end of each session, `~/.claude/agent-kit/lessons.md` is updated. `/agent-kit:token-dashboard` (or the Token Dashboard shortcut) opens a chart of your token use, topped by Claude's A-F report card (confusion rate counted double, new ideas, tokens per task, cheap-model share, rework, questions asked, goal on track, Orchestra use); the weakest score becomes the session's focus. Claude runs Orchestra on its own for multi-part jobs. Requires Node.js. |
| `orchestra` | [Orchestra](https://github.com/carloluisito/orchestra) 1.1.1 (MIT), with a 30K token budget per helper instead of 80K and a goal line on every plan. Installed automatically as a dependency. |

## Lessons

`plugins/agent-kit/lessons.md` is the shared self-improvement log. Claude reads it before work and adds one line per delivery or correction, keeping the top 20. It reaches every install with each update. On each PC, the session-end hook also keeps a local `~/.claude/agent-kit/lessons.md`, which combines rules learned from that PC's token logs with this shared list.

## Updates

Claude Code checks this marketplace at startup (`autoUpdate` is on). As a backup, the agent-kit session hook also runs `claude plugin update` in the background every 12 hours. Changes take effect at the next session.

**To release:** commit the change and bump `version` in the changed plugin's `.claude-plugin/plugin.json`. Clients only update when the version changes.
