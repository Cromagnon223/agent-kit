# Project Mind report

Recipe for a coordinator to build or refresh its project's report page. Use Sonnet, ask the user nothing, finish with 3 plain lines (what it is, the link, what happens next).

## When
At each milestone, and when the user asks how the agents are doing. First time: publish a new standalone Artifact (check `list_project_artifacts` first). After that: republish the same link as a new revision.

## Page layout (plain words, no jargon)
1. Goal line at the top, copied from the project's north star.
2. One minute summary: 2-3 sentences.
3. Who did what: coordinator and each helper thread with its model and token share (a bar per thread).
4. Scorecard: one card per metric with grade A-F and one plain sentence of why: tokens per task, cheap-model share, rework, questions asked (target 0), goal on track, Orchestra or helper use, confusion rate (target under 10%), ideas. Outline the weakest.
5. Overall grade (average of the grades) and trend against the last report.
6. Next focus (the weakest metric) and at least one new improvement idea.

## Data
- App projects: project chat and helper threads. Tokens per thread: `list_events(kinds=["result"])` on the thread session (cumulative). Models used, questions asked, user corrections: count from the chat.
- GitHub or PC projects: use what the repo and the kit report card already measure.
- Mark every estimated or unmeasured number on the page. Never invent a count.

## Then
Add one line to `lessons.md` if the report exposed a miss or an idea (tag `[idea:claude]`). Reference example: the report for "Claude Optimization/Workflow", https://claude.ai/artifact/RSpCG2v9SegTPapmEZsMdC.

## Verification status
Written 2026-10-06 with one report built from it. Untested: refreshing as a new revision, and building it for another project.
