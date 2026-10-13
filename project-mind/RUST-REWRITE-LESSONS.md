# Rust rewrite lessons (decompile a game, rewrite it in Rust/Bevy)

From the One Piece Burning Blood port (`Cromagnon223/opbb-decomp`, builds 1 to 51 in the first project). Read [RUST-REWRITE.md](RUST-REWRITE.md) first (technical lessons: crates, simulation, rendering, Windows builds). This file adds the setup, workflow and delivery lessons it leaves out. Also see [HANDOFF.md](HANDOFF.md) (general build rules), [BUILD-LOOP.md](BUILD-LOOP.md) (check command, facts ledger, inbox) and [lessons.md](../plugins/agent-kit/lessons.md). Those are not repeated here.

**Proven** = it happened in the OPBB project (source named). **Suggestion** = inferred from it, not tried.

## 1. Setup and decompile
- **Check first whether the engine is already open source.** Proven not needed for OPBB; suggestion for others. MB2 runs on GPL OpenJK, so building on it beats a full Bevy rewrite (about 20 to 35 builds against 80 to 120, both estimates; `mb2/feasibility.md`).
- **Ghidra: import from a copy whose path has no parentheses, keep its settings outside a redirected AppData, use JDK 25.** Proven (`ISSUES.md` 15 to 17): each broke the headless run.
- **Run a parity check after every re-index.** Proven: gamedb printed `failed=0` while skipping 341 functions; only `parity.py` caught it (`ISSUES.md` 5, 9).
- **Map RTTI class names to vtables early.** Proven: with no PDB almost every function is `FUN_<address>`; 2,405 classes mapped to 2,545 vtables gave the port its names (`COWORK-HANDOFF.md`).
- **Put decompiled code and game files in `.gitignore` before `git init`.** Proven rule: nothing from the game or the decompile goes to GitHub, only new source.

## 2. Crates and tracks
- **Colour space is a decision to label.** Proven: textures loaded as sRGB were an assumption until a per-texture flag replaced it (build 38); the game's own use of that flag is still untraced.
- **Write down code paths real data never used.** Proven: CRILAYLA and `$CR0` are implemented but never seen in this game's files, and the notes say so.
- **Use a scratch crate with no Bevy to survey data.** Proven: it builds in seconds against the reader crates; the Bevy app takes 40 s to 2 min.

## 3. Lead, tracks and hand-overs
- **One lead plus one track, picked by the next queue item.** Proven: 4 to 5 Opus agents hit the usage limit 3 times on 2026-10-08, about 5h40m idle.
- **Plan lead hand-overs.** Proven: leads ran out of context every 5 to 9 builds (hand-over sections at builds 37, 42, 51). A self-contained "State at boot build NN (START HERE)" section kept work going; older sections are marked as history.
- **Tracks and lead talk through inbox files on the same disk.** Proven: `tracks\INBOX-lead.md` replaced coordinator relays. Tracks only act on a turn, so someone must nudge them.
- **An item that needs an unknown fact goes to the owning track as a numbered question; the lead builds the next item.** Proven: `INBOX-animations.md` items 1 to 10 came back answered while the lead shipped builds 47 to 51.

## 4. Building and checking
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
