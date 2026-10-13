# Rust rewrite lessons (decompile a game, rewrite it in Rust/Bevy)

From the One Piece Burning Blood port (`Cromagnon223/opbb-decomp`, builds 1 to 51 in the first project). Read this at the start of any game rewrite, together with [HANDOFF.md](HANDOFF.md) (general build rules), [BUILD-LOOP.md](BUILD-LOOP.md) (check command, facts ledger, inbox) and [lessons.md](../plugins/agent-kit/lessons.md). Those are not repeated here.

**Proven** = it happened in the OPBB project (source named). **Suggestion** = inferred from it, not tried.

## 1. Setup and decompile
- **Check first whether the engine is already open source.** Proven not needed for OPBB; suggestion for others. MB2 runs on GPL OpenJK, so building on it beats a full Bevy rewrite (about 20 to 35 builds against 80 to 120, both estimates; `mb2/feasibility.md`).
- **Find out on day 1 whether the original can run and be instrumented.** Proven: 61 builds said "never compared with the real game" before it was launched (lessons.md). Without it, every look is a guess.
- **Ghidra: import from a copy whose path has no parentheses, keep its settings outside a redirected AppData, use JDK 25.** Proven (`ISSUES.md` 15 to 17): each broke the headless run.
- **Run a parity check after every re-index.** Proven: gamedb printed `failed=0` while skipping 341 functions; only `parity.py` caught it (`ISSUES.md` 5, 9).
- **Map RTTI class names to vtables early.** Proven: with no PDB almost every function is `FUN_<address>`; 2,405 classes mapped to 2,545 vtables gave the port its names (`COWORK-HANDOFF.md`).
- **Put decompiled code and game files in `.gitignore` before `git init`.** Proven rule: nothing from the game or the decompile goes to GitHub, only new source.

## 2. Crates and tracks
- **One crate per file format (archive, compression, pack, texture), each tested against the whole install.** Proven: all 17,874 compressed files and 9,520 packs checked by survey tests, so later bugs were never in the readers.
- **Write down code paths real data never used.** Proven: CRILAYLA and `$CR0` are implemented but never seen in this game's files, and the notes say so.
- **Each track owns its crates; the app uses them as path dependencies and stays glue.** Proven: `fight.rs` only wires the gameplay crate's own move graphs, hitboxes and damage into Bevy.
- **Use a scratch crate with no Bevy to survey data.** Proven: it builds in seconds against the reader crates; the Bevy app takes 40 s to 2 min.
- **Read the game's disassembled shaders before writing a lighting formula.** Proven: specular (build 48) and Tint2 came straight from the shader listings (`dxbc.py`).
- **Every rate, unit and colour space needs a source or the word "inferred".** Proven: animations first ran at 60 fps; the game updates 30 times a second (fixed after build 9). Textures loaded as sRGB were an assumption until a per-texture flag replaced it (build 38 notes; the game's own use of that flag is still untraced).

## 3. Lead, tracks and hand-overs
- **Write "Done means" before build 1.** Proven: "1v1 only" came at build 41, after 3v3, unity and partner work was built. Narrowing scope cut the estimate to about 18 builds left (`estimates/builds-left.md`).
- **One lead plus one track, picked by the next queue item.** Proven: 4 to 5 Opus agents hit the usage limit 3 times on 2026-10-08, about 5h40m idle.
- **Plan lead hand-overs.** Proven: leads ran out of context every 5 to 9 builds (hand-over sections at builds 37, 42, 51). A self-contained "State at boot build NN (START HERE)" section kept work going; older sections are marked as history.
- **Tracks and lead talk through inbox files on the same disk.** Proven: `tracks\INBOX-lead.md` replaced coordinator relays. Tracks only act on a turn, so someone must nudge them.
- **An item that needs an unknown fact goes to the owning track as a numbered question; the lead builds the next item.** Proven: `INBOX-animations.md` items 1 to 10 came back answered while the lead shipped builds 47 to 51.

## 4. Building and checking (Windows)
- **Use the MSVC target.** Proven: the default GNU Rust toolchain could not link (no dlltool or mingw).
- **Give the app hidden check flags from the start:** `--screenshot` (off-screen and muted), a scripted `--demo`, `--speed`, `--p1/--p2/--stage`. Proven: a deterministic demo lets a moment be found at the same frame at any speed.
- **Take before and after pictures of the default scene every build that touches shared rendering.** Proven fault: lit stage surfaces threw away every material's blended colour until build 49, and which build broke it was never traced. Per-build pictures were the fix adopted.
- **Write patches as files with the editor tool and an exact-once patch helper (`patchlib.py`), never shell heredocs.** Proven: backslashes and apostrophes broke on Windows.
- **Ship the exe even while the user is playing:** if the copy fails as busy, rename the running file aside and copy the new one in. Proven (`ship-example.py`).
- **Build logs go to a file; read the tail.** Proven: keeps the lead's context for more builds.

## 5. Delivery to the user
- **The user double-clicks one exe in one fixed folder (`play\`), replaced in place.** Proven: no downloads, no terminal.
- **Source zips go to the shared folder; a cloud thread publishes them to GitHub every 3 builds.** Proven: the PC had no `gh` or GitHub sign-in, and every 3 builds was enough.
- **Each build is 3 plain lines with confirmed/unconfirmed marks.** Proven rule from Kyle: no guessing, stand-ins called stand-ins, nothing called checked unless it was.

## 6. Tokens, usage limits and Remote Control
- **Pace guard:** on a usage-limit warning, ship the current build and start nothing new. Proven: adopted after the three stalls.
- **A parked Remote Control session restarts only when the user types in its thread.** Proven: every stall cost Kyle a message, so avoiding the limit beats any restart trick.
- **Start Remote Control on a fresh user message.** Proven: about 25 min old started with no card; about 2.5 h old posted a consent card; an edited message failed; briefs must have no angle brackets.
- **Pick models per task at the start.** Proven: Kyle chose Opus for every game agent; suggestion: send data surveys and test runs to a cheaper helper where the user allows it.
