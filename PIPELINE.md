# How the pipeline works (plain words)

The goal: Claude uses fewer tokens, picks cheaper models, and gets better at finishing your goals with every project.

**1. One home.** This GitHub repo is the whole pipeline. Anything we learn goes here once, and every PC that has Agent Kit gets it automatically. You never download or reinstall anything again.

**2. Every Claude Code session starts with the rules.** Short rules plus advice worked out from your own logs are put in front of Claude automatically. The "lean-agent-workflow" skill holds the full routine, so every future project follows it.

**3. Claude does the job the lean way.** It states the goal in one line, uses cheap helper models, starts Orchestra on big jobs, and never stops to ask you questions.

**4. Claude grades itself.** A report card (A to F) is built from your logs: tokens per task, cheap-model use, rework, questions asked, staying on the goal, Orchestra use, confusion (counts double) and new ideas. You see it at the top of the Token Dashboard.

**5. The weakest score becomes the next focus.** It is added to the start of the next session and written to lessons.md.

**6. Lessons carry over.** After each delivery or correction, one line is added to lessons.md. Ideas Claude had on its own are tagged `[idea:claude]`; ideas you had to give are tagged `[idea:user]`. The goal is for the second kind to shrink.

**7. Helpers get cheaper on their own.** After 3 clean sessions a helper moves to a cheaper model; any rework moves it back up.

The detail for developers is in [README.md](README.md).
