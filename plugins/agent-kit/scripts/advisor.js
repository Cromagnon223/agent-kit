#!/usr/bin/env node
// Agent Kit advisor (plugin hook): reads Claude Code's own logs on this PC and turns them into a few lines of advice.
//   node advisor.js start    SessionStart: print the Agent Kit rules plus <=5 lines of advice from the last 7 days
//   node advisor.js end      SessionEnd: refresh ~/.claude/agent-kit/lessons.md from the latest stats
//   node advisor.js refresh  Recompute advice.json and lessons.md (used by the token dashboard)
// Standard library only. Never throws into Claude Code: any error just prints nothing.
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");

const HOME = process.env.AGENT_KIT_HOME || os.homedir();
const CLAUDE = path.join(HOME, ".claude");
const STATE = path.join(CLAUDE, "agent-kit");  // stable across plugin updates; the dashboard launcher runs from here
const LESSONS = path.join(STATE, "lessons.md");
const ROOT = __dirname;
const DAYS = 7;
const BIG = 20000; // a tool result this long gets re-read on every later turn of the session
const CONFUSED = /(\b(what is (this|that|it)|what do i( do)?|where do i|how do i|what now|what next|i don'?t (get|understand|see)|is this not|why (do|did|didn'?t)|huh)\b|\?\?)/i;
const PRAISE = /\b(that was (good|great|smart)|good (idea|call|thinking|job)|great (idea|job|work)|nice( one| work| idea)?|love (it|this|that))\b/i;
const USER_IDEA = /\b(why (didn'?t|did not|don'?t) (you|the \w+|we)|you should(n'?t)? have|should('?ve| have) thought|why not just|why can'?t (you|we) just)\b/i;
const REWORK = /\b(wrong|undo|revert|redo|try again|still (broken|not|failing)|(doesn'?t|didn'?t|does not|not) work|not what i|that'?s not|you (broke|missed|forgot))\b/i;

const fam = (m) => /opus/i.test(m) ? "Opus" : /sonnet/i.test(m) ? "Sonnet" : /haiku/i.test(m) ? "Haiku" : "Other";
const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(Math.round(n));
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0) + "%";
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, "")); } catch (e) { return d; } };
const writeFile = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

// ---------- reading the logs ----------
function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".jsonl")) out.push(p);
  }
  return out;
}

function summarizeFile(file) {
  const s = { replies: 0, tok: { inp: 0, cw: 0, cr: 0, out: 0 }, byFam: {}, sideByFam: {}, side: 0,
              big: 0, bigChars: 0, delegations: 0, orchestra: 0, seen: {},
              tasks: 0, rework: 0, confused: 0, questions: 0, mainReplies: 0, goalOn: 0, goalDrift: 0, praise: 0, userIdeas: 0, helpers: {} };
  const side = /[\\/]subagents[\\/]/.test(file);
  let text = "";
  try { text = fs.readFileSync(file, "utf8"); } catch (e) { return s; }
  for (const line of text.split("\n")) {
    if (!line) continue;
    if (!line.includes('"assistant"') && !line.includes('"user"')) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    const m = o.message || {};
    if (o.type === "assistant" && m.usage && m.model !== "<synthetic>") {
      const key = (m.id || "") + "|" + (o.requestId || "");
      const txt = (Array.isArray(m.content) ? m.content : []).filter((c) => c.type === "text").map((c) => c.text || "").join("\n");
      if (/goal:\s*on track/i.test(txt)) s.goalOn++;
      if (/goal:\s*drift/i.test(txt)) s.goalDrift++;
      if (!side && !o.isSidechain && m.stop_reason === "end_turn" && /\?\s*$/.test(txt)) s.questions++;
      for (const c of Array.isArray(m.content) ? m.content : []) {
        if (c.type !== "tool_use") continue;
        if (c.name === "Task" || c.name === "Agent") {
          s.delegations++;
          const h = String((c.input || {}).subagent_type || "general-purpose").replace(/^agent-kit:/, "");
          s.helpers[h] = (s.helpers[h] || 0) + 1;
        }
        if (/orchestra/i.test(JSON.stringify(c.input || {}))) s.orchestra++;
      }
      if (s.seen[key]) continue; // a reply is logged once per content block; count its usage once
      s.seen[key] = 1;
      const u = m.usage, t = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0);
      s.replies++;
      if (!side && !o.isSidechain) s.mainReplies++;
      s.tok.inp += u.input_tokens || 0; s.tok.cw += u.cache_creation_input_tokens || 0;
      s.tok.cr += u.cache_read_input_tokens || 0; s.tok.out += u.output_tokens || 0;
      const f = fam(m.model || "");
      s.byFam[f] = (s.byFam[f] || 0) + t;
      if (o.isSidechain || side) { s.side += t; s.sideByFam[f] = (s.sideByFam[f] || 0) + t; }
    } else if (o.type === "user" && !side && !o.isSidechain && !o.isMeta && (typeof m.content === "string" ||
               (Array.isArray(m.content) && m.content.some((c) => c.type === "text") && !m.content.some((c) => c.type === "tool_result")))) {
      // a real prompt typed by the person (not a tool result, not a command echo)
      const t = typeof m.content === "string" ? m.content : m.content.filter((c) => c.type === "text").map((c) => c.text || "").join(" ");
      if (/^\s*<(command|local-command|system-reminder)/.test(t)) continue;
      s.tasks++;
      const head = t.slice(0, 300), redo = s.tasks > 1 && REWORK.test(head);
      if (redo) s.rework++;
      if (redo || (s.tasks > 1 && CONFUSED.test(head))) s.confused++;
      if (PRAISE.test(head)) s.praise++;          // an idea of Claude's that the person liked
      if (USER_IDEA.test(head)) s.userIdeas++;    // the person had to suggest what Claude should have thought of  // the person had to correct or decode Claude's output
    } else if (o.type === "user" && Array.isArray(m.content)) {
      for (const c of m.content) {
        if (c.type !== "tool_result") continue;
        const len = typeof c.content === "string" ? c.content.length : JSON.stringify(c.content || "").length;
        if (len > BIG) { s.big++; s.bigChars += len; }
      }
    }
  }
  delete s.seen;
  return s;
}

function collect(fromDays, toDays) {
  fromDays = fromDays || 0; toDays = toDays || DAYS;
  const cachePath = path.join(STATE, "advisor-cache.json");
  const cache = readJSON(cachePath, {});
  const fresh = {};
  const since = Date.now() - toDays * 864e5, until = Date.now() - fromDays * 864e5;
  const files = walk(path.join(CLAUDE, "projects"), []);
  const agg = { sessions: 0, replies: 0, tok: { inp: 0, cw: 0, cr: 0, out: 0 }, byFam: {}, sideByFam: {}, side: 0,
                big: 0, bigChars: 0, delegations: 0, orchestra: 0, longSessions: 0, maxReplies: 0,
                tasks: 0, rework: 0, confused: 0, questions: 0, mainReplies: 0, goalOn: 0, goalDrift: 0, praise: 0, userIdeas: 0, bigSessions: 0, bigOrch: 0, last: null };
  for (const f of files) {
    let st; try { st = fs.statSync(f); } catch (e) { continue; }
    if (st.mtimeMs < since || st.mtimeMs >= until) continue;
    const key = "v4|" + f + "|" + st.size + "|" + Math.round(st.mtimeMs);
    const s = cache[key] || summarizeFile(f);
    fresh[key] = s;
    if (!s.replies) continue;
    const isSub = /[\\/]subagents[\\/]/.test(f);
    if (!isSub) {
      agg.sessions++; if (s.replies > 120) agg.longSessions++; agg.maxReplies = Math.max(agg.maxReplies, s.replies);
      if (!agg.last || st.mtimeMs > agg.last.mtime) agg.last = Object.assign({ mtime: st.mtimeMs, file: f }, s);
    }
    agg.replies += s.replies;
    for (const k in s.tok) agg.tok[k] += s.tok[k];
    for (const k in s.byFam) agg.byFam[k] = (agg.byFam[k] || 0) + s.byFam[k];
    for (const k in s.sideByFam) agg.sideByFam[k] = (agg.sideByFam[k] || 0) + s.sideByFam[k];
    for (const k of ["side", "big", "bigChars", "delegations", "orchestra", "tasks", "rework", "confused", "questions", "praise", "userIdeas", "mainReplies", "goalOn", "goalDrift"]) agg[k] += s[k] || 0;
    if (!isSub && s.mainReplies >= 60) { agg.bigSessions++; if (s.delegations || s.orchestra) agg.bigOrch++; }
  }
  if (agg.last) delete agg.last.mtime;
  try { writeFile(cachePath, JSON.stringify(fresh)); } catch (e) {}
  agg.total = agg.tok.inp + agg.tok.cw + agg.tok.cr + agg.tok.out;
  return agg;
}

// ---------- turning stats into advice ----------
// Each pattern estimates the tokens it wastes, so the advice names the biggest one first.
function patterns(a) {
  const out = [];
  const sideOpus = a.sideByFam.Opus || 0;
  if (a.side && sideOpus / a.side > 0.2)
    out.push({ key: "subagent-opus", impact: sideOpus * 0.8,
      waste: "sub-agents ran on Opus (" + pct(sideOpus, a.side) + " of sub-agent tokens)",
      rule: "Delegate to the kit's helpers (researcher, tester, writer on Haiku; planner, implementer, reviewer on Sonnet), not general-purpose agents." });
  if (a.big >= 3)
    out.push({ key: "big-outputs", impact: (a.bigChars / 4) * 8,
      waste: a.big + " tool outputs over 20K characters, re-read on every later turn",
      rule: "Read narrowly: Grep first, Read with offset/limit, and pipe long command output through tail or head." });
  if (a.longSessions)
    out.push({ key: "long-sessions", impact: a.longSessions * 2e6,
      waste: a.longSessions + " very long session" + (a.longSessions > 1 ? "s" : "") + " (up to " + a.maxReplies + " replies), each reply re-reads the whole history",
      rule: "When the task changes, suggest a fresh session or /compact instead of carrying a long history." });
  const cacheTotal = a.tok.cw + a.tok.cr;
  if (cacheTotal && a.tok.cw / cacheTotal > 0.2)
    out.push({ key: "cache-rebuilds", impact: a.tok.cw * 0.9,
      waste: "the prompt cache was rebuilt often (" + pct(a.tok.cw, cacheTotal) + " of input was cache writes)",
      rule: "Keep CLAUDE.md and the tool set stable mid-session; after a long break, start a fresh session." });
  if (a.sessions >= 3 && a.delegations === 0 && a.replies / a.sessions > 40)
    out.push({ key: "no-delegation", impact: a.total * 0.15,
      waste: "no work was handed to the cheaper helper agents",
      rule: "Hand lookups, test runs and docs to researcher, tester and writer (Haiku) with a short brief." });
  return out.sort((x, y) => y.impact - x.impact);
}

// ---------- scorecard: how well Claude did, graded A-F ----------
// Each metric scores 0-100; null means "not enough data" and is left out of the grade.
const clamp = (x) => Math.max(0, Math.min(100, Math.round(x)));
const METRICS = {
  tokens:    { label: "Tokens per task",   tip: "fewer tokens per task: read narrowly and keep replies short" },
  cheap:     { label: "Cheap-model share", tip: "move more work to Haiku/Sonnet helpers instead of Opus" },
  confusion: { label: "Confusion rate",    tip: "no confusion: every delivery says what it is, what to click, and what happens next", weight: 2 },
  ideas:     { label: "New ideas",         tip: "think ahead: propose the better path before the person has to suggest it" },
  rework:    { label: "Rework",            tip: "less rework: re-read the request and check the result before saying done" },
  questions: { label: "Questions asked",   tip: "zero questions: pick a sensible default, say which, and finish" },
  goal:      { label: "Goal on track",     tip: "stay on the goal: check the plan against the first request" },
  orchestra: { label: "Orchestra use",     tip: "on multi-part jobs, run /orchestra:orchestra or delegate to agent-kit helpers" },
};
function score(a) {
  if (!a || !a.replies) return null;
  const tasks = Math.max(1, a.tasks), cheapTok = (a.byFam.Haiku || 0) + (a.byFam.Sonnet || 0);
  const m = {
    tokens: { value: fmt(a.total / tasks) + " per task", score: clamp(100 - 50 * Math.log10(a.total / tasks / 3e5)) },
    cheap: { value: pct(cheapTok, a.total) + " on Haiku/Sonnet", score: clamp(40 + 200 * cheapTok / a.total) },
    confusion: { value: (a.confused || 0) + " of " + a.tasks + " prompts", score: a.tasks > 1 ? clamp(100 - 400 * (a.confused || 0) / a.tasks) : null },
    ideas: ((c, u) => ({ value: c + " from Claude, " + u + " the person had to suggest", score: c + u ? clamp(100 * c / (c + u)) : null }))(
      (a.praise || 0) + (a.ideaTags ? a.ideaTags.claude : 0), (a.userIdeas || 0) + (a.ideaTags ? a.ideaTags.user : 0)),
    rework: { value: a.rework + " of " + a.tasks + " prompts", score: a.tasks > 1 ? clamp(100 - 300 * a.rework / a.tasks) : null },
    questions: { value: a.questions + " in " + a.tasks + " tasks", score: a.mainReplies ? clamp(100 - 400 * a.questions / Math.max(a.tasks, 1)) : null },
    goal: { value: a.goalOn + " on track, " + a.goalDrift + " drifting", score: a.goalOn + a.goalDrift ? clamp(100 * a.goalOn / (a.goalOn + a.goalDrift)) : null },
    orchestra: { value: a.bigOrch + " of " + a.bigSessions + " big sessions", score: a.bigSessions ? clamp(100 * a.bigOrch / a.bigSessions) : null },
  };
  const scored = Object.keys(m).filter((k) => m[k].score !== null);
  const wt = (k) => METRICS[k].weight || 1;  // confusion counts double: it is time the person spent fixing our output
  const total = Math.round(scored.reduce((t, k) => t + wt(k) * m[k].score, 0) / scored.reduce((t, k) => t + wt(k), 0));
  const weakest = scored.sort((x, y) => m[x].score - m[y].score)[0];
  return { score: total, grade: total >= 90 ? "A" : total >= 80 ? "B" : total >= 70 ? "C" : total >= 60 ? "D" : "F", weakest, metrics: m };
}
function scorecard(a) {
  const week = score(a), prev = score(collect(DAYS, 2 * DAYS));
  if (!week) return null;
  for (const k in week.metrics) Object.assign(week.metrics[k], METRICS[k]);
  const d = prev ? week.score - prev.score : 0;
  return { week, prev: prev && { score: prev.score, grade: prev.grade }, trend: !prev ? "new" : d > 3 ? "up" : d < -3 ? "down" : "flat",
           last: a.last ? score(Object.assign({}, a.last, { bigSessions: a.last.mainReplies >= 60 ? 1 : 0,
             bigOrch: a.last.mainReplies >= 60 && (a.last.delegations || a.last.orchestra) ? 1 : 0, total: Object.values(a.last.tok).reduce((x, y) => x + y, 0) })) : null };
}

// Lessons tagged [idea:claude] (Claude proposed it unprompted and it stuck) or [idea:user] (the person had to suggest it).
function ideaTags() {
  const t = { claude: 0, user: 0 };
  for (const f of [path.join(ROOT, "..", "lessons.md"), path.join(STATE, "ideas.md")]) {
    let x = ""; try { x = fs.readFileSync(f, "utf8"); } catch (e) {}
    t.claude += (x.match(/\[idea:claude\]/g) || []).length; t.user += (x.match(/\[idea:user\]/g) || []).length;
  }
  return t;
}

// ---------- adaptive routing: move a helper down a model tier after clean runs, back up after rework ----------
const TIERS = ["haiku", "sonnet", "opus"];
const DEFAULT_TIER = { researcher: 0, tester: 0, writer: 0, planner: 1, implementer: 1, reviewer: 1 };
function updateRouting(last) {
  const p = path.join(STATE, "routing.json"), r = readJSON(p, { seen: "", helpers: {} });
  if (!last || !last.helpers || last.file + "|" + last.replies === r.seen) return r;  // count each session once
  r.seen = last.file + "|" + last.replies;
  for (const h in last.helpers) {
    const d = h in DEFAULT_TIER ? DEFAULT_TIER[h] : 2, x = r.helpers[h] || { tier: d, clean: 0 };
    if (last.rework) { x.tier = Math.min(Math.max(x.tier + 1, d), 2); x.clean = 0; }   // rework: back up
    else if (++x.clean >= 3 && x.tier > 0) { x.tier--; x.clean = 0; }                // 3 clean sessions: one tier cheaper
    r.helpers[h] = x;
  }
  writeFile(p, JSON.stringify(r));
  return r;
}
function routingLine(r) {
  const moves = Object.keys(r.helpers).filter((h) => r.helpers[h].tier !== (h in DEFAULT_TIER ? DEFAULT_TIER[h] : 2))
    .map((h) => (h in DEFAULT_TIER ? "agent-kit:" + h : h) + ' with model "' + TIERS[r.helpers[h].tier] + '"');
  return moves.length ? "Routing (from clean runs): call " + moves.join(", ") + "." : null;
}

function advise() {
  const a = collect();
  a.ideaTags = ideaTags();
  const res = { generated: new Date().toISOString(), days: DAYS, stats: a, lines: [], top: null, score: null };
  if (!a.replies) {
    res.lines = ["No Claude Code use in the last " + DAYS + " days yet; follow the token-saving habits in CLAUDE.md."];
    return res;
  }
  const famLine = ["Opus", "Sonnet", "Haiku", "Other"].filter((f) => a.byFam[f]).map((f) => f + " " + pct(a.byFam[f], a.total)).join(", ");
  const p = patterns(a);
  res.top = p[0] || null;
  res.lines.push("Last " + DAYS + " days: " + a.sessions + " sessions, " + fmt(a.total) + " tokens (" + famLine + "), " +
                 pct(a.tok.cr, a.tok.cr + a.tok.cw + a.tok.inp) + " of input from cache.");
  if (p[0]) {
    res.lines.push("Biggest waste: " + p[0].waste + ".");
    res.lines.push("Rule for this session: " + p[0].rule);
  } else {
    res.lines.push("No big waste found. Keep reading narrowly and delegating cheap work.");
  }
  const sc = res.score = scorecard(a);
  if (sc) {
    const w = sc.week, arrow = { up: "↑", down: "↓", flat: "→", new: "" }[sc.trend];
    res.focus = { key: "focus-" + w.weakest, rule: "Focus: " + METRICS[w.weakest].tip + ".", waste: METRICS[w.weakest].label + " scored " + w.metrics[w.weakest].score + "/100" };
    res.lines.push("Your score: " + w.grade + " (" + w.score + (sc.prev ? ", " + arrow + " from " + sc.prev.score : "") + "). Focus this session: " + METRICS[w.weakest].tip + ".");
  } else if (p[1]) res.lines.push("Also: " + p[1].rule);
  const route = routingLine(updateRouting(a.last));
  if (route) res.lines.push(route);
  if (a.last) delete a.last.file;
  return res;
}

// ---------- lessons file ----------
function updateLessons(res) {
  const store = readJSON(path.join(STATE, "lessons.json"), { rules: [] });
  for (const r of [res.focus, res.top]) {
    if (!r) continue;
    store.rules = store.rules.filter((x) => x.key !== r.key && !(r.key.startsWith("focus-") && x.key.startsWith("focus-")));
    store.rules.unshift({ key: r.key, date: res.generated.slice(0, 10), rule: r.rule, why: r.waste });
  }
  store.rules = store.rules.slice(0, 10);
  writeFile(path.join(STATE, "lessons.json"), JSON.stringify(store, null, 2));
  let seed = "";
  try { seed = fs.readFileSync(path.join(ROOT, "..", "lessons.md"), "utf8").trim(); } catch (e) {}
  const md = ["# Agent Kit lessons", "", "Updated automatically at the end of each Claude Code session from your own token logs. Read this before planning a multi-step job.", "",
    "## This week", ...res.lines.map((l) => "- " + l), "",
    "## Rules learned from your logs (newest first)", ...(store.rules.length ? store.rules.map((r) => "- " + r.date + ": " + r.rule + " (seen: " + r.why + ")") : ["- None yet."]),
    "", seed, ""].join("\n");
  writeFile(LESSONS, md);
}

// ---------- main ----------
// Keep the dashboard files and the install date in the stable folder so "Token Dashboard.bat" never needs updating.
function syncDashboard() {
  fs.mkdirSync(STATE, { recursive: true });
  for (const f of ["dashboard.js", "dashboard.html"]) fs.copyFileSync(path.join(ROOT, f), path.join(STATE, f));
  const inst = path.join(STATE, "installed.json");
  if (!fs.existsSync(inst)) {
    const old = readJSON(path.join(HOME, ".agent-kit", "installed.json"), null);  // carried over from the old installer
    writeFile(inst, JSON.stringify({ first_install: (old && old.first_install) || new Date().toISOString() }));
  }
}

// Safety net next to Claude Code's own marketplace auto-update: at most every 12 hours, pull the latest
// Agent Kit from GitHub in the background. Changes apply at the next session start; nothing waits on it.
function backgroundUpdate() {
  const stamp = path.join(STATE, "last-update-check");
  let last = 0; try { last = fs.statSync(stamp).mtimeMs; } catch (e) {}
  if (Date.now() - last < 12 * 3600e3 || process.env.AGENT_KIT_NO_UPDATE) return;
  writeFile(stamp, new Date().toISOString());
  const cmd = "claude plugin marketplace update agent-kit && claude plugin update agent-kit@agent-kit --scope user && claude plugin update orchestra@agent-kit --scope user";
  const log = fs.openSync(path.join(STATE, "update.log"), "w");
  require("child_process").spawn(cmd, { shell: true, detached: true, windowsHide: true, stdio: ["ignore", log, log] }).unref();
}

function main() {
  const mode = process.argv[2] || "start";
  if (mode === "start") {
    try { syncDashboard(); } catch (e) {}
    try { backgroundUpdate(); } catch (e) {}
    let rules = "";
    try { rules = fs.readFileSync(path.join(ROOT, "rules.md"), "utf8").trim() + "\n"; } catch (e) {}
    const res = advise();
    writeFile(path.join(STATE, "advice.json"), JSON.stringify(res));
    process.stdout.write(rules + "Advice from this PC's token logs:\n" + res.lines.slice(0, 5).map((l) => "- " + l).join("\n") + "\n");
    return;
  }
  const res = advise();
  writeFile(path.join(STATE, "advice.json"), JSON.stringify(res));
  updateLessons(res);
  if (mode === "refresh") process.stdout.write(res.lines.join("\n") + "\n");
}

module.exports = { advise, updateLessons, STATE };
if (require.main === module) try { main(); } catch (e) { if (process.argv[2] === "refresh") console.error(e.message); }
