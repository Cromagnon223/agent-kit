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
              big: 0, bigChars: 0, delegations: 0, orchestra: 0, seen: {} };
  let text = "";
  try { text = fs.readFileSync(file, "utf8"); } catch (e) { return s; }
  for (const line of text.split("\n")) {
    if (!line) continue;
    const isA = line.includes('"assistant"'), isToolResult = line.includes('"tool_result"');
    if (!isA && !isToolResult) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    const m = o.message || {};
    if (o.type === "assistant" && m.usage && m.model !== "<synthetic>") {
      const key = (m.id || "") + "|" + (o.requestId || "");
      for (const c of Array.isArray(m.content) ? m.content : []) {
        if (c.type !== "tool_use") continue;
        if (c.name === "Task" || c.name === "Agent") s.delegations++;
        if (/orchestra/i.test(JSON.stringify(c.input || {}))) s.orchestra++;
      }
      if (s.seen[key]) continue; // a reply is logged once per content block; count its usage once
      s.seen[key] = 1;
      const u = m.usage, t = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.output_tokens || 0);
      s.replies++;
      s.tok.inp += u.input_tokens || 0; s.tok.cw += u.cache_creation_input_tokens || 0;
      s.tok.cr += u.cache_read_input_tokens || 0; s.tok.out += u.output_tokens || 0;
      const f = fam(m.model || "");
      s.byFam[f] = (s.byFam[f] || 0) + t;
      if (o.isSidechain || /[\\/]subagents[\\/]/.test(file)) { s.side += t; s.sideByFam[f] = (s.sideByFam[f] || 0) + t; }
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

function collect() {
  const cachePath = path.join(STATE, "advisor-cache.json");
  const cache = readJSON(cachePath, {});
  const fresh = {};
  const since = Date.now() - DAYS * 864e5;
  const files = walk(path.join(CLAUDE, "projects"), []);
  const agg = { sessions: 0, replies: 0, tok: { inp: 0, cw: 0, cr: 0, out: 0 }, byFam: {}, sideByFam: {}, side: 0,
                big: 0, bigChars: 0, delegations: 0, orchestra: 0, longSessions: 0, maxReplies: 0 };
  for (const f of files) {
    let st; try { st = fs.statSync(f); } catch (e) { continue; }
    if (st.mtimeMs < since) continue;
    const key = f + "|" + st.size + "|" + Math.round(st.mtimeMs);
    const s = cache[key] || summarizeFile(f);
    fresh[key] = s;
    if (!s.replies) continue;
    const isSub = /[\\/]subagents[\\/]/.test(f);
    if (!isSub) { agg.sessions++; if (s.replies > 120) agg.longSessions++; agg.maxReplies = Math.max(agg.maxReplies, s.replies); }
    agg.replies += s.replies;
    for (const k in s.tok) agg.tok[k] += s.tok[k];
    for (const k in s.byFam) agg.byFam[k] = (agg.byFam[k] || 0) + s.byFam[k];
    for (const k in s.sideByFam) agg.sideByFam[k] = (agg.sideByFam[k] || 0) + s.sideByFam[k];
    for (const k of ["side", "big", "bigChars", "delegations", "orchestra"]) agg[k] += s[k];
  }
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

function advise() {
  const a = collect();
  const res = { generated: new Date().toISOString(), days: DAYS, stats: a, lines: [], top: null };
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
  if (p[1]) res.lines.push("Also: " + p[1].rule);
  return res;
}

// ---------- lessons file ----------
function updateLessons(res) {
  const store = readJSON(path.join(STATE, "lessons.json"), { rules: [] });
  if (res.top) {
    store.rules = store.rules.filter((r) => r.key !== res.top.key);
    store.rules.unshift({ key: res.top.key, date: res.generated.slice(0, 10), rule: res.top.rule, why: res.top.waste });
    store.rules = store.rules.slice(0, 10);
  }
  writeFile(path.join(STATE, "lessons.json"), JSON.stringify(store, null, 2));
  let seed = "";
  try { seed = fs.readFileSync(path.join(ROOT, "lessons-seed.md"), "utf8").trim(); } catch (e) {}
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
    process.stdout.write(rules + "Advice from this PC's token logs:\n" + res.lines.slice(0, 4).map((l) => "- " + l).join("\n") + "\n");
    return;
  }
  const res = advise();
  writeFile(path.join(STATE, "advice.json"), JSON.stringify(res));
  updateLessons(res);
  if (mode === "refresh") process.stdout.write(res.lines.join("\n") + "\n");
}

module.exports = { advise, updateLessons, STATE };
if (require.main === module) try { main(); } catch (e) { if (process.argv[2] === "refresh") console.error(e.message); }
