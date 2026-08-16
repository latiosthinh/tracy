import { n as e, r as t, t as n } from "./aiRegistry-YUbyOWOu.js";
import { n as r } from "./webviewManager-BJgH45q6.js";
import { createRequire as i } from "node:module";
import { BrowserWindow as a, app as o, ipcMain as s } from "electron";
import c from "path";
import { fileURLToPath as l } from "url";
import u from "fs/promises";
import * as d from "js-yaml";
import { spawn as f, spawnSync as p } from "child_process";
//#region \0rolldown/runtime.js
var m = /* @__PURE__ */ i(import.meta.url);
//#endregion
//#region electron/ipc/cliRunner.ts
async function h(e) {
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
async function g(e) {
	let t = [e.cliBinary, ...e.altBinaries ?? []].filter((e) => !!e);
	for (let e of t) {
		let t = await h(e);
		if (t) return t;
	}
	return null;
}
async function _() {
	let e = n("local-cli").filter((e) => e.kind === "cli"), t = [];
	for (let n of e) {
		if (!n.cliBinary) continue;
		let e = await g(n), r;
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
function v(e, t) {
	let n = { ...process.env };
	return t && e.envKeyNames?.[0] && (n[e.envKeyNames[0]] = t), n;
}
function y(e) {
	return `"${e.replace(/"/g, "\"\"").replace(/([&|<>\^%])/g, "^$1")}"`;
}
async function b(e, t, n) {
	let r = await g(e);
	if (!r) throw Error(`CLI binary not found: ${e.cliBinary}`);
	let i = e.buildArgs ? e.buildArgs({
		model: n.model,
		...e.promptViaArgv ? { prompt: t } : {}
	}) : [], a = process.platform === "win32" && (r.endsWith(".cmd") || r.endsWith(".bat"));
	a && (i = i.map((e) => y(e)));
	let o = f(r, i, {
		shell: a,
		stdio: [
			"pipe",
			"pipe",
			"pipe"
		],
		windowsHide: !0,
		env: n.env || v(e)
	}), s = "", c = "", l = null;
	o.on("error", (e) => {
		l = e;
	});
	let u = new Promise((e, t) => {
		setTimeout(() => t(/* @__PURE__ */ Error("CLI execution timed out")), 15e4);
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
	if (l) throw Error(`CLI process error: ${x(l.message || String(l))}`);
	if (d !== 0 || d === null) {
		let e = c.slice(-500), t = d === null ? `CLI process was killed (${n.model ? `model=${n.model} ` : ""})` : `CLI exited with code ${d}${e ? ": " + x(e) : ""}`;
		throw Error(t);
	}
	return s;
}
function x(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
//#endregion
//#region electron/ipc/aiConfig.ts
var S = null;
function C() {
	if (S) return S;
	try {
		let { app: e } = m("electron");
		S = e.getPath("userData");
	} catch {
		S = "";
	}
	return S;
}
function w() {
	return c.join(C(), "ai-config.json");
}
var T = /* @__PURE__ */ new Map();
function E(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
async function D() {
	try {
		let e = w(), t = await u.readFile(e, "utf-8");
		return JSON.parse(t);
	} catch {
		return null;
	}
}
async function O(e) {
	let { safeStorage: t } = await import("electron");
	return t.isEncryptionAvailable() ? t.encryptString(e).toString("base64") : "";
}
async function k(e) {
	let { safeStorage: t } = await import("electron");
	if (!t.isEncryptionAvailable() || !e) return "";
	try {
		return t.decryptString(Buffer.from(e, "base64"));
	} catch {
		return "";
	}
}
async function A(e) {
	let t = w(), n = t + ".tmp." + Date.now(), r = JSON.stringify({
		...e,
		agentCredentials: await j(e.agentCredentials)
	}, null, 2);
	await u.writeFile(n, r, "utf-8"), await u.rename(n, t);
}
async function j(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = {};
		r.apiKeyEnc && (e.apiKeyEnc = r.apiKeyEnc), r.customEndpoint && (e.customEndpoint = r.customEndpoint), t[n] = e;
	}
	return t;
}
async function M(e) {
	let t = {};
	for (let [n, r] of Object.entries(e)) {
		let e = {};
		if (r.apiKeyEnc) {
			let t = await k(r.apiKeyEnc);
			t && (e.apiKey = t);
		}
		let i = T.get(n);
		i && (e.apiKey = i), r.customEndpoint && (e.customEndpoint = r.customEndpoint), t[n] = e;
	}
	return t;
}
async function N(n) {
	let r = await D();
	if (!r) return {};
	let i = (await M(r.agentCredentials ?? {}))[n], a = e(t(n)), o = i?.apiKey;
	!o && a?.envKeyNames?.[0] && (o = process.env[a.envKeyNames[0]]);
	let s = r.agentModels?.[n];
	return {
		apiKey: o,
		customEndpoint: i?.customEndpoint,
		model: s
	};
}
async function P() {
	let { app: n, safeStorage: r } = await import("electron");
	await n.whenReady(), S = n.getPath("userData"), T.size > 0 && r.isEncryptionAvailable(), s.handle("ai_config_load", async () => {
		try {
			let e = await D();
			if (!e || e.schemaVersion !== 1) return {
				selectedAgentId: "",
				agentModels: {},
				agentCredentials: {}
			};
			let t = await M(e.agentCredentials ?? {});
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
			let e = await D();
			await A({
				schemaVersion: 1,
				selectedAgentId: t.selectedAgentId,
				agentModels: t.agentModels ?? {},
				agentCredentials: await F(e?.agentCredentials, t)
			});
		} catch (e) {
			throw console.error("Failed to save AI config:", e), e;
		}
	}), s.handle("ai_connection_test", async (n, r) => {
		try {
			let n = t(r.agentId), i = e(n);
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
							errorMessage: `Anthropic API error (${e.status}): ${E(t.slice(0, 200))}`
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
							errorMessage: `API error (${i.status}): ${E(e.slice(0, 200))}`
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
							errorMessage: `Cursor API error (${t.status}): ${E(e.slice(0, 200))}`
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
							errorMessage: `Gateway error (${i.status}): ${E(e.slice(0, 200))}`
						};
					}
					return { ok: !0 };
				} catch (e) {
					return {
						ok: !1,
						errorMessage: `Connection test failed: ${E((e instanceof Error ? e.message : String(e)).slice(0, 200))}`
					};
				}
			}
		} catch (e) {
			return {
				ok: !1,
				errorMessage: `Connection test failed: ${E((e instanceof Error ? e.message : String(e)).slice(0, 200))}`
			};
		}
	});
}
async function F(e, t) {
	let n = {}, r = /* @__PURE__ */ new Set([...Object.keys(e || {}), ...Object.keys(t.agentCredentials)]);
	for (let i of r) {
		let r = e?.[i], a = t.agentCredentials[i], o = {};
		if (a && "apiKey" in a) {
			if (typeof a.apiKey == "string" && a.apiKey.length > 0) {
				let e = await O(a.apiKey);
				e ? o.apiKeyEnc = e : T.set(i, a.apiKey);
			}
		} else r?.apiKeyEnc && (o.apiKeyEnc = r.apiKeyEnc);
		a && "customEndpoint" in a ? o.customEndpoint = a.customEndpoint : r?.customEndpoint && (o.customEndpoint = r.customEndpoint), n[i] = o;
	}
	return n;
}
//#endregion
//#region electron/ipc/fileSystem.ts
function I(e) {
	if (!e || typeof e != "string" || !e.trim()) throw Error("Invalid save location: path cannot be empty");
	return c.resolve(e.trim());
}
function L(e, ...t) {
	if (!e || typeof e != "string" || !e.trim()) throw Error("Invalid base path specified");
	let n = c.resolve(e.trim()), r = c.resolve(n, ...t), i = r === n, a = r.startsWith(n + c.sep);
	if (!i && !a) throw Error(`Path traversal blocked: target "${r}" is outside base directory "${n}"`);
	return r;
}
function R(e) {
	return e.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/sk-ant-[A-Za-z0-9_-]{8,}/g, "sk-ant-…").replace(/\bBearer [A-Za-z0-9._-]+/g, "Bearer …").replace(/(x-api-key):\s*[A-Za-z0-9_-]+/g, "$1: …").replace(/key=[A-Za-z0-9_-]+/gi, "key=…").replace(/AIza[A-Za-z0-9_-]{3,}/g, "AIza…");
}
function z() {
	s.handle("list_projects", async () => []), s.handle("save_project", async (e, { project: t }) => {
		if (!t || !t.saveLocation) return;
		let n = I(t.saveLocation), r = L(n, "project.json"), i = JSON.stringify(t, null, 2);
		await u.mkdir(n, { recursive: !0 }), await u.writeFile(r, i, "utf-8");
	}), s.handle("scan_agent_clis", async () => {
		let e = await _(), t = n("cloud-api").map((e) => ({
			id: e.id,
			name: e.displayName,
			cli_binary: "",
			installed: !0,
			icon_name: e.iconName,
			category: "cloud-api",
			description: e.description
		}));
		return [...e, ...t];
	}), s.handle("run_agent_cli_stream", async (n, r) => {
		let { agentId: i, prompt: a, systemInstruction: o, model: s } = r, c = t(i), l = e(c);
		if (!l) try {
			let { createProvider: e } = await import("./aiProvider-fmyn_NzE.js");
			return await (await e(c, {})).generateFlow(a, o);
		} catch (e) {
			let t = e instanceof Error ? e.message : String(e);
			throw console.error("AI provider error:", e), Error(`AI generation failed: ${R(t)}`);
		}
		let { apiKey: u, customEndpoint: d, model: f } = await N(c), p = s || f || l.defaultModel || "", m = d || l.defaultEndpoint || "";
		if (l.kind === "cli") try {
			let e = v(l, u);
			return await b(l, o ? `${o}\n\n${a}` : a, {
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
			throw console.error("CLI agent error:", e), Error(`AI generation failed: ${R(t)}`);
		}
		try {
			let { createProvider: e } = await import("./aiProvider-fmyn_NzE.js"), t = await e(c, {
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
			throw console.error("AI provider error:", e), Error(`AI generation failed: ${R(t)}`);
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
		let i = I(n), a = L(i, "project.json");
		return await u.mkdir(i, { recursive: !0 }), await u.writeFile(a, r, "utf-8"), i;
	}), s.handle("load_project_from_disk", async (e, { projectId: t, saveLocation: n }) => {
		let r = L(I(n), "project.json");
		return await u.readFile(r, "utf-8");
	}), s.handle("save_flow_to_disk", async (e, { projectId: t, saveLocation: n, flowName: r, yamlContent: i }) => {
		let a = L(I(n), "flows"), o = L(a, r);
		return await u.mkdir(a, { recursive: !0 }), await u.writeFile(o, i, "utf-8"), o;
	}), s.handle("save_dom_snapshot", async (e, { projectId: t, saveLocation: n, pagePath: r, snapshotData: i }) => {
		let a = L(I(n), "snapshots");
		await u.mkdir(a, { recursive: !0 });
		let o = L(a, r.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".json");
		return await u.writeFile(o, i, "utf-8"), o;
	}), s.handle("load_dom_snapshots", async (e, { projectId: t, saveLocation: n }) => {
		let r = L(I(n), "snapshots");
		try {
			let e = await u.readdir(r), t = [];
			for (let n of e) if (n.endsWith(".json")) {
				let e = L(r, n), i = await u.readFile(e, "utf-8");
				t.push([n.replace(".json", ""), i]);
			}
			return t;
		} catch {
			return [];
		}
	}), s.handle("save_playwright_code", async (e, { projectId: t, saveLocation: n, fileName: r, code: i }) => {
		let a = L(I(n), "tests"), o = L(a, r);
		return await u.mkdir(a, { recursive: !0 }), await u.writeFile(o, i, "utf-8"), o;
	});
}
//#endregion
//#region electron/ipc/index.ts
var B = !1;
async function V() {
	if (z(), r(), await P(), !B) {
		B = !0;
		let { registerPlaywrightHandlers: e } = await import("./playwrightEngine-D8P279wB.js");
		e();
	}
}
//#endregion
//#region electron/main.ts
var H = c.dirname(l(import.meta.url));
process.env.APP_ROOT = c.join(H, "..");
var U = process.env.VITE_DEV_SERVER_URL, W = c.join(process.env.APP_ROOT, "dist-electron"), G = c.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = U ? c.join(process.env.APP_ROOT, "public") : G, o.isPackaged || (o.commandLine.appendSwitch("remote-debugging-port", "9222"), o.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1"));
var K;
function q() {
	let e = c.join(H, "../electron/icons/icon-256x256.png");
	K = new a({
		width: 1200,
		height: 800,
		autoHideMenuBar: !0,
		icon: e,
		webPreferences: {
			preload: c.join(H, "preload.mjs"),
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !0
		}
	}), K.setMenuBarVisibility(!1), K.webContents.setWindowOpenHandler(() => ({ action: "deny" })), K.webContents.on("will-navigate", (e, t) => {
		U && t.startsWith(U) || t.startsWith("file://") || (e.preventDefault(), console.warn(`Blocked main window unauthorized navigation: ${t}`));
	}), U ? K.loadURL(U) : K.loadFile(c.join(G, "index.html"));
}
o.on("window-all-closed", () => {
	process.platform !== "darwin" && (o.quit(), K = null);
}), o.on("activate", () => {
	a.getAllWindows().length === 0 && q();
}), o.whenReady().then(async () => {
	q(), await V();
});
//#endregion
export { W as MAIN_DIST, G as RENDERER_DIST, U as VITE_DEV_SERVER_URL };
