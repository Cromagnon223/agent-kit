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
