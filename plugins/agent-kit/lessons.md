## Shared lessons (from the Agent Kit project; ships to every install through updates)
Read before each piece of work. Add one line per delivery or correction; keep the top 20.
- Collect every constraint up front (offline or online, OS, who runs it, GUI or terminal). Constraints that arrive one by one cause rebuilds.
- Deliver through an auto-updating channel (a GitHub plugin or marketplace) from day one; never make the user download repeat zips.
- Never ask the user to reinstall or redo a setup step.
- Don't ask clarifying questions or offer menus; pick the best default, say it in one line, and finish.
- Check work against the first request only at milestones (the plan and the final result), not every step.
- Report in one main place; keep helper threads quiet and short.
- Ship one-time files as zips with no spaces in the zip name; bare .bat files won't download from the app.
- Don't assume UI exists (the desktop "Code" tab may be missing); ship a launcher that works anyway.
- Explain the "why" in terms of the original goal (cutting Claude's token use and cost).
- Pick the cheapest model that can do the job; send reading, lookups and tests to Haiku helpers.
- Grade your own work from the logs (tokens per task, cheap-model share, rework, questions, goal, Orchestra) and work on the weakest score first.
- Every delivery says, in 3 plain lines, what it is, what to do (clicks only), and what happens next.
- Before shipping, run a user-check: double-clicks only, no re-download, no UI you haven't confirmed exists on their setup.
- Ship the deliverable that serves the goal first; side tools come later.
- Watch the confusion rate (messages that are "what is this / what do I do" or corrections); it is the costliest waste.
