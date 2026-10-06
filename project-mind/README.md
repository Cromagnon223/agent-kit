# Starting a new project with the optimized agents

**App project (like claude.ai Projects):** open [project-instructions.md](project-instructions.md), copy everything under the line, and paste it into the new project's instructions. Every Claude in that project then starts lean, on the cheapest model.

**GitHub project in the cloud:** this is what it is, three lines.
1. What it is: the helper agents and rules in the `cloud/` folder of this repo; cloud sessions can't install plugins, so they read these files from the repo itself.
2. What to do: in the new repo's session, paste: "Copy .claude/agents/ and the block in CLAUDE.agent-kit.md (at the end of CLAUDE.md) from github.com/Cromagnon223/agent-kit/tree/main/cloud into this repo, then commit."
3. What happens next: every cloud session in that repo uses the cheap helper agents and the rules. 

**On your PC:** nothing to do; the installed plugin already covers every folder.

**Easiest:** in any new project's first message, type: `Run Project Mind: read github.com/Cromagnon223/agent-kit/project-mind/BOOTSTRAP.md and follow it.` The project then works out which setup it needs and does it. See [BOOTSTRAP.md](BOOTSTRAP.md).
