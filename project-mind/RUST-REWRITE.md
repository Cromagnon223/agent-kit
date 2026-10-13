# Rust rewrite lessons: rebuilding a program or game in Rust from its decompile

These come from an 87-build Rust/Bevy rewrite of a PC fighting game, built from a Ghidra decompile while reading the original's data from the user's install. General workflow rules (sessions, checks, facts ledger, inbox, no questions) are in [HANDOFF.md](HANDOFF.md) and are not repeated here. [RUST-REWRITE-LESSONS.md](RUST-REWRITE-LESSONS.md) covers setup, hand-overs and delivery from builds 1-51; read both. Highest payoff first.

## Week one, in this order
1. **Run the original first.** Find out whether it runs on the user's machine and how to record it (screen capture is fine). The port above went 61 builds before the original was launched, and by build 85 it still hadn't been compared against it once.
2. **Index the decompile.** Put function names, addresses and callers in a SQLite file with a small query script, so an agent looks up one function instead of reading folders. Never commit the decompile.
3. **Write the format readers first,** as plain crates with no engine: archive, compression, container, textures. Test each one over the whole install ("all 17,874 files decode to their declared size") before anything draws.
4. **Find the original's tick rate and its clip/frame rates in the code,** write them in the facts ledger, and build the simulation on them from day one.
5. **Write "Done means" for the rewrite** (which modes, which content, what is out). The port learned "1v1 only" at build 41, after team features were built.

## Crate layout
- **One crate per subsystem, none of them depending on the engine:** rules or simulation, animation, effects, levels and roster, audio, menus. The engine app (Bevy) is a thin glue crate that depends on them. Each crate has its own README with a "how the app plugs it in" section and a test table.
- **Why:** a crate with no renderer builds and tests in seconds, one agent can own it without touching the app, and its tests run headless against the real install.
- **Readers decode to plain structs; the app decides how to draw.** An effects crate that reports "what to draw" never breaks on a renderer upgrade.
- **Shared low-level readers** (file system, archive, texture) are their own crates that every other crate uses, so there is one reader per format.

## Simulation
- **Keep the rules crate engine-free and deterministic** (fixed seeds). Then a balance tool can run hundreds of hidden matches (the port ran 450 fights over 75 fighters) to find crashes and lopsided results in minutes, with no window.
- **Step the simulation at the original's fixed tick** using an accumulator. Draw by blending between the last two ticks. A guessed 30 fps (the clips were really 60 frames a second over 30 updates) ran every animation at half speed for 40 builds.
- **Give the app a demo switch and a speed switch** (`--demo --speed 10 --screenshot out.png`), so a whole match runs hidden and quickly, and the same run gives the same result every time.
- **One feature per build, with a switch that turns it off.** Count the symptom with the switch off and on in the same run and build. When the user reported overlapping sounds, that count showed the most sounds at once falling from 24 to 11.

## Data and assets
- **Read the original's files from the user's install at run time,** decode them in memory, and write nothing. Never commit assets, decoded audio or decompiled code. A `.gitignore` for the usual media types catches mistakes.
- **A path to the install comes from detection plus a one-line override file** beside the exe; never hard-code it.
- **Read the original's layout files for menus** instead of placing things by hand. The select screens came out pixel-placed from data in one session.

## Truth: confirmed or stand-in
- **Every behaviour is confirmed** (a function address, a data field or a run) **or a stand-in,** marked in the plan file and the code comment.
- **Run a sweep that looks for outliers** (the balance tool). One lopsided fighter exposed a rule that an earlier build had marked confirmed but that was read from the wrong side (reaction instead of damage). An outlier is worth an hour.
- **Read the data flag and the gate's callers before tuning numbers.** Each time numbers were tuned first, the answer turned out to be a flag in the data or a caller in the code.
- **Shader disassembly is source code.** Lighting, coordinate and post-process rules came straight from the original's shaders.

## Cargo habits
- **On a shared PC use `cargo build -j 4`, and check free disk before a build.** Target folders reach several GB, and one type check died with 1.6 GB free.
- **On Windows use the MSVC target** inside the VS environment (a `vcvars64` batch file). The GNU toolchain could not link Bevy.
- **Use `[profile.dev] opt-level = 1` with dependencies at opt-level 3** for usable debug runs, and release builds for every check the user sees. Incremental release builds took about 25 s.
- **Turn off Bevy's default features** and list only the ones you need.
- **Patch scripts go through the editor tool,** not shell heredocs, because quotes break on Windows shells.

## Bevy pitfalls that cost a build each
- **No file I/O per event on the main thread.** One log line per hit, opened and closed in a OneDrive folder, caused 0.18 s stutters. Buffer the log and write it from a thread.
- **Write a material only when it changes, once per update.** Shared materials rewritten by every particle each frame halved the frame rate (41-68 fps became 105-143 fps after the fix).
- **Load everything for a match before it starts** (effect textures, sounds). Loading on first use caused 90-590 ms stalls mid-fight.
- **Decode audio on a worker thread** and warm up the cues a match will use.
- **A system added to every screen must take `Option<Res<T>>`** for any resource that exists only after boot. A hidden run from the title screen catches it.
- **Cap hidden check runs to 60 fps** and keep them muted and off-screen, so they don't slow the user's own play on the same machine.
- **Log a perf line every 10 s** (median fps and slow frames). The user's own log found the real stall, which the cloud runs had missed.
