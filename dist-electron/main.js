import { i as e, n as t, r as n, t as r } from "./aiRegistry-BzXGNFP-.js";
import { n as i } from "./webviewManager-BJgH45q6.js";
import { createRequire as a } from "node:module";
import { BrowserWindow as o, app as s, ipcMain as c } from "electron";
import l from "path";
import { fileURLToPath as u } from "url";
import d from "fs/promises";
import * as f from "js-yaml";
import { spawn as p, spawnSync as m } from "child_process";
//#region \0rolldown/runtime.js
var h = /* @__PURE__ */ a(import.meta.url);
//#endregion
//#region electron/ipc/cliRunner.ts
async function g(e) {
	let t = process.platform === "win32";
	try {
		let n = m(t ? "where" : "which", [e], {
			encoding: "utf-8",
			windowsHide: !0,
			timeout: 5e3
		});
		if (n.status === 0 && n.stdout) {
			let e = n.stdout.trim().split(/\r?\n/)[0]?.trim();
			if (e) return e;
		}
	} catch {}
	if (t) {
		let t = process.env.APPDATA || "", n = l.join(t, "npm", `${e}.cmd`);
		try {
			if ((await import("fs")).existsSync(n)) return n;
		} catch {}
		let r = process.env.LOCALAPPDATA || "", i = l.join(r, "Programs");
		try {
			let t = await import("fs");
			if (t.existsSync(i)) {
				let n = t.readdirSync(i, { withFileTypes: !0 }).map((e) => e.name).filter(Boolean);
				for (let r of n) {
					let n = l.join(i, r, "bin", e);
					if (t.existsSync(n)) return n;
					let a = l.join(i, r, `${e}.cmd`);
					if (t.existsSync(a)) return a;
				}
			}
		} catch {}
	}
	let n = process.env.HOME || process.env.USERPROFILE || "", r = t ? [] : [
		l.join(n, ".local", "bin"),
		"/usr/local/bin",
		"/opt/homebrew/bin"
	];
	for (let t of r) try {
		let n = await import("fs"), r = l.join(t, e);
		if (n.existsSync(r)) return r;
	} catch {}
	return null;
}
async function _(e) {
	let t = [e.cliBinary, ...e.altBinaries ?? []].filter((e) => !!e);
	for (let e of t) {
		let t = await g(e);
		if (t) return t;
	}
	return null;
}
async function v() {
	let e = r("local-cli").filter((e) => e.kind === "cli"), t = [];
	for (let n of e) {
		if (!n.cliBinary) continue;
		let e = await _(n), r;
		if (e && n.versionArgs) try {
			let t = m(e, n.versionArgs, {
				encoding: "utf-8",
				windowsHide: !0,
				timeout: 5e3
			});
			t.status === 0 && t.stdout && (r = t.stdout.trim().slice(0, 50));
		} catch {}
		t.push({
			id: n.id,
			name: n.displayName,
			cli_binary: n.cliBinary,
			path: e || void 0,
			installed: !!e,
			icon_name: n.iconName,
			category: "local-cli",
			description: n.description,
			version: r
		});
	}
	return t;
}
function y(e, t) {
	let n = { ...process.env };
	return t && e.envKeyNames?.[0] && (n[e.envKeyNames[0]] = t), n;
}
function b(e) {
	return `"${e.replace(/"/g, "\"\"").replace(/([&|<>\^%])/g, "^$1")}"`;
}
async function x(e, t, n) {
	let r = await _(e);
	if (!r) throw Error(`CLI binary not found: ${e.cliBinary}`);
	let i = e.buildArgs ? e.buildArgs({
		model: n.model,
		...e.promptViaArgv ? { prompt: t } : {}
	}) : [], a = process.platform === "win32" && (r.endsWith(".cmd") || r.endsWith(".bat"));
	a && (i = i.map((e) => b(e)));
	let o = p(r, i, {
		shell: a,
		stdio: [
			"pipe",
			"pipe",
			"pipe"
		],
		windowsHide: !0,
		env: n.env || y(e)
	}), s = "", c = "", l = null;
	o.on("error", (e) => {
		l = e;
	});
	let u = new Promise((e, t) => {
		setTimeout(() => t(/* @__PURE__ */ Error("CLI execution timed out")), 24e4);
	});
	o.stdout.on("data", (e) => {
		let t = e.toString("utf-8");
		s += t, n.onChunk(t);
	}), o.stderr.on("data", (e) => {
		c += e.toString("utf-8");
	}), !e.promptViaArgv && t && o.stdin.write(t), o.stdin.end();
	let [d] = await Promise.race([new Promise((e) => {
		o.on("close", (t, n) => e([t, n]));
	}), u.then(() => (o.kill(), [1, "SIGTERM"]))]);
	if (l) throw Error(`CLI process error: ${S(l.message || String(l))}`);
	if (d !== 0 || d === null) {
		let e = c.slice(-500), t = d === null ? `CLI process was killed (${n.model ? `model=${n.model} ` : ""})` : `CLI exited with code ${d}${e ? ": " + S(e) : ""}`;
		throw Error(t);
	}
	return s;
}
function S(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
//#endregion
//#region electron/ipc/aiConfig.ts
var C = null;
function w() {
	if (C) return C;
	try {
		let { app: e } = h("electron");
		C = e.getPath("userData");
	} catch {
		C = "";
	}
	return C;
}
function T() {
	return l.join(w(), "ai-config.json");
}
var E = /* @__PURE__ */ new Map();
function D(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
async function O() {
	try {
		let e = T(), t = await d.readFile(e, "utf-8");
		return JSON.parse(t);
	} catch {
		return null;
	}
}
async function k(e) {
	let { safeStorage: t } = await import("electron");
	return t.isEncryptionAvailable() ? t.encryptString(e).toString("base64") : "";
}
async function A(e) {
	let { safeStorage: t } = await import("electron");
	if (!t.isEncryptionAvailable() || !e) return "";
	try {
		return t.decryptString(Buffer.from(e, "base64"));
	} catch {
		return "";
	}
}
async function j(e) {
	let t = T(), n = t + ".tmp." + Date.now(), r = JSON.stringify({
		...e,
		agentCredentials: await M(e.agentCredentials)
	}, null, 2);
	await d.writeFile(n, r, "utf-8"), await d.rename(n, t);
}
async function M(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = {};
		r.apiKeyEnc && (e.apiKeyEnc = r.apiKeyEnc), r.customEndpoint && (e.customEndpoint = r.customEndpoint), t[n] = e;
	}
	return t;
}
async function N(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = {};
		if (r.apiKeyEnc) {
			let t = await A(r.apiKeyEnc);
			t && (e.apiKey = t);
		}
		let i = E.get(n);
		i && (e.apiKey = i), r.customEndpoint && (e.customEndpoint = r.customEndpoint), t[n] = e;
	}
	return t;
}
async function P(n) {
	let r = await O();
	if (!r) return {};
	let i = (await N(r.agentCredentials ?? {}))[n], a = t(e(n)), o = i?.apiKey;
	!o && a?.envKeyNames?.[0] && (o = process.env[a.envKeyNames[0]]);
	let s = r.agentModels?.[n];
	return {
		apiKey: o,
		customEndpoint: i?.customEndpoint,
		model: s
	};
}
async function F() {
	let { app: r, safeStorage: i } = await import("electron");
	await r.whenReady(), C = r.getPath("userData"), E.size > 0 && i.isEncryptionAvailable(), c.handle("ai_config_load", async () => {
		try {
			let e = await O();
			if (!e || e.schemaVersion !== 1) return {
				selectedAgentId: "",
				agentModels: {},
				agentCredentials: {}
			};
			let t = await N(e.agentCredentials ?? {});
			return {
				selectedAgentId: e.selectedAgentId || "",
				agentModels: e.agentModels || {},
				agentCredentials: t
			};
		} catch (e) {
			return console.error("Failed to load AI config:", e), {
				selectedAgentId: "",
				agentModels: {},
				agentCredentials: {}
			};
		}
	}), c.handle("ai_config_save", async (e, t) => {
		try {
			let e = await O();
			await j({
				schemaVersion: 1,
				selectedAgentId: t.selectedAgentId,
				agentModels: t.agentModels ?? {},
				agentCredentials: await I(e?.agentCredentials, t)
			});
		} catch (e) {
			throw console.error("Failed to save AI config:", e), e;
		}
	}), c.handle("ai_fetch_models", async (r, i) => {
		try {
			let r = e(i.agentId), a = t(r), o = i.customEndpoint || a?.defaultEndpoint || "", s = i.apiKey;
			if (a?.protocol === "google") {
				let e = s || process.env.GEMINI_API_KEY || "";
				if (!e) return a.models;
				let t = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${e}`, {
					method: "GET",
					signal: AbortSignal.timeout(8e3)
				});
				if (t.ok) {
					let e = ((await t.json()).models || []).map((e) => e.name?.replace(/^models\//, "") || "").filter((e) => e && e.startsWith("gemini"));
					if (e.length > 0) return Array.from(new Set(e));
				}
				return a.models;
			}
			if (a?.protocol === "anthropic") {
				if (!s) return a.models;
				let e = (o || "https://api.anthropic.com").replace(/\/+$/, ""), t = await fetch(`${e}/v1/models`, {
					method: "GET",
					signal: AbortSignal.timeout(8e3),
					headers: {
						"x-api-key": s,
						"anthropic-version": "2023-06-01"
					}
				});
				if (t.ok) {
					let e = ((await t.json()).data || []).map((e) => e.id || "").filter(Boolean);
					if (e.length > 0) return Array.from(new Set(e));
				}
				return a.models;
			}
			if (a?.protocol === "openai" || a?.protocol === "openai-compat" || !a?.protocol) {
				let e = o || "http://localhost:11434", t = e.endsWith("/v1") || e.endsWith("/") ? `${e.replace(/\/+$/, "")}/models` : `${e.replace(/\/+$/, "")}/v1/models`, r = {};
				s && (r.Authorization = `Bearer ${s}`);
				let i = await fetch(t, {
					method: "GET",
					signal: AbortSignal.timeout(8e3),
					headers: r
				});
				if (i.ok) {
					let e = await i.json(), t = (Array.isArray(e) ? e : e.data || []).map((e) => e.id || e.name || "").filter((e) => e && n(e));
					if (t.length > 0) return Array.from(new Set(t));
				}
				return a?.models || [];
			}
			return a?.models || [];
		} catch (n) {
			return console.warn("Dynamic model fetch failed, using default models:", n), t(e(i.agentId))?.models || [];
		}
	}), c.handle("ai_connection_test", async (n, r) => {
		try {
			let n = e(r.agentId), i = t(n);
			if (!i && !r.agentId) return {
				ok: !1,
				errorMessage: "Unknown agent ID"
			};
			let a = r.customEndpoint || i?.defaultEndpoint || "", o = r.model || i?.defaultModel || "";
			switch (i?.protocol) {
				case "anthropic": {
					let e = await fetch(`${a || "https://api.anthropic.com"}/v1/messages`, {
						method: "POST",
						signal: AbortSignal.timeout(1e4),
						headers: {
							"Content-Type": "application/json",
							"x-api-key": r.apiKey,
							"anthropic-version": "2023-06-01"
						},
						body: JSON.stringify({
							model: o,
							max_tokens: 1,
							messages: [{
								role: "user",
								content: "ping"
							}]
						})
					});
					if (!e.ok) {
						let t = await e.text().catch(() => "");
						return {
							ok: !1,
							errorMessage: `Anthropic API error (${e.status}): ${D(t.slice(0, 200))}`
						};
					}
					return { ok: !0 };
				}
				case "openai":
				case "openai-compat": {
					let e = a || "http://localhost:11434", t = e.endsWith("/v1") || e.endsWith("/") ? `${e}/chat/completions` : `${e}/v1/chat/completions`, n = { "Content-Type": "application/json" };
					r.apiKey && (n.Authorization = `Bearer ${r.apiKey}`);
					let i = await fetch(t, {
						method: "POST",
						signal: AbortSignal.timeout(1e4),
						headers: n,
						body: JSON.stringify({
							model: o || "llama3.2",
							max_tokens: 1,
							messages: [{
								role: "user",
								content: "ping"
							}]
						})
					});
					if (!i.ok) {
						let e = await i.text().catch(() => "");
						return {
							ok: !1,
							errorMessage: `API error (${i.status}): ${D(e.slice(0, 200))}`
						};
					}
					return { ok: !0 };
				}
				case "cursor": {
					let e = (a || "https://api.cursor.com").replace(/\/+$/, ""), t = await fetch(`${e}/v1/agents/tasks`, {
						method: "GET",
						signal: AbortSignal.timeout(1e4),
						headers: {
							"Content-Type": "application/json",
							...r.apiKey ? { Authorization: `Bearer ${r.apiKey}` } : {}
						}
					});
					if (t.status === 401 || t.status === 403) return {
						ok: !1,
						errorMessage: "Invalid Cursor API key"
					};
					if (!t.ok) {
						let e = await t.text().catch(() => "");
						return {
							ok: !1,
							errorMessage: `Cursor API error (${t.status}): ${D(e.slice(0, 200))}`
						};
					}
					return { ok: !0 };
				}
				default: try {
					let e = a || "http://localhost:11434", t = e.endsWith("/v1") || e.endsWith("/") ? `${e}/chat/completions` : `${e}/v1/chat/completions`, n = { "Content-Type": "application/json" };
					r.apiKey && (n.Authorization = `Bearer ${r.apiKey}`);
					let i = await fetch(t, {
						method: "POST",
						signal: AbortSignal.timeout(1e4),
						headers: n,
						body: JSON.stringify({
							model: o || "llama3.2",
							max_tokens: 1,
							messages: [{
								role: "user",
								content: "ping"
							}]
						})
					});
					if (!i.ok) {
						let e = await i.text().catch(() => "");
						return {
							ok: !1,
							errorMessage: `Gateway error (${i.status}): ${D(e.slice(0, 200))}`
						};
					}
					return { ok: !0 };
				} catch (e) {
					return {
						ok: !1,
						errorMessage: `Connection test failed: ${D((e instanceof Error ? e.message : String(e)).slice(0, 200))}`
					};
				}
			}
		} catch (e) {
			return {
				ok: !1,
				errorMessage: `Connection test failed: ${D((e instanceof Error ? e.message : String(e)).slice(0, 200))}`
			};
		}
	});
}
async function I(e, t) {
	let n = {}, r = /* @__PURE__ */ new Set([...Object.keys(e || {}), ...Object.keys(t.agentCredentials)]);
	for (let i of r) {
		let r = e?.[i], a = t.agentCredentials[i], o = {};
		if (a && "apiKey" in a) {
			if (typeof a.apiKey == "string" && a.apiKey.length > 0) {
				let e = await k(a.apiKey);
				e ? o.apiKeyEnc = e : E.set(i, a.apiKey);
			}
		} else r?.apiKeyEnc && (o.apiKeyEnc = r.apiKeyEnc);
		a && "customEndpoint" in a ? o.customEndpoint = a.customEndpoint : r?.customEndpoint && (o.customEndpoint = r.customEndpoint), n[i] = o;
	}
	return n;
}
//#endregion
//#region electron/ipc/fileSystem.ts
function L(e) {
	if (!e || typeof e != "string" || !e.trim()) throw Error("Invalid save location: path cannot be empty");
	return l.resolve(e.trim());
}
function R(e, ...t) {
	if (!e || typeof e != "string" || !e.trim()) throw Error("Invalid base path specified");
	let n = l.resolve(e.trim()), r = l.resolve(n, ...t), i = r === n, a = r.startsWith(n + l.sep);
	if (!i && !a) throw Error(`Path traversal blocked: target "${r}" is outside base directory "${n}"`);
	return r;
}
function z(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
function B() {
	c.handle("list_projects", async () => []), c.handle("save_project", async (e, { project: t }) => {
		if (!t || !t.saveLocation) return;
		let n = L(t.saveLocation), r = R(n, "project.json"), i = JSON.stringify(t, null, 2);
		await d.mkdir(n, { recursive: !0 }), await d.writeFile(r, i, "utf-8");
	}), c.handle("scan_agent_clis", async () => {
		let e = await v(), t = r("cloud-api").map((e) => ({
			id: e.id,
			name: e.displayName,
			cli_binary: "",
			installed: !0,
			icon_name: e.iconName,
			category: "cloud-api",
			description: e.description
		}));
		return [...e, ...t];
	}), c.handle("run_agent_cli_stream", async (n, r) => {
		let { agentId: i, prompt: a, systemInstruction: o, model: s } = r, c = e(i), l = t(c);
		if (!l) try {
			let { createProvider: e } = await import("./aiProvider-nOBqEN2s.js");
			return await (await e(c, {})).generateFlow(a, o);
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			throw console.error("AI provider error:", e), Error(`AI generation failed: ${z(t)}`);
		}
		let { apiKey: u, customEndpoint: d, model: f } = await P(c), p = s || f || l.defaultModel || "", m = d || l.defaultEndpoint || "";
		if (l.kind === "cli") try {
			let e = y(l, u);
			return await x(l, o ? `${o}\n\n${a}` : a, {
				model: p,
				env: e,
				onChunk: (e) => {
					n.sender.isDestroyed() || n.sender.send("ai-stream-chunk", {
						agentId: i,
						delta: e
					});
				}
			});
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			throw console.error("CLI agent error:", e), Error(`AI generation failed: ${z(t)}`);
		}
		try {
			let { createProvider: e } = await import("./aiProvider-nOBqEN2s.js"), t = await e(c, {
				apiKey: u,
				customEndpoint: m,
				model: p
			}), r = t;
			if (typeof r.generateFlowStream == "function") {
				let e = "";
				return await r.generateFlowStream(a, o, (t) => {
					n.sender.isDestroyed() || n.sender.send("ai-stream-chunk", {
						agentId: i,
						delta: t
					}), e += t;
				}), e;
			}
			return await t.generateFlow(a, o);
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			throw console.error("AI provider error:", e), Error(`AI generation failed: ${z(t)}`);
		}
	}), c.handle("parse_yaml_flow", async (e, { yamlContent: t }) => {
		try {
			let e = f.load(t, { schema: f.JSON_SCHEMA });
			if (!e) return {
				steps: [],
				metadata: {}
			};
			let n = [], r = {
				url: e.url,
				name: e.name
			};
			return Array.isArray(e) ? e.forEach((e, t) => {
				let r = Object.keys(e)[0];
				n.push({
					id: `step-${Date.now()}-${t}`,
					command: r,
					target: e[r],
					status: "pending"
				});
			}) : e.steps && Array.isArray(e.steps) && e.steps.forEach((e, t) => {
				let r = Object.keys(e)[0];
				n.push({
					id: `step-${Date.now()}-${t}`,
					command: r,
					target: e[r],
					status: "pending"
				});
			}), {
				steps: n,
				metadata: r
			};
		} catch (e) {
			return console.error("Yaml parsing error", e), {
				steps: [],
				metadata: {}
			};
		}
	}), c.handle("save_project_to_disk", async (e, { projectId: t, saveLocation: n, data: r }) => {
		let i = L(n), a = R(i, "project.json");
		return await d.mkdir(i, { recursive: !0 }), await d.writeFile(a, r, "utf-8"), i;
	}), c.handle("load_project_from_disk", async (e, { projectId: t, saveLocation: n }) => {
		let r = R(L(n), "project.json");
		return await d.readFile(r, "utf-8");
	}), c.handle("save_flow_to_disk", async (e, { projectId: t, saveLocation: n, flowName: r, yamlContent: i }) => {
		let a = R(L(n), "flows"), o = R(a, r);
		return await d.mkdir(a, { recursive: !0 }), await d.writeFile(o, i, "utf-8"), o;
	}), c.handle("save_dom_snapshot", async (e, { projectId: t, saveLocation: n, pagePath: r, snapshotData: i }) => {
		let a = R(L(n), "snapshots");
		await d.mkdir(a, { recursive: !0 });
		let o = R(a, r.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".json");
		return await d.writeFile(o, i, "utf-8"), o;
	}), c.handle("load_dom_snapshots", async (e, { projectId: t, saveLocation: n }) => {
		let r = R(L(n), "snapshots");
		try {
			let e = await d.readdir(r), t = [];
			for (let n of e) if (n.endsWith(".json")) {
				let e = R(r, n), i = await d.readFile(e, "utf-8");
				t.push([n.replace(".json", ""), i]);
			}
			return t;
		} catch {
			return [];
		}
	}), c.handle("save_playwright_code", async (e, { projectId: t, saveLocation: n, fileName: r, code: i }) => {
		let a = R(L(n), "tests"), o = R(a, r);
		return await d.mkdir(a, { recursive: !0 }), await d.writeFile(o, i, "utf-8"), o;
	});
}
//#endregion
//#region electron/ipc/index.ts
var V = !1;
async function H() {
	if (B(), i(), await F(), !V) {
		V = !0;
		let { registerPlaywrightHandlers: e } = await import("./playwrightEngine-D8P279wB.js");
		e();
	}
}
//#endregion
//#region electron/main.ts
var U = l.dirname(u(import.meta.url));
process.env.APP_ROOT = l.join(U, "..");
var W = process.env.VITE_DEV_SERVER_URL, G = l.join(process.env.APP_ROOT, "dist-electron"), K = l.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = W ? l.join(process.env.APP_ROOT, "public") : K, s.isPackaged || (s.commandLine.appendSwitch("remote-debugging-port", "9222"), s.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1"));
var q;
function J() {
	let e = l.join(U, "../electron/icons/icon-256x256.png");
	q = new o({
		width: 1200,
		height: 800,
		autoHideMenuBar: !0,
		icon: e,
		webPreferences: {
			preload: l.join(U, "preload.mjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !0
		}
	}), q.setMenuBarVisibility(!1), q.webContents.setWindowOpenHandler(() => ({ action: "deny" })), q.webContents.on("will-navigate", (e, t) => {
		W && t.startsWith(W) || t.startsWith("file://") || (e.preventDefault(), console.warn(`Blocked main window unauthorized navigation: ${t}`));
	}), W ? q.loadURL(W) : q.loadFile(l.join(K, "index.html"));
}
s.on("window-all-closed", () => {
	process.platform !== "darwin" && (s.quit(), q = null);
}), s.on("activate", () => {
	o.getAllWindows().length === 0 && J();
}), s.whenReady().then(async () => {
	J(), await H();
});
//#endregion
export { G as MAIN_DIST, K as RENDERER_DIST, W as VITE_DEV_SERVER_URL };
