# Build loop (for any project that builds, compiles, ports or decompiles)

Learned on the One Piece Burning Blood port (opbb-decomp, 85 builds) and applied to the MB2 map maker (mb2-mapmaker PR #4).
Any project that turns source into something runnable sets this up in its first build. Adapt names; keep the shape. For a paste-in version with the working rules too, use [HANDOFF.md](HANDOFF.md).

## Set up once (first build)
1. **One check command.** `tests/run.sh` (or the repo's equivalent) runs every check and prints one line per check (`ok name` / `FAIL name`). Full output goes to a log file (`.cache/test.log`); on failure it prints only the last ~15 lines. Agents never paste whole logs into context.
2. **Test against the real thing early.** Add a check that runs the output in the real engine, game or target (MB2: compiled map loaded by an OpenJK dedicated server; OPBB: the port checked against the real game). It must FAIL on a known-bad input: try one before trusting it.
3. **Cache the expensive tool.** Build the real engine or toolchain once into `.cache/`, keyed on its version, and reuse it (MB2: 30 s first build, under 1 s after). Cache it in CI too (`actions/cache` keyed on the upstream commit).
4. **Facts ledger.** One file (`docs/FORMAT-NOTES.md`, or `PORT_PLAN.md` entries) where every format fact, rate or unit is marked **confirmed** (source line, data or a run) or **inferred** (what would confirm it). A guessed 30 fps ran every OPBB animation at half speed for 40 builds.
5. **Inbox file.** `docs/INBOX.md`: agents leave notes for each other there instead of asking the coordinator to relay them.
6. **CLAUDE.md block.** A short "workflow" section naming the check command, the ledger, the inbox and the rules below, so every later session starts with them.

## Rules while building
- Write "Done means" in one line before build 1 (OPBB learned "1v1 only" at build 41).
- One lead plus at most one helper. On a usage-capped plan more parallel agents only hit the limit sooner (OPBB: 4 Opus agents, limit hit 3 times in a day). Pace guard: on a limit warning, ship the current build and start nothing new.
- Read the original's source, data flags and callers before inventing or tuning a rule (OPBB builds 66-68, 74-75: the answer was in the code or a shader every time).
- Aim each check at the one thing the change touches (one map, one lump, one screenshot of the ship), not a wide sweep.
- A leftover item that needs an unknown fact is written "needs fact X" in the ledger and skipped, not guessed.
- A check that confirms you already match is still worth recording: it turns inferred into confirmed so no one re-checks it.
- Checks on the user's own PC are capped (frame rate, `-j 4`) and hidden; never stutter their play. Check free disk before a build.
- Never do file I/O per event on a main or render thread (OPBB build 61: one log line per hit caused 0.18 s stutters).
- Long-running leads hand over through a handoff file every ~6 builds instead of growing their context.
