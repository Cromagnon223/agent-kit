#!/usr/bin/env node
// Builds the Token Dashboard from Claude Code's own logs on this PC and opens it in the browser. Nothing is uploaded.
// Copied to ~/.claude/agent-kit/ at every session start, so the "Token Dashboard.bat" shortcut always runs the latest copy.
"use strict";
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

const HOME = process.env.AGENT_KIT_HOME || os.homedir();
const STATE = path.join(HOME, ".claude", "agent-kit");
const readJSON = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, "")); } catch (e) { return d; } };

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith(".jsonl")) out.push(p);
  }
  return out;
}

function rowsOf(file, project) {
  const rows = [];
  let text = "";
  try { text = fs.readFileSync(file, "utf8"); } catch (e) { return rows; }
  for (const line of text.split("\n")) {
    if (!line.includes('"usage"') || !line.includes('"assistant"')) continue;
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    const m = o.message;
    if (!m || !m.usage || o.type !== "assistant" || m.model === "<synthetic>") continue;
    const u = m.usage;
    rows.push([o.timestamp, o.sessionId, m.model, u.input_tokens || 0, u.cache_creation_input_tokens || 0,
               u.cache_read_input_tokens || 0, u.output_tokens || 0, (m.id || "") + "|" + (o.requestId || ""), project, o.isSidechain ? 1 : 0]);
  }
  return rows;
}

function main() {
  const projects = path.join(HOME, ".claude", "projects");
  const cachePath = path.join(STATE, "dashboard-cache.json");
  const cache = readJSON(cachePath, {}), fresh = {};
  let rows = [];
  for (const f of walk(projects, [])) {
    let st; try { st = fs.statSync(f); } catch (e) { continue; }
    const key = f + "|" + st.size + "|" + Math.round(st.mtimeMs);
    const project = path.relative(projects, f).split(path.sep)[0];
    fresh[key] = cache[key] || rowsOf(f, project);
    rows = rows.concat(fresh[key]);
  }
  fs.mkdirSync(STATE, { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(fresh));
  const installed = (readJSON(path.join(STATE, "installed.json"), null) || {}).first_install || null;
  const data = { advice: readJSON(path.join(STATE, "advice.json"), null), installed, generated: new Date().toISOString(), rows };
  const html = fs.readFileSync(path.join(__dirname, "dashboard.html"), "utf8").replace("/*__DATA__*/null", () => JSON.stringify(data).replace(/</g, "\\u003c"));
  const out = path.join(STATE, "Token Dashboard.html");
  fs.writeFileSync(out, html);
  console.log("Found " + rows.length + " model replies. Dashboard: " + out);
  if (process.argv.includes("--no-open")) return;
  const opener = process.platform === "win32" ? ["cmd", ["/c", "start", "", out]] : process.platform === "darwin" ? ["open", [out]] : ["xdg-open", [out]];
  spawn(opener[0], opener[1], { detached: true, stdio: "ignore" }).unref();
}

main();
