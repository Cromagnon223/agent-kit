# Build-project handoff: lessons from an 87-build decompile-to-port

Paste this into a new project or session. It stands alone. Rules first, ordered by how much they saved.

## Start of work (do these before anything else)
1. Write one line each: **Goal**, **Done means**, **Limits** (OS, who runs it, offline or online, GUI or terminal). Scope that arrives later causes rebuilds.
2. Find where the user's work lives and how results reach them (a link, a repo, one shared folder). No repeat downloads.
3. Set up the build loop below if the repo lacks it. It is one small PR.
4. Read the facts ledger and the inbox before touching code.

## Build loop (set up once, first build)
- **One check command** (`tests/run.sh`): one `ok`/`FAIL` line per check, full output to `.cache/test.log`, prints only the last ~15 lines on failure. Agents read the tail, never whole logs.
- **Real-target check early.** Run the output in the real engine or program, not only unit tests. Make it fail on a known-bad input once before trusting it (a crash after the first log line looked like a pass).
- **Cache the expensive tool** (engine, compiler) in `.cache/`, keyed on its version; same in CI. First build slow, every later one seconds.
- **Facts ledger** (`docs/FACTS.md`): every format fact, rate, unit or rule is **confirmed** (source line, data, or a run) or **inferred** (and what would confirm it). One guessed rate ran everything at half speed for 40 builds.
- **Inbox file** (`docs/INBOX.md`): agents leave notes for each other there; no relays through a coordinator (each relay costs two extra sessions a turn).
- **CLAUDE.md workflow block** naming the check command, ledger and inbox, so every new session starts with them.

## Rules while building (highest payoff first)
1. **One lead plus at most one helper.** On a usage-capped plan, more parallel agents only hit the limit sooner (four agents hit it three times in one day, ~6 hours idle).
2. **Fresh, short-lived sessions.** Long threads re-read their whole history every step; that was the biggest token cost. Hand over through a handoff file every ~6 builds or at ~150K context.
3. **Keep logs out of context.** Write to a file, read the tail; send big reads to a helper that returns 3-5 sentences.
4. **Read the source before inventing a rule.** Read the original's code, its callers and its data flags before tuning numbers. Every time a number was tuned first, the real answer was a flag or a gate in the code.
5. **Aim each check at the one thing the change touches** (one file, one map, one screenshot crop). Wide sweeps cost extra runs to tell right from wrong.
6. **Unknown fact means skip, not guess.** Write "needs fact X" in the ledger and move to the next item.
7. **A check that confirms you already match is worth recording:** it turns inferred into confirmed so nobody re-checks it.
8. **Count a reported symptom before fixing it,** with a switch that turns the fix off, so before and after come from the same run and build.
9. **Test the original early.** If the original program can run on the user's machine, compare against it from the start; don't inherit "can't be launched" as a fact.
10. **Never do file I/O per event on the main or render thread** (one log line per hit caused visible stutter).
11. **Shared machine:** cap hidden check runs (frame rate, `-j 4`), keep them hidden and muted, check free disk before a build.
12. **Write patch scripts with the editor tool,** not shell heredocs (quotes break on Windows shells).
13. **A system added to every screen must not need a resource that exists only later**; a hidden run from the first screen catches it.
14. **Pace guard:** on a usage-limit warning, ship the current build and start nothing new until the reset.
15. **When the queue runs out of confirmable work, continue down the parked list** instead of waiting for input.

## Working with the user
- No questions: pick the best default, say it in one line, keep going. Stop only before something no one can undo.
- Report at milestones only, in 3 plain lines: what it is, what to click, what happens next. No ETAs.
- Agents merge their own PRs once checks are green; never merge red, never force-push.
- Never commit original game assets or decompiled source to a public repo.
- At each milestone: a few lines of blunt self-review (what wasted tokens or the user's time) and one new rule per miss, appended to the lessons file.
