import { t as e } from "./rolldown-runtime-ByS9L0ie.js";
import { n as t, r as n, t as r } from "./aiRegistry-YUbyOWOu.js";
import { BrowserWindow as i, WebContentsView as a, app as o, ipcMain as s } from "electron";
import c from "path";
import { fileURLToPath as l } from "url";
import u from "fs/promises";
import * as d from "js-yaml";
import { spawn as f, spawnSync as p } from "child_process";
//#region electron/ipc/cliRunner.ts
async function m(e) {
	let t = process.platform === "win32";
	try {
		let n = p(t ? "where" : "which", [e], {
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
		let t = process.env.APPDATA || "", n = c.join(t, "npm", `${e}.cmd`);
		try {
			if ((await import("fs")).existsSync(n)) return n;
		} catch {}
		let r = process.env.LOCALAPPDATA || "", i = c.join(r, "Programs");
		try {
			let t = await import("fs");
			if (t.existsSync(i)) {
				let n = t.readdirSync(i, { withFileTypes: !0 }).map((e) => e.name).filter(Boolean);
				for (let r of n) {
					let n = c.join(i, r, "bin", e);
					if (t.existsSync(n)) return n;
					let a = c.join(i, r, `${e}.cmd`);
					if (t.existsSync(a)) return a;
				}
			}
		} catch {}
	}
	let n = process.env.HOME || process.env.USERPROFILE || "", r = t ? [] : [
		c.join(n, ".local", "bin"),
		"/usr/local/bin",
		"/opt/homebrew/bin"
	];
	for (let t of r) try {
		let n = await import("fs"), r = c.join(t, e);
		if (n.existsSync(r)) return r;
	} catch {}
	return null;
}
async function h(e) {
	let t = [e.cliBinary, ...e.altBinaries ?? []].filter((e) => !!e);
	for (let e of t) {
		let t = await m(e);
		if (t) return t;
	}
	return null;
}
async function g() {
	let e = r("local-cli").filter((e) => e.kind === "cli"), t = [];
	for (let n of e) {
		if (!n.cliBinary) continue;
		let e = await h(n), r;
		if (e && n.versionArgs) try {
			let t = p(e, n.versionArgs, {
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
function _(e, t) {
	let n = { ...process.env };
	return t && e.envKeyNames?.[0] && (n[e.envKeyNames[0]] = t), n;
}
async function v(e, t, n) {
	let r = await h(e);
	if (!r) throw Error(`CLI binary not found: ${e.cliBinary}`);
	let i = e.buildArgs ? e.buildArgs({
		model: n.model,
		...e.promptViaArgv ? { prompt: t } : {}
	}) : [], a = process.platform === "win32" && (r.endsWith(".cmd") || r.endsWith(".bat")), o = f(r, i, {
		shell: a,
		stdio: [
			"pipe",
			"pipe",
			"pipe"
		],
		windowsHide: !0,
		env: n.env || _(e)
	}), s = "", c = "", l = new Promise((e, t) => {
		setTimeout(() => t(/* @__PURE__ */ Error("CLI execution timed out")), 15e4);
	});
	o.stdout.on("data", (e) => {
		let t = e.toString("utf-8");
		s += t, n.onChunk(t);
	}), o.stderr.on("data", (e) => {
		c += e.toString("utf-8");
	}), !e.promptViaArgv && t && o.stdin.write(t), o.stdin.end();
	let [u] = await Promise.race([new Promise((e) => {
		o.on("close", (t, n) => e([t, n]));
	}), l.then(() => (o.kill(), [1, "SIGTERM"]))]);
	if (u !== 0 || u === null) {
		let e = c.slice(-500), t = u === null ? `CLI process was killed (${n.model ? `model=${n.model} ` : ""})` : `CLI exited with code ${u}${e ? ": " + y(e) : ""}`;
		throw Error(t);
	}
	return s;
}
function y(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
//#endregion
//#region electron/ipc/aiConfig.ts
var b = null;
function x() {
	if (b) return b;
	try {
		let { app: t } = e("electron");
		b = t.getPath("userData");
	} catch {
		b = "";
	}
	return b;
}
function S() {
	return c.join(x(), "ai-config.json");
}
var C = /* @__PURE__ */ new Map();
function w(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
async function T() {
	try {
		let e = S(), t = await u.readFile(e, "utf-8");
		return JSON.parse(t);
	} catch {
		return null;
	}
}
async function E(e) {
	let { safeStorage: t } = await import("electron");
	return t.isEncryptionAvailable() ? t.encryptString(e).toString("base64") : "";
}
async function D(e) {
	let { safeStorage: t } = await import("electron");
	if (!t.isEncryptionAvailable() || !e) return "";
	try {
		return t.decryptString(Buffer.from(e, "base64"));
	} catch {
		return "";
	}
}
async function O(e) {
	let t = S(), n = t + ".tmp." + Date.now(), r = JSON.stringify({
		...e,
		agentCredentials: await k(e.agentCredentials)
	}, null, 2);
	await u.writeFile(n, r, "utf-8"), await u.rename(n, t);
}
async function k(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = {};
		r.apiKeyEnc && (e.apiKeyEnc = r.apiKeyEnc), r.customEndpoint && (e.customEndpoint = r.customEndpoint), t[n] = e;
	}
	return t;
}
async function A(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = {};
		if (r.apiKeyEnc) {
			let t = await D(r.apiKeyEnc);
			t && (e.apiKey = t);
		}
		let i = C.get(n);
		i && (e.apiKey = i), r.customEndpoint && (e.customEndpoint = r.customEndpoint), t[n] = e;
	}
	return t;
}
async function j(e) {
	let r = await T();
	if (!r) return {};
	let i = (await A(r.agentCredentials ?? {}))[e], a = t(n(e)), o = i?.apiKey;
	!o && a?.envKeyNames?.[0] && (o = process.env[a.envKeyNames[0]]);
	let s = r.agentModels?.[e];
	return {
		apiKey: o,
		customEndpoint: i?.customEndpoint,
		model: s
	};
}
async function M() {
	let { app: e, safeStorage: r } = await import("electron");
	await e.whenReady(), b = e.getPath("userData"), C.size > 0 && r.isEncryptionAvailable(), s.handle("ai_config_load", async () => {
		try {
			let e = await T();
			if (!e || e.schemaVersion !== 1) return {
				selectedAgentId: "",
				agentModels: {},
				agentCredentials: {}
			};
			let t = await A(e.agentCredentials ?? {});
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
	}), s.handle("ai_config_save", async (e, t) => {
		try {
			let e = await T();
			await O({
				schemaVersion: 1,
				selectedAgentId: t.selectedAgentId,
				agentModels: t.agentModels ?? {},
				agentCredentials: await N(e?.agentCredentials, t)
			});
		} catch (e) {
			throw console.error("Failed to save AI config:", e), e;
		}
	}), s.handle("ai_connection_test", async (e, r) => {
		try {
			let e = n(r.agentId), i = t(e);
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
							errorMessage: `Anthropic API error (${e.status}): ${w(t.slice(0, 200))}`
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
							errorMessage: `API error (${i.status}): ${w(e.slice(0, 200))}`
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
							errorMessage: `Cursor API error (${t.status}): ${w(e.slice(0, 200))}`
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
							errorMessage: `Gateway error (${i.status}): ${w(e.slice(0, 200))}`
						};
					}
					return { ok: !0 };
				} catch (e) {
					return {
						ok: !1,
						errorMessage: `Connection test failed: ${w((e instanceof Error ? e.message : String(e)).slice(0, 200))}`
					};
				}
			}
		} catch (e) {
			return {
				ok: !1,
				errorMessage: `Connection test failed: ${w((e instanceof Error ? e.message : String(e)).slice(0, 200))}`
			};
		}
	});
}
async function N(e, t) {
	let n = {}, r = /* @__PURE__ */ new Set([...Object.keys(e || {}), ...Object.keys(t.agentCredentials)]);
	for (let i of r) {
		let r = e?.[i], a = t.agentCredentials[i], o = {};
		if (a && "apiKey" in a) {
			if (typeof a.apiKey == "string" && a.apiKey.length > 0) {
				let e = await E(a.apiKey);
				e ? o.apiKeyEnc = e : C.set(i, a.apiKey);
			}
		} else r?.apiKeyEnc && (o.apiKeyEnc = r.apiKeyEnc);
		a && "customEndpoint" in a ? o.customEndpoint = a.customEndpoint : r?.customEndpoint && (o.customEndpoint = r.customEndpoint), n[i] = o;
	}
	return n;
}
//#endregion
//#region electron/ipc/fileSystem.ts
function P(e, ...t) {
	if (!e || typeof e != "string") throw Error("Invalid base path specified");
	let n = c.resolve(e), r = c.resolve(n, ...t);
	if (!r.startsWith(n)) throw Error(`Path traversal blocked: target "${r}" is outside base directory "${n}"`);
	return r;
}
function F(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
function I() {
	s.handle("list_projects", async () => []), s.handle("save_project", async (e, { project: t }) => {
		if (!t || !t.saveLocation) return;
		let n = P(t.saveLocation, "project.json"), r = JSON.stringify(t, null, 2);
		await u.mkdir(t.saveLocation, { recursive: !0 }), await u.writeFile(n, r, "utf-8");
	}), s.handle("scan_agent_clis", async () => {
		let e = await g(), t = r("cloud-api").map((e) => ({
			id: e.id,
			name: e.displayName,
			cli_binary: "",
			installed: !0,
			icon_name: e.iconName,
			category: "cloud-api",
			description: e.description
		}));
		return [...e, ...t];
	}), s.handle("run_agent_cli_stream", async (e, r) => {
		let { agentId: i, prompt: a, systemInstruction: o, model: s } = r, c = n(i), l = t(c);
		if (!l) try {
			let { createProvider: e } = await import("./aiProvider-CWCE1cj3.js");
			return await (await e(c, {})).generateFlow(a, o);
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			throw console.error("AI provider error:", e), Error(`AI generation failed: ${F(t)}`);
		}
		let { apiKey: u, customEndpoint: d, model: f } = await j(c), p = s || f || l.defaultModel || "", m = d || l.defaultEndpoint || "";
		if (l.kind === "cli") try {
			let t = _(l, u);
			return await v(l, o ? `${o}\n\n${a}` : a, {
				model: p,
				env: t,
				onChunk: (t) => {
					e.sender.send("ai-stream-chunk", {
						agentId: i,
						delta: t
					});
				}
			});
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			throw console.error("CLI agent error:", e), Error(`AI generation failed: ${F(t)}`);
		}
		try {
			let { createProvider: t } = await import("./aiProvider-CWCE1cj3.js"), n = await t(c, {
				apiKey: u,
				customEndpoint: m,
				model: p
			}), r = n;
			if (typeof r.generateFlowStream == "function") {
				let t = "";
				return await r.generateFlowStream(a, o, (n) => {
					e.sender.send("ai-stream-chunk", {
						agentId: i,
						delta: n
					}), t += n;
				}), t;
			}
			return await n.generateFlow(a, o);
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			throw console.error("AI provider error:", e), Error(`AI generation failed: ${F(t)}`);
		}
	}), s.handle("parse_yaml_flow", async (e, { yamlContent: t }) => {
		try {
			let e = d.load(t, { schema: d.JSON_SCHEMA });
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
	}), s.handle("save_project_to_disk", async (e, { projectId: t, saveLocation: n, data: r }) => {
		let i = P(n, "project.json");
		return await u.mkdir(n, { recursive: !0 }), await u.writeFile(i, r, "utf-8"), n;
	}), s.handle("load_project_from_disk", async (e, { projectId: t, saveLocation: n }) => {
		let r = P(n, "project.json");
		return await u.readFile(r, "utf-8");
	}), s.handle("save_flow_to_disk", async (e, { projectId: t, saveLocation: n, flowName: r, yamlContent: i }) => {
		let a = P(n, "flows"), o = P(a, r);
		return await u.mkdir(a, { recursive: !0 }), await u.writeFile(o, i, "utf-8"), o;
	}), s.handle("save_dom_snapshot", async (e, { projectId: t, saveLocation: n, pagePath: r, snapshotData: i }) => {
		let a = P(n, "snapshots");
		await u.mkdir(a, { recursive: !0 });
		let o = P(a, r.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".json");
		return await u.writeFile(o, i, "utf-8"), o;
	}), s.handle("load_dom_snapshots", async (e, { projectId: t, saveLocation: n }) => {
		let r = P(n, "snapshots");
		try {
			let e = await u.readdir(r), t = [];
			for (let n of e) if (n.endsWith(".json")) {
				let e = P(r, n), i = await u.readFile(e, "utf-8");
				t.push([n.replace(".json", ""), i]);
			}
			return t;
		} catch {
			return [];
		}
	}), s.handle("save_playwright_code", async (e, { projectId: t, saveLocation: n, fileName: r, code: i }) => {
		let a = P(n, "tests"), o = P(a, r);
		return await u.mkdir(a, { recursive: !0 }), await u.writeFile(o, i, "utf-8"), o;
	});
}
//#endregion
//#region electron/ipc/webviewManager.ts
var L = 4, R = /* @__PURE__ */ new Map();
function z(e) {
	return typeof e == "string" && e.length > 0 && e.length <= 128;
}
function B(e) {
	for (; R.size > L;) {
		let t = null, n = Infinity;
		for (let [e, r] of R) r.lastUsed < n && (n = r.lastUsed, t = e);
		if (!t) break;
		let r = R.get(t);
		try {
			e.contentView.removeChildView(r.view);
		} catch {}
		r.view.webContents.close(), R.delete(t);
	}
}
function V() {
	s.handle("open_child_webview", async (e, { projectId: t, url: n, x: r, y: o, width: s, height: c }) => {
		if (!z(t)) {
			console.warn(`Blocked invalid webview projectId: ${t}`);
			return;
		}
		if (n && !n.startsWith("http://") && !n.startsWith("https://") && n !== "about:blank") {
			console.warn(`Blocked invalid webview URL navigation attempt: ${n}`);
			return;
		}
		let l = i.fromWebContents(e.sender);
		if (!l) return;
		if (R.has(t)) {
			let e = R.get(t);
			e.lastUsed = Date.now(), e.lastBounds = {
				x: Math.round(r),
				y: Math.round(o),
				width: Math.round(s),
				height: Math.round(c)
			};
			try {
				l.contentView.removeChildView(e.view);
			} catch {}
			l.contentView.addChildView(e.view), e.view.setBounds(e.lastBounds), n && e.view.webContents.getURL() !== n && e.view.webContents.loadURL(n);
			return;
		}
		let u = new a({ webPreferences: {
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !0
		} }), d = {
			x: Math.round(r),
			y: Math.round(o),
			width: Math.round(s),
			height: Math.round(c)
		};
		l.contentView.addChildView(u), u.setBounds(d), n && u.webContents.loadURL(n), R.set(t, {
			view: u,
			lastUsed: Date.now(),
			lastBounds: d
		}), B(l);
	}), s.handle("resize_child_webview", async (e, { projectId: t, x: n, y: r, width: i, height: a }) => {
		if (!z(t)) return;
		let o = R.get(t);
		if (!o) return;
		let s = {
			x: Math.round(n),
			y: Math.round(r),
			width: Math.round(i),
			height: Math.round(a)
		};
		o.lastBounds = s, o.view.setBounds(s), o.lastUsed = Date.now();
	}), s.handle("set_child_webview_visible", async (e, { projectId: t, visible: n }) => {
		if (!z(t)) return;
		let r = R.get(t);
		r && (n ? r.lastBounds && (r.lastBounds.width > 0 || r.lastBounds.height > 0) && r.view.setBounds(r.lastBounds) : r.view.setBounds({
			x: 0,
			y: 0,
			width: 0,
			height: 0
		}));
	}), s.handle("close_child_webview", async (e, { projectId: t }) => {
		if (!z(t)) return;
		let n = R.get(t);
		if (!n) return;
		let r = i.fromWebContents(e.sender);
		if (r) try {
			r.contentView.removeChildView(n.view);
		} catch {}
		n.view.webContents.close(), R.delete(t);
	});
}
//#endregion
//#region electron/ipc/index.ts
var H = !1;
async function U() {
	if (I(), V(), await M(), !H) {
		H = !0;
		let { registerPlaywrightHandlers: e } = await import("./playwrightEngine-BkD6LycP.js");
		e();
	}
}
//#endregion
//#region electron/main.ts
var W = c.dirname(l(import.meta.url));
process.env.APP_ROOT = c.join(W, "..");
var G = process.env.VITE_DEV_SERVER_URL, K = c.join(process.env.APP_ROOT, "dist-electron"), q = c.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = G ? c.join(process.env.APP_ROOT, "public") : q, o.isPackaged || (o.commandLine.appendSwitch("remote-debugging-port", "9222"), o.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1"));
var J;
function Y() {
	let e = c.join(W, "../electron/icons/icon-256x256.png");
	J = new i({
		width: 1200,
		height: 800,
		autoHideMenuBar: !0,
		icon: e,
		webPreferences: {
			preload: c.join(W, "preload.mjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !0
		}
	}), J.setMenuBarVisibility(!1), G ? J.loadURL(G) : J.loadFile(c.join(q, "index.html"));
}
o.on("window-all-closed", () => {
	process.platform !== "darwin" && (o.quit(), J = null);
}), o.on("activate", () => {
	i.getAllWindows().length === 0 && Y();
}), o.whenReady().then(async () => {
	Y(), await U();
});
//#endregion
export { K as MAIN_DIST, q as RENDERER_DIST, G as VITE_DEV_SERVER_URL };
