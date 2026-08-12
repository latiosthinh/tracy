import { createRequire as e } from "node:module";
import { BrowserWindow as t, WebContentsView as n, app as r, ipcMain as i } from "electron";
import a from "path";
import { fileURLToPath as o } from "url";
import s from "fs/promises";
import * as c from "js-yaml";
import { chromium as l } from "playwright-core";
//#region \0rolldown/runtime.js
var u = /* @__PURE__ */ e(import.meta.url);
//#endregion
//#region electron/ipc/fileSystem.ts
function d() {
	i.handle("list_projects", async () => []), i.handle("save_project", async (e, { project: t }) => {
		if (!t || !t.saveLocation) return;
		let n = JSON.stringify(t, null, 2);
		await s.mkdir(t.saveLocation, { recursive: !0 }), await s.writeFile(a.join(t.saveLocation, "project.json"), n, "utf-8");
	}), i.handle("scan_agent_clis", async () => [{
		id: "gemini-3.6-flash",
		name: "Gemini 3.6 Flash (Direct API)",
		cli_binary: "gemini-api",
		installed: !0,
		icon_name: "Sparkles",
		category: "cloud-api",
		description: "Direct Gemini API call server side"
	}]), i.handle("run_agent_cli_stream", async (e, { agentId: t, prompt: n, systemInstruction: r }) => "This is a stub for the AI agent in Electron."), i.handle("parse_yaml_flow", async (e, { yamlContent: t }) => {
		try {
			let e = c.load(t);
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
	}), i.handle("save_project_to_disk", async (e, { projectId: t, saveLocation: n, data: r }) => (await s.mkdir(n, { recursive: !0 }), await s.writeFile(a.join(n, "project.json"), r, "utf-8"), n)), i.handle("load_project_from_disk", async (e, { projectId: t, saveLocation: n }) => await s.readFile(a.join(n, "project.json"), "utf-8")), i.handle("save_flow_to_disk", async (e, { projectId: t, saveLocation: n, flowName: r, yamlContent: i }) => {
		let o = a.join(n, "flows");
		return await s.mkdir(o, { recursive: !0 }), await s.writeFile(a.join(o, r), i, "utf-8"), a.join(o, r);
	}), i.handle("save_dom_snapshot", async (e, { projectId: t, saveLocation: n, pagePath: r, snapshotData: i }) => {
		let o = a.join(n, "snapshots");
		await s.mkdir(o, { recursive: !0 });
		let c = r.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".json";
		return await s.writeFile(a.join(o, c), i, "utf-8"), a.join(o, c);
	}), i.handle("load_dom_snapshots", async (e, { projectId: t, saveLocation: n }) => {
		let r = a.join(n, "snapshots");
		try {
			let e = await s.readdir(r), t = [];
			for (let n of e) if (n.endsWith(".json")) {
				let e = await s.readFile(a.join(r, n), "utf-8");
				t.push([n.replace(".json", ""), e]);
			}
			return t;
		} catch {
			return [];
		}
	}), i.handle("save_playwright_code", async (e, { projectId: t, saveLocation: n, fileName: r, code: i }) => {
		let o = a.join(n, "tests");
		return await s.mkdir(o, { recursive: !0 }), await s.writeFile(a.join(o, r), i, "utf-8"), a.join(o, r);
	});
}
//#endregion
//#region node_modules/.pnpm/dom-miner@0.1.4/node_modules/dom-miner/dist/lib/compact-observe.js
function f() {
	return (e) => {
		let t = e?.includeCollapsedNav !== !1, n = e?.maxTextHolders ?? 80, r = e?.maxTextLen ?? 120, i = "a[href], button, input:not([type=\"hidden\"]), select, textarea, summary, [role=\"button\"], [role=\"link\"], [role=\"tab\"], [role=\"menuitem\"], [role=\"textbox\"], [role=\"combobox\"], [role=\"switch\"]";
		function a(e) {
			let t = e.getBoundingClientRect(), n = getComputedStyle(e);
			return t.width > 0 && t.height > 0 && n.visibility !== "hidden" && n.display !== "none" && n.opacity !== "0" && !e.closest("[hidden], [aria-hidden=\"true\"]");
		}
		function o(e) {
			return !!e.closest("nav, [role=\"navigation\"], header, [class*=\"menu\" i], [class*=\"submenu\" i]");
		}
		function s(e) {
			return e.closest("[role=\"dialog\"], [class*=\"modal\" i], [class*=\"drawer\" i]") ? "overlay" : e.closest("nav, [role=\"navigation\"]") ? "nav" : e.closest("header") ? "header" : e.closest("footer") ? "footer" : e.closest("main, [role=\"main\"]") ? "main" : e.closest("aside, [role=\"complementary\"]") ? "aside" : "body";
		}
		function c(e, t) {
			let n = (e.innerText || e.textContent || "").trim().replace(/\s+/g, " ");
			return n ? n.length > t ? n.slice(0, t - 1) + "…" : n : "";
		}
		function l(e) {
			let t = e.getAttribute("role");
			if (t) return t;
			let n = e.tagName.toLowerCase();
			if (n === "a") return "link";
			if (n === "button" || n === "summary") return "button";
			if (n === "select") return "combobox";
			if (n === "textarea") return "textbox";
			if (n === "input") {
				let t = (e.getAttribute("type") || "text").toLowerCase();
				return t === "checkbox" ? "checkbox" : t === "radio" ? "radio" : t === "submit" || t === "button" ? "button" : "textbox";
			}
			return n;
		}
		function u(e) {
			let t = e.getAttribute("aria-labelledby");
			if (t) {
				let e = t.split(/\s+/).map((e) => document.getElementById(e)?.textContent?.trim()).filter(Boolean).join(" ");
				if (e) return e.replace(/\s+/g, " ").slice(0, 80);
			}
			let n = e.getAttribute("aria-label");
			if (n) return n.trim().replace(/\s+/g, " ").slice(0, 80);
			if (e.id) {
				let t = document.querySelector("label[for=\"" + CSS.escape(e.id) + "\"]");
				if (t?.textContent) return t.textContent.trim().replace(/\s+/g, " ").slice(0, 80);
			}
			let r = e.closest("label");
			if (r?.textContent) return r.textContent.trim().replace(/\s+/g, " ").slice(0, 80);
			if (e.placeholder) return String(e.placeholder).trim().slice(0, 80);
			let i = (e.innerText || e.textContent || "").trim().replace(/\s+/g, " ");
			return i ? i.slice(0, 80) : e.getAttribute("name") || e.getAttribute("title") || "";
		}
		function d(e, t, n) {
			let r = e.getAttribute("data-testid");
			return r ? {
				kind: "getByTestId",
				testId: r
			} : n && (t === "button" || t === "link" || t === "tab" || t === "menuitem") ? {
				kind: "getByRole",
				role: t,
				name: n
			} : n && (t === "textbox" || t === "combobox" || t === "checkbox" || t === "radio") ? {
				kind: "getByLabel",
				name: n
			} : e.getAttribute("placeholder") ? {
				kind: "getByPlaceholder",
				name: e.getAttribute("placeholder")
			} : e.id && !/^(react|ember|mui|css|radix)/i.test(e.id) ? {
				kind: "locator",
				selector: "#" + CSS.escape(e.id)
			} : null;
		}
		let f = /* @__PURE__ */ new Set(), p = [];
		for (let e of document.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, label, figcaption, th, td, [role=\"heading\"]")) {
			if (!(e instanceof HTMLElement) || !a(e) || e.closest("a[href], button, [role=\"button\"]") && !/^H[1-6]$/.test(e.tagName)) continue;
			if (e.tagName === "LI") {
				let t = e.querySelectorAll("a[href], button");
				if (t.length === 1 && c(e, r) === c(t[0], r)) continue;
			}
			let t = c(e, r);
			if (!t || t.length < 2) continue;
			let i = e.tagName.toLowerCase(), o = i + "|" + t;
			if (!f.has(o) && (f.add(o), p.push({
				kind: "text",
				tag: i,
				role: e.getAttribute("role") || (/^h[1-6]$/.test(i) ? "heading" : i),
				level: /^h[1-6]$/.test(i) ? Number(i[1]) : void 0,
				text: t,
				region: s(e)
			}), p.length >= n)) break;
		}
		let m = /* @__PURE__ */ new Set(), h = [], g = 1;
		function _(e, t) {
			if (!(e instanceof HTMLElement)) return;
			let n = l(e), r = u(e), i = e.tagName === "A" ? e.getAttribute("href") : null;
			if (!r && !i || i && (i.startsWith("javascript:") || i === "#") && !r) return;
			let a = [
				n,
				r,
				i || "",
				e.id || "",
				t ? "c" : "v"
			].join("|");
			m.has(a) || (m.add(a), h.push({
				kind: "interactive",
				id: g++,
				role: n,
				name: r || "(unnamed)",
				region: s(e),
				href: i,
				collapsed: !!t,
				disabled: !!e.disabled || e.getAttribute("aria-disabled") === "true",
				playwrightLocator: d(e, n, r)
			}));
		}
		document.querySelectorAll(i).forEach((e) => {
			a(e) && _(e, !1);
		}), t && document.querySelectorAll(i).forEach((e) => {
			a(e) || !o(e) && !e.closest("[class*=\"submenu\" i], [class*=\"dropdown\" i]") || e.closest("footer") || _(e, !0);
		});
		let v = [
			"header",
			"nav",
			"main",
			"aside",
			"body",
			"footer",
			"overlay"
		], y = {};
		for (let e of p) (y[e.region] ||= {
			text: [],
			interactive: []
		}).text.push(e);
		for (let e of h) (y[e.region] ||= {
			text: [],
			interactive: []
		}).interactive.push(e);
		let b = [];
		b.push("Page map: " + (document.title || "(no title)")), b.push("URL: " + location.href), b.push("Nodes: text-holders " + p.length + ", interactive " + h.length + " (visible " + h.filter((e) => !e.collapsed).length + ", collapsed-nav " + h.filter((e) => e.collapsed).length + ")"), b.push("─".repeat(60));
		for (let e of v) {
			let t = y[e];
			if (!(!t || !t.text.length && !t.interactive.length)) {
				b.push("[" + e + "]");
				for (let e of t.text) e.level ? b.push("  text:heading" + e.level + " \"" + e.text + "\"") : b.push("  text:" + e.tag + " \"" + e.text + "\"");
				for (let e of t.interactive) {
					let t = e.href ? " href=" + e.href.slice(0, 80) : "", n = e.disabled ? " disabled" : "", r = e.collapsed ? " (collapsed)" : "";
					b.push("  [" + e.id + "] " + e.role + " \"" + e.name + "\"" + r + t + n);
				}
			}
		}
		return {
			mode: "compact-dom",
			includeCollapsedNav: !!t,
			url: location.href,
			title: document.title,
			textHolderCount: p.length,
			textHolders: p,
			interactableCount: h.length,
			visibleCount: h.filter((e) => !e.collapsed).length,
			collapsedNavCount: h.filter((e) => e.collapsed).length,
			interactables: h,
			headingCount: p.filter((e) => e.level).length,
			headings: p.filter((e) => e.level).map((e) => ({
				level: e.level,
				text: e.text
			})),
			treeText: b.join("\n")
		};
	};
}
async function p(e, { includeCollapsedNav: t = !0, maxTextHolders: n = 80, maxTextLen: r = 120 } = {}) {
	return e.evaluate(f(), {
		includeCollapsedNav: t,
		maxTextHolders: n,
		maxTextLen: r
	});
}
function m(e) {
	return e?.treeText ? e.treeText : JSON.stringify(e, null, 2);
}
//#endregion
//#region node_modules/.pnpm/dom-miner@0.1.4/node_modules/dom-miner/dist/lib/authenticate.js
async function h(e, t, n = {}) {
	let { loginUrl: r, usernameSelector: i = "input[name=\"username\"], input[name=\"email\"], input[type=\"email\"], input[type=\"text\"]", passwordSelector: a = "input[type=\"password\"]", submitSelector: o = "button[type=\"submit\"], input[type=\"submit\"], button:has-text(\"Sign In\"), button:has-text(\"Log In\"), button:has-text(\"Login\")" } = n;
	r && (await e.goto(r, {
		waitUntil: "domcontentloaded",
		timeout: 3e4
	}), await e.waitForTimeout(1e3));
	let s = {
		ok: !1,
		method: "none",
		errors: []
	};
	try {
		let n = await g(e, i), r = await e.$(a);
		if (n && r) {
			await n.fill(t.username), await r.fill(t.password);
			let i = await g(e, o);
			return i ? await i.click() : await r.press("Enter"), await e.waitForTimeout(2e3), s.ok = !0, s.method = "form", s;
		}
		let c = await e.$("input[type=\"text\"]:visible, input[type=\"email\"]:visible"), l = await e.$("input[type=\"password\"]:visible");
		return c && l ? (await c.fill(t.username), await l.fill(t.password), await l.press("Enter"), await e.waitForTimeout(2e3), s.ok = !0, s.method = "form-fallback", s) : (s.errors.push("No login form detected"), s);
	} catch (e) {
		return s.errors.push(String(e?.message || e)), s;
	}
}
async function g(e, t) {
	for (let n of t.split(",").map((e) => e.trim())) {
		let t = await e.$(n);
		if (t && await t.isVisible()) return t;
	}
	return null;
}
//#endregion
//#region electron/ipc/playwrightEngine.ts
var _ = null, v = null, y = null;
function b() {
	i.handle("launch_browser", async (e, { headless: t }) => {
		_ ||= await l.connectOverCDP("http://localhost:9222"), v = _.contexts()[0], y = null;
	});
	let e = async () => {
		if (!v) return null;
		let e = v.pages();
		return e.find((e) => !e.url().includes("localhost:5173") && !e.url().startsWith("file://")) || e[0];
	};
	i.handle("navigate_browser", async (t, { url: n }) => {
		if (y = await e(), !y) throw Error("Browser not launched or page not found");
		y.url() !== n && await y.goto(n, { waitUntil: "domcontentloaded" }).catch(() => {});
		let r = await y.title(), i = await y.screenshot({ type: "png" });
		return {
			url: y.url(),
			title: r,
			image: i.toString("base64"),
			mimeType: "image/png"
		};
	}), i.handle("get_browser_screenshot", async () => {
		if (y = await e(), !y) throw Error("Browser not launched");
		return (await y.screenshot({ type: "png" })).toString("base64");
	}), i.handle("get_browser_dom_tree", async () => {
		if (y = await e(), !y) throw Error("Browser not launched");
		let t = await p(y), n = m(t);
		return {
			url: t.url,
			title: t.title,
			tree: n,
			stats: {
				totalNodes: t.textHolderCount + t.interactableCount,
				interactiveNodes: t.interactableCount,
				textHolders: t.textHolderCount,
				visibleNodes: t.visibleCount
			}
		};
	}), i.handle("mine_batch_urls", async (t, { targets: n, returnToUrl: r }) => {
		let i = await e();
		if (!i) throw Error("Browser not launched");
		let a = [];
		for (let e = 0; e < n.length; e++) {
			let r = n[e];
			t.sender.send("mine_progress", `Mining page ${e + 1}/${n.length}: ${r.url}`);
			try {
				if (await i.goto(r.url, {
					waitUntil: "load",
					timeout: 2e4
				}), r.credential?.username || r.credential?.password) {
					t.sender.send("mine_progress", `Authenticating on ${r.url}...`);
					try {
						await h(i, r.credential), await new Promise((e) => setTimeout(e, 3e3));
					} catch (e) {
						console.error(`Auth failed for ${r.url}:`, e);
					}
				} else await new Promise((e) => setTimeout(e, 2e3));
				let e = await p(i), n = m(e);
				a.push({
					url: e.url,
					title: e.title,
					tree: n,
					stats: {
						totalNodes: e.textHolderCount + e.interactableCount,
						interactiveNodes: e.interactableCount,
						textHolders: e.textHolderCount,
						visibleNodes: e.visibleCount
					}
				});
			} catch (e) {
				console.error(`Failed to mine ${r.url}:`, e);
			}
		}
		if (r) {
			t.sender.send("mine_progress", "Restoring original page...");
			try {
				await i.goto(r, {
					waitUntil: "load",
					timeout: 15e3
				});
			} catch {}
		}
		return a;
	}), i.handle("inspect_element_at_point", async (t, { x: n, y: r }) => {
		if (y = await e(), !y) throw Error("Browser not launched");
		return { element: await y.evaluate(({ x: e, y: t }) => {
			let n = document.elementFromPoint(e, t);
			if (!n) return null;
			let r = n.getBoundingClientRect();
			return {
				tagName: n.tagName,
				text: n.textContent,
				id: n.id,
				testId: n.getAttribute("data-testid"),
				role: n.getAttribute("role"),
				label: n.getAttribute("aria-label"),
				placeholder: n.getAttribute("placeholder"),
				className: n.className,
				rect: {
					x: r.x,
					y: r.y,
					width: r.width,
					height: r.height
				}
			};
		}, {
			x: n,
			y: r
		}) };
	}), i.handle("interact_browser", async (t, n) => {
		if (y = await e(), !y) throw Error("Browser not launched");
		let { action: r, x: i, y: a, key: o, deltaX: s, deltaY: c } = n;
		r === "click" && i != null && a != null ? await y.mouse.click(i, a) : r === "keydown" && o ? await y.keyboard.press(o) : r === "scroll" && s != null && c != null && await y.mouse.wheel(s, c), await y.waitForTimeout(500);
		let l = await y.title(), u = await y.screenshot({ type: "png" });
		return {
			url: y.url(),
			title: l,
			image: u.toString("base64"),
			mimeType: "image/png"
		};
	}), i.handle("set_browser_mode", async (t, { mode: n }) => {
		if (y = await e(), y) {
			try {
				await y.evaluate(() => {
					window.__tracyCleanup && window.__tracyCleanup();
				});
			} catch {}
			if (n === "inspect" || n === "record") {
				try {
					await y.exposeFunction("__tracyEmitEvent", (e, t) => {
						let n = u("electron").BrowserWindow.getAllWindows();
						n[0] && n[0].webContents.send("browser-event", {
							type: e,
							data: t
						});
					});
				} catch {}
				await y.evaluate((e) => {
					let t = null, n = (e) => {
						t && (t.style.outline = ""), t = e.target, t && (t.style.outline = "2px solid #3b82f6", t.style.outlineOffset = "-2px", t.style.cursor = "crosshair");
					}, r = (e) => {
						t &&= (t.style.outline = "", t.style.cursor = "", null);
					}, i = (n) => {
						e === "inspect" && (n.preventDefault(), n.stopPropagation()), t && (t.style.outline = "");
						let r = n.target, i = r.getBoundingClientRect();
						window.__tracyEmitEvent(e === "inspect" ? "inspect-click" : "record-click", {
							tagName: r.tagName,
							text: r.textContent,
							id: r.id,
							className: r.className,
							testId: r.getAttribute("data-testid"),
							role: r.getAttribute("role"),
							placeholder: r.getAttribute("placeholder"),
							label: r.getAttribute("aria-label"),
							rect: {
								x: i.x,
								y: i.y,
								width: i.width,
								height: i.height
							}
						});
					};
					document.addEventListener("mouseover", n, !0), document.addEventListener("mouseout", r, !0), document.addEventListener("click", i, !0), window.__tracyCleanup = () => {
						document.removeEventListener("mouseover", n, !0), document.removeEventListener("mouseout", r, !0), document.removeEventListener("click", i, !0), t && (t.style.outline = "", t.style.cursor = "");
					};
				}, n);
			}
		}
	}), i.handle("run_flow", async (t, { flow: n, targetBaseUrl: r, speedMs: i }) => {
		let a = await e();
		if (a ||= (_ ||= await l.connectOverCDP("http://localhost:9222"), v = _.contexts()[0], await e()), !a) throw Error("Browser not launched — cannot execute flow");
		let o = n.steps || [], s = t.sender, c = (e, t, n) => {
			s.send("execution-log", {
				id: `log-${Date.now()}-${t}`,
				timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
				level: e,
				stepIndex: t,
				message: n
			});
		}, u = (e, t, n, r) => {
			s.send("step-update", {
				stepIndex: e,
				status: t,
				durationMs: n,
				errorMessage: r
			});
		}, d = (e) => {
			if (!e || !a) return null;
			if (typeof e == "string") return e.startsWith("#") || e.startsWith(".") || e.startsWith("/") || e.startsWith("css=") || e.startsWith("xpath=") ? a.locator(e) : a.getByText(e, { exact: !1 });
			if (e.type && e.value) switch (e.type) {
				case "testId": return a.getByTestId(e.value);
				case "role": return a.getByRole(e.value, { name: e.name });
				case "label": return a.getByLabel(e.value);
				case "placeholder": return a.getByPlaceholder(e.value);
				case "text": return a.getByText(e.value, { exact: e.exact ?? !1 });
				case "css": return a.locator(e.value);
				case "xpath": return a.locator(`xpath=${e.value}`);
				case "id": return a.locator(`#${e.value}`);
			}
			return e.testId ? a.getByTestId(e.testId) : e.role && e.name ? a.getByRole(e.role, { name: e.name }) : e.role ? a.getByRole(e.role) : e.label ? a.getByLabel(e.label) : e.placeholder ? a.getByPlaceholder(e.placeholder) : e.text ? a.getByText(e.text, { exact: e.exact ?? !1 }) : e.css ? a.locator(e.css) : e.xpath ? a.locator(`xpath=${e.xpath}`) : e.id ? a.locator(`#${e.id}`) : null;
		};
		for (let e = 0; e < o.length; e++) {
			let t = o[e], s = Date.now(), l = t.command;
			u(e, "running"), c("info", e, `▶ Step ${e + 1}: ${l}`);
			try {
				let n = t.timeout || 1e4;
				switch (l) {
					case "navigate": {
						let e = t.value || t.target || "/", i = e.startsWith("http") ? e : `${r.replace(/\/$/, "")}${e.startsWith("/") ? "" : "/"}${e}`;
						await a.goto(i, {
							waitUntil: "domcontentloaded",
							timeout: n
						});
						break;
					}
					case "leftClick":
					case "tap": {
						let e = d(t.target || t.value);
						e ? await e.click({ timeout: n }) : t.value && await a.getByText(t.value).click({ timeout: n });
						break;
					}
					case "doubleClick": {
						let e = d(t.target || t.value);
						e && await e.dblclick({ timeout: n });
						break;
					}
					case "rightClick": {
						let e = d(t.target || t.value);
						e && await e.click({
							button: "right",
							timeout: n
						});
						break;
					}
					case "hover": {
						let e = d(t.target || t.value);
						e && await e.hover({ timeout: n });
						break;
					}
					case "fill": {
						let e = d(t.target), r = t.value || "";
						e && await e.fill(r, { timeout: n });
						break;
					}
					case "eraseText": {
						let e = d(t.target || t.value);
						e && await e.fill("", { timeout: n });
						break;
					}
					case "press": {
						let e = t.value || t.target || "Enter";
						await a.keyboard.press(e);
						break;
					}
					case "selectOption": {
						let e = d(t.target);
						e && t.value && await e.selectOption(t.value, { timeout: n });
						break;
					}
					case "uploadFile": {
						let e = d(t.target);
						e && t.value && await e.setInputFiles(t.value, { timeout: n });
						break;
					}
					case "waitFor": {
						let e = t.value || t.target;
						e === "networkIdle" || e === "load" ? await a.waitForLoadState(e === "networkIdle" ? "networkidle" : "load", { timeout: n }) : typeof e == "number" || /^\d+$/.test(e) ? await a.waitForTimeout(Number(e)) : await a.waitForSelector(e, { timeout: n });
						break;
					}
					case "wait": {
						let e = Number(t.value || t.target || 1e3);
						await a.waitForTimeout(e);
						break;
					}
					case "waitForNetwork":
						await a.waitForLoadState("networkidle", { timeout: n });
						break;
					case "assertVisible": {
						let e = d(t.target || t.value);
						e && await e.waitFor({
							state: "visible",
							timeout: n
						});
						break;
					}
					case "assertNotVisible": {
						let e = d(t.target || t.value);
						e && await e.waitFor({
							state: "hidden",
							timeout: n
						});
						break;
					}
					case "assertTitle": {
						let e = t.value || t.target || "", n = await a.title();
						if (!n.includes(e)) throw Error(`Title "${n}" does not contain "${e}"`);
						break;
					}
					case "assertUrl": {
						let e = t.value || t.target || "", n = a.url();
						if (!n.includes(e)) throw Error(`URL "${n}" does not contain "${e}"`);
						break;
					}
					case "assertTrue": {
						let e = t.value || t.target || "true";
						if (!await a.evaluate(e)) throw Error(`Assertion failed for expression: ${e}`);
						break;
					}
					case "copyTextFrom": {
						let r = d(t.target);
						if (r) {
							let t = await r.innerText({ timeout: n });
							c("info", e, `Copied text from element: "${t}"`);
						}
						break;
					}
					case "scroll": {
						let e = Number(t.args?.distance || t.value || 300), n = (t.args?.direction || "down") === "up" ? -e : e;
						await a.mouse.wheel(0, n);
						break;
					}
					case "setViewport": {
						let e = t.args?.width || 1280, n = t.args?.height || 720;
						await a.setViewportSize({
							width: e,
							height: n
						});
						break;
					}
					case "takeScreenshot":
						await a.screenshot({ type: "png" });
						break;
					case "clearCookies":
						v && await v.clearCookies();
						break;
					case "clearStorage":
						await a.evaluate(() => {
							localStorage.clear(), sessionStorage.clear();
						});
						break;
					case "evalScript": {
						let e = t.value || t.target || "";
						await a.evaluate(e);
						break;
					}
					default:
						c("warn", e, `⚠ Step ${e + 1}: Command "${l}" not yet implemented — skipping`), u(e, "skipped", Date.now() - s);
						continue;
				}
				let i = Date.now() - s;
				u(e, "passed", i), c("assertion", e, `✅ Step ${e + 1} PASSED (${i}ms)`);
			} catch (t) {
				let r = Date.now() - s, i = t.message || "Unknown error";
				if (u(e, "failed", r, i), c("error", e, `❌ Step ${e + 1} FAILED: ${i}`), !n.metadata?.continueOnFailure) break;
			}
			i > 0 && await new Promise((e) => setTimeout(e, i));
		}
	});
}
//#endregion
//#region electron/ipc/webviewManager.ts
var x = null;
function S() {
	i.handle("open_child_webview", async (e, { url: r, x: i, y: a, width: o, height: s }) => {
		let c = t.fromWebContents(e.sender);
		c && (x &&= (c.contentView.removeChildView(x), null), x = new n(), c.contentView.addChildView(x), x.setBounds({
			x: Math.round(i),
			y: Math.round(a),
			width: Math.round(o),
			height: Math.round(s)
		}), x.webContents.loadURL(r));
	}), i.handle("resize_child_webview", async (e, { x: t, y: n, width: r, height: i }) => {
		x && x.setBounds({
			x: Math.round(t),
			y: Math.round(n),
			width: Math.round(r),
			height: Math.round(i)
		});
	}), i.handle("set_child_webview_visible", async (e, { visible: t }) => {
		x && (t || x.setBounds({
			x: 0,
			y: 0,
			width: 0,
			height: 0
		}));
	}), i.handle("close_child_webview", async (e) => {
		let n = t.fromWebContents(e.sender);
		n && x && (n.contentView.removeChildView(x), x = null);
	});
}
//#endregion
//#region electron/ipc/index.ts
function C() {
	d(), b(), S();
}
//#endregion
//#region electron/main.ts
var w = a.dirname(o(import.meta.url));
process.env.APP_ROOT = a.join(w, "..");
var T = process.env.VITE_DEV_SERVER_URL, E = a.join(process.env.APP_ROOT, "dist-electron"), D = a.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = T ? a.join(process.env.APP_ROOT, "public") : D, r.commandLine.appendSwitch("remote-debugging-port", "9222");
var O;
function k() {
	O = new t({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: a.join(w, "preload.mjs"),
			contextIsolation: !0,
			nodeIntegration: !1
		}
	}), T ? O.loadURL(T) : O.loadFile(a.join(D, "index.html"));
}
r.on("window-all-closed", () => {
	process.platform !== "darwin" && (r.quit(), O = null);
}), r.on("activate", () => {
	t.getAllWindows().length === 0 && k();
}), r.whenReady().then(() => {
	k(), C();
});
//#endregion
export { E as MAIN_DIST, D as RENDERER_DIST, T as VITE_DEV_SERVER_URL };
