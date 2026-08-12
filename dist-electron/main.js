import { createRequire } from "node:module";
import { BrowserWindow, WebContentsView, app, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import * as yaml from "js-yaml";
import { chromium } from "playwright-core";
//#region \0rolldown/runtime.js
var __require = /* #__PURE__ */ (() => createRequire(import.meta.url))();
//#endregion
//#region electron/ipc/fileSystem.ts
function registerFileSystemHandlers() {
	ipcMain.handle("list_projects", async () => {
		return [];
	});
	ipcMain.handle("scan_agent_clis", async () => {
		return [{
			id: "gemini-3.6-flash",
			name: "Gemini 3.6 Flash (Direct API)",
			cli_binary: "gemini-api",
			installed: true,
			icon_name: "Sparkles",
			category: "cloud-api",
			description: "Direct Gemini API call server side"
		}];
	});
	ipcMain.handle("run_agent_cli_stream", async (event, { agentId, prompt, systemInstruction }) => {
		return "This is a stub for the AI agent in Electron.";
	});
	ipcMain.handle("parse_yaml_flow", async (event, { yamlContent }) => {
		try {
			const parsed = yaml.load(yamlContent);
			if (!parsed) return {
				steps: [],
				metadata: {}
			};
			const steps = [];
			const metadata = {
				url: parsed.url,
				name: parsed.name
			};
			if (Array.isArray(parsed)) parsed.forEach((item, i) => {
				const command = Object.keys(item)[0];
				steps.push({
					id: `step-${Date.now()}-${i}`,
					command,
					target: item[command],
					status: "pending"
				});
			});
			else if (parsed.steps && Array.isArray(parsed.steps)) parsed.steps.forEach((item, i) => {
				const command = Object.keys(item)[0];
				steps.push({
					id: `step-${Date.now()}-${i}`,
					command,
					target: item[command],
					status: "pending"
				});
			});
			return {
				steps,
				metadata
			};
		} catch (e) {
			console.error("Yaml parsing error", e);
			return {
				steps: [],
				metadata: {}
			};
		}
	});
	ipcMain.handle("save_project_to_disk", async (event, { projectId, saveLocation, data }) => {
		await fs.mkdir(saveLocation, { recursive: true });
		await fs.writeFile(path.join(saveLocation, "project.json"), data, "utf-8");
		return saveLocation;
	});
	ipcMain.handle("load_project_from_disk", async (event, { projectId, saveLocation }) => {
		return await fs.readFile(path.join(saveLocation, "project.json"), "utf-8");
	});
	ipcMain.handle("save_flow_to_disk", async (event, { projectId, saveLocation, flowName, yamlContent }) => {
		const flowsDir = path.join(saveLocation, "flows");
		await fs.mkdir(flowsDir, { recursive: true });
		await fs.writeFile(path.join(flowsDir, flowName), yamlContent, "utf-8");
		return path.join(flowsDir, flowName);
	});
	ipcMain.handle("save_dom_snapshot", async (event, { projectId, saveLocation, pagePath, snapshotData }) => {
		const snapsDir = path.join(saveLocation, "snapshots");
		await fs.mkdir(snapsDir, { recursive: true });
		const filename = pagePath.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".json";
		await fs.writeFile(path.join(snapsDir, filename), snapshotData, "utf-8");
		return path.join(snapsDir, filename);
	});
	ipcMain.handle("load_dom_snapshots", async (event, { projectId, saveLocation }) => {
		const snapsDir = path.join(saveLocation, "snapshots");
		try {
			const files = await fs.readdir(snapsDir);
			const results = [];
			for (const file of files) if (file.endsWith(".json")) {
				const data = await fs.readFile(path.join(snapsDir, file), "utf-8");
				results.push([file.replace(".json", ""), data]);
			}
			return results;
		} catch (e) {
			return [];
		}
	});
	ipcMain.handle("save_playwright_code", async (event, { projectId, saveLocation, fileName, code }) => {
		const testsDir = path.join(saveLocation, "tests");
		await fs.mkdir(testsDir, { recursive: true });
		await fs.writeFile(path.join(testsDir, fileName), code, "utf-8");
		return path.join(testsDir, fileName);
	});
}
//#endregion
//#region node_modules/.pnpm/dom-miner@0.1.4/node_modules/dom-miner/dist/lib/compact-observe.js
/**
* Compact DOM trees for QA workflows — not raw HTML, not interactive-only.
*
* Includes:
* - landmarks / regions (header, nav, main, footer, overlay, body)
* - text-holders (headings, paragraphs, list items, labels, captions) — truncated
* - interactive controls with numeric IDs (+ optional collapsed nav children)
*
* Site-level URL inventory remains separate (sitemap urls-full.json).
* This module is the per-page "agent page map".
*/
function buildCompactDomScript() {
	return (opts) => {
		const includeCollapsedNav = opts?.includeCollapsedNav !== false;
		const maxTextHolders = opts?.maxTextHolders ?? 80;
		const maxTextLen = opts?.maxTextLen ?? 120;
		const INTERACTIVE = "a[href], button, input:not([type=\"hidden\"]), select, textarea, summary, [role=\"button\"], [role=\"link\"], [role=\"tab\"], [role=\"menuitem\"], [role=\"textbox\"], [role=\"combobox\"], [role=\"switch\"]";
		const TEXT_HOLDERS = "h1, h2, h3, h4, h5, h6, p, li, label, figcaption, th, td, [role=\"heading\"]";
		function isVisible(el) {
			const rect = el.getBoundingClientRect();
			const style = getComputedStyle(el);
			return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0" && !el.closest("[hidden], [aria-hidden=\"true\"]");
		}
		function inNavChrome(el) {
			return Boolean(el.closest("nav, [role=\"navigation\"], header, [class*=\"menu\" i], [class*=\"submenu\" i]"));
		}
		function region(el) {
			if (el.closest("[role=\"dialog\"], [class*=\"modal\" i], [class*=\"drawer\" i]")) return "overlay";
			if (el.closest("nav, [role=\"navigation\"]")) return "nav";
			if (el.closest("header")) return "header";
			if (el.closest("footer")) return "footer";
			if (el.closest("main, [role=\"main\"]")) return "main";
			if (el.closest("aside, [role=\"complementary\"]")) return "aside";
			return "body";
		}
		function normText(el, max) {
			const t = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
			if (!t) return "";
			return t.length > max ? t.slice(0, max - 1) + "…" : t;
		}
		function roleOf(el) {
			const explicit = el.getAttribute("role");
			if (explicit) return explicit;
			const tag = el.tagName.toLowerCase();
			if (tag === "a") return "link";
			if (tag === "button" || tag === "summary") return "button";
			if (tag === "select") return "combobox";
			if (tag === "textarea") return "textbox";
			if (tag === "input") {
				const t = (el.getAttribute("type") || "text").toLowerCase();
				if (t === "checkbox") return "checkbox";
				if (t === "radio") return "radio";
				if (t === "submit" || t === "button") return "button";
				return "textbox";
			}
			return tag;
		}
		function accessibleName(el) {
			const labelledBy = el.getAttribute("aria-labelledby");
			if (labelledBy) {
				const t = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean).join(" ");
				if (t) return t.replace(/\s+/g, " ").slice(0, 80);
			}
			const aria = el.getAttribute("aria-label");
			if (aria) return aria.trim().replace(/\s+/g, " ").slice(0, 80);
			if (el.id) {
				const label = document.querySelector("label[for=\"" + CSS.escape(el.id) + "\"]");
				if (label?.textContent) return label.textContent.trim().replace(/\s+/g, " ").slice(0, 80);
			}
			const parentLabel = el.closest("label");
			if (parentLabel?.textContent) return parentLabel.textContent.trim().replace(/\s+/g, " ").slice(0, 80);
			if (el.placeholder) return String(el.placeholder).trim().slice(0, 80);
			const text = (el.innerText || el.textContent || "").trim().replace(/\s+/g, " ");
			if (text) return text.slice(0, 80);
			return el.getAttribute("name") || el.getAttribute("title") || "";
		}
		function suggestLocator(el, role, name) {
			const testId = el.getAttribute("data-testid");
			if (testId) return {
				kind: "getByTestId",
				testId
			};
			if (name && (role === "button" || role === "link" || role === "tab" || role === "menuitem")) return {
				kind: "getByRole",
				role,
				name
			};
			if (name && (role === "textbox" || role === "combobox" || role === "checkbox" || role === "radio")) return {
				kind: "getByLabel",
				name
			};
			if (el.getAttribute("placeholder")) return {
				kind: "getByPlaceholder",
				name: el.getAttribute("placeholder")
			};
			if (el.id && !/^(react|ember|mui|css|radix)/i.test(el.id)) return {
				kind: "locator",
				selector: "#" + CSS.escape(el.id)
			};
			return null;
		}
		const textSeen = /* @__PURE__ */ new Set();
		const textHolders = [];
		for (const el of document.querySelectorAll(TEXT_HOLDERS)) {
			if (!(el instanceof HTMLElement) || !isVisible(el)) continue;
			if (el.closest("a[href], button, [role=\"button\"]") && !/^H[1-6]$/.test(el.tagName)) continue;
			if (el.tagName === "LI") {
				const links = el.querySelectorAll("a[href], button");
				if (links.length === 1 && normText(el, maxTextLen) === normText(links[0], maxTextLen)) continue;
			}
			const text = normText(el, maxTextLen);
			if (!text || text.length < 2) continue;
			const tag = el.tagName.toLowerCase();
			const key = tag + "|" + text;
			if (textSeen.has(key)) continue;
			textSeen.add(key);
			textHolders.push({
				kind: "text",
				tag,
				role: el.getAttribute("role") || (/^h[1-6]$/.test(tag) ? "heading" : tag),
				level: /^h[1-6]$/.test(tag) ? Number(tag[1]) : void 0,
				text,
				region: region(el)
			});
			if (textHolders.length >= maxTextHolders) break;
		}
		const seen = /* @__PURE__ */ new Set();
		const interactables = [];
		let nextId = 1;
		function pushInteractive(el, collapsed) {
			if (!(el instanceof HTMLElement)) return;
			const role = roleOf(el);
			const name = accessibleName(el);
			const href = el.tagName === "A" ? el.getAttribute("href") : null;
			if (!name && !href) return;
			if (href && (href.startsWith("javascript:") || href === "#")) {
				if (!name) return;
			}
			const key = [
				role,
				name,
				href || "",
				el.id || "",
				collapsed ? "c" : "v"
			].join("|");
			if (seen.has(key)) return;
			seen.add(key);
			interactables.push({
				kind: "interactive",
				id: nextId++,
				role,
				name: name || "(unnamed)",
				region: region(el),
				href,
				collapsed: !!collapsed,
				disabled: !!el.disabled || el.getAttribute("aria-disabled") === "true",
				playwrightLocator: suggestLocator(el, role, name)
			});
		}
		document.querySelectorAll(INTERACTIVE).forEach((el) => {
			if (!isVisible(el)) return;
			pushInteractive(el, false);
		});
		if (includeCollapsedNav) document.querySelectorAll(INTERACTIVE).forEach((el) => {
			if (isVisible(el)) return;
			if (!inNavChrome(el) && !el.closest("[class*=\"submenu\" i], [class*=\"dropdown\" i]")) return;
			if (el.closest("footer")) return;
			pushInteractive(el, true);
		});
		const regionOrder = [
			"header",
			"nav",
			"main",
			"aside",
			"body",
			"footer",
			"overlay"
		];
		const byRegion = {};
		for (const t of textHolders) (byRegion[t.region] ||= {
			text: [],
			interactive: []
		}).text.push(t);
		for (const i of interactables) (byRegion[i.region] ||= {
			text: [],
			interactive: []
		}).interactive.push(i);
		const lines = [];
		lines.push("Page map: " + (document.title || "(no title)"));
		lines.push("URL: " + location.href);
		lines.push("Nodes: text-holders " + textHolders.length + ", interactive " + interactables.length + " (visible " + interactables.filter((i) => !i.collapsed).length + ", collapsed-nav " + interactables.filter((i) => i.collapsed).length + ")");
		lines.push("─".repeat(60));
		for (const reg of regionOrder) {
			const bucket = byRegion[reg];
			if (!bucket || !bucket.text.length && !bucket.interactive.length) continue;
			lines.push("[" + reg + "]");
			for (const t of bucket.text) if (t.level) lines.push("  text:heading" + t.level + " \"" + t.text + "\"");
			else lines.push("  text:" + t.tag + " \"" + t.text + "\"");
			for (const item of bucket.interactive) {
				const hrefBit = item.href ? " href=" + item.href.slice(0, 80) : "";
				const dis = item.disabled ? " disabled" : "";
				const col = item.collapsed ? " (collapsed)" : "";
				lines.push("  [" + item.id + "] " + item.role + " \"" + item.name + "\"" + col + hrefBit + dis);
			}
		}
		return {
			mode: "compact-dom",
			includeCollapsedNav: !!includeCollapsedNav,
			url: location.href,
			title: document.title,
			textHolderCount: textHolders.length,
			textHolders,
			interactableCount: interactables.length,
			visibleCount: interactables.filter((i) => !i.collapsed).length,
			collapsedNavCount: interactables.filter((i) => i.collapsed).length,
			interactables,
			headingCount: textHolders.filter((t) => t.level).length,
			headings: textHolders.filter((t) => t.level).map((t) => ({
				level: t.level,
				text: t.text
			})),
			treeText: lines.join("\n")
		};
	};
}
async function runCompactObserve(page, { includeCollapsedNav = true, maxTextHolders = 80, maxTextLen = 120 } = {}) {
	return page.evaluate(buildCompactDomScript(), {
		includeCollapsedNav,
		maxTextHolders,
		maxTextLen
	});
}
function formatCompactTree(result) {
	if (result?.treeText) return result.treeText;
	return JSON.stringify(result, null, 2);
}
//#endregion
//#region node_modules/.pnpm/dom-miner@0.1.4/node_modules/dom-miner/dist/lib/authenticate.js
/**
* Handle authenticated login flow before DOM exploration.
* Supports auto-detection of common login forms and explicit login URLs.
*/
/**
* @param {import('playwright-core').Page} page
* @param {{ username: string, password: string }} credential
* @param {{ loginUrl?: string, usernameSelector?: string, passwordSelector?: string, submitSelector?: string }} opts
*/
async function authenticate(page, credential, opts = {}) {
	const { loginUrl, usernameSelector = "input[name=\"username\"], input[name=\"email\"], input[type=\"email\"], input[type=\"text\"]", passwordSelector = "input[type=\"password\"]", submitSelector = "button[type=\"submit\"], input[type=\"submit\"], button:has-text(\"Sign In\"), button:has-text(\"Log In\"), button:has-text(\"Login\")" } = opts;
	if (loginUrl) {
		await page.goto(loginUrl, {
			waitUntil: "domcontentloaded",
			timeout: 3e4
		});
		await page.waitForTimeout(1e3);
	}
	const result = {
		ok: false,
		method: "none",
		errors: []
	};
	try {
		const usernameInput = await findFirst(page, usernameSelector);
		const passwordInput = await page.$(passwordSelector);
		if (usernameInput && passwordInput) {
			await usernameInput.fill(credential.username);
			await passwordInput.fill(credential.password);
			const submitBtn = await findFirst(page, submitSelector);
			if (submitBtn) await submitBtn.click();
			else await passwordInput.press("Enter");
			await page.waitForTimeout(2e3);
			result.ok = true;
			result.method = "form";
			return result;
		}
		const anyText = await page.$("input[type=\"text\"]:visible, input[type=\"email\"]:visible");
		const anyPassword = await page.$("input[type=\"password\"]:visible");
		if (anyText && anyPassword) {
			await anyText.fill(credential.username);
			await anyPassword.fill(credential.password);
			await anyPassword.press("Enter");
			await page.waitForTimeout(2e3);
			result.ok = true;
			result.method = "form-fallback";
			return result;
		}
		result.errors.push("No login form detected");
		return result;
	} catch (err) {
		result.errors.push(String(err?.message || err));
		return result;
	}
}
/** Find the first visible element matching any of the comma-separated selectors. */
async function findFirst(page, selectorStr) {
	for (const sel of selectorStr.split(",").map((s) => s.trim())) {
		const el = await page.$(sel);
		if (el && await el.isVisible()) return el;
	}
	return null;
}
//#endregion
//#region electron/ipc/playwrightEngine.ts
var browser = null;
var context = null;
var page = null;
function registerPlaywrightHandlers() {
	ipcMain.handle("launch_browser", async (event, { headless }) => {
		if (!browser) browser = await chromium.connectOverCDP("http://localhost:9222");
		context = browser.contexts()[0];
		page = null;
	});
	const getActivePage = async () => {
		if (!context) return null;
		const pages = context.pages();
		return pages.find((p) => !p.url().includes("localhost:5173") && !p.url().startsWith("file://")) || pages[0];
	};
	ipcMain.handle("navigate_browser", async (event, { url }) => {
		page = await getActivePage();
		if (!page) throw new Error("Browser not launched or page not found");
		if (page.url() !== url) await page.goto(url, { waitUntil: "domcontentloaded" }).catch(() => {});
		const title = await page.title();
		const screenshot = await page.screenshot({ type: "png" });
		return {
			url: page.url(),
			title,
			image: screenshot.toString("base64"),
			mimeType: "image/png"
		};
	});
	ipcMain.handle("get_browser_screenshot", async () => {
		page = await getActivePage();
		if (!page) throw new Error("Browser not launched");
		return (await page.screenshot({ type: "png" })).toString("base64");
	});
	ipcMain.handle("get_browser_dom_tree", async () => {
		page = await getActivePage();
		if (!page) throw new Error("Browser not launched");
		const compactData = await runCompactObserve(page);
		const treeText = formatCompactTree(compactData);
		return {
			url: compactData.url,
			title: compactData.title,
			tree: treeText,
			stats: {
				totalNodes: compactData.textHolderCount + compactData.interactableCount,
				interactiveNodes: compactData.interactableCount,
				textHolders: compactData.textHolderCount,
				visibleNodes: compactData.visibleCount
			}
		};
	});
	ipcMain.handle("mine_batch_urls", async (event, { targets, returnToUrl }) => {
		let currentPage = await getActivePage();
		if (!currentPage) throw new Error("Browser not launched");
		const results = [];
		for (let i = 0; i < targets.length; i++) {
			const target = targets[i];
			event.sender.send("mine_progress", `Mining page ${i + 1}/${targets.length}: ${target.url}`);
			try {
				await currentPage.goto(target.url, {
					waitUntil: "load",
					timeout: 2e4
				});
				if (target.credential?.username || target.credential?.password) {
					event.sender.send("mine_progress", `Authenticating on ${target.url}...`);
					try {
						await authenticate(currentPage, target.credential);
						await new Promise((r) => setTimeout(r, 3e3));
					} catch (authErr) {
						console.error(`Auth failed for ${target.url}:`, authErr);
					}
				} else await new Promise((r) => setTimeout(r, 2e3));
				const compactData = await runCompactObserve(currentPage);
				const treeText = formatCompactTree(compactData);
				results.push({
					url: compactData.url,
					title: compactData.title,
					tree: treeText,
					stats: {
						totalNodes: compactData.textHolderCount + compactData.interactableCount,
						interactiveNodes: compactData.interactableCount,
						textHolders: compactData.textHolderCount,
						visibleNodes: compactData.visibleCount
					}
				});
			} catch (err) {
				console.error(`Failed to mine ${target.url}:`, err);
			}
		}
		if (returnToUrl) {
			event.sender.send("mine_progress", `Restoring original page...`);
			try {
				await currentPage.goto(returnToUrl, {
					waitUntil: "load",
					timeout: 15e3
				});
			} catch (e) {}
		}
		return results;
	});
	ipcMain.handle("inspect_element_at_point", async (event, { x, y }) => {
		page = await getActivePage();
		if (!page) throw new Error("Browser not launched");
		return { element: await page.evaluate(({ x, y }) => {
			const el = document.elementFromPoint(x, y);
			if (!el) return null;
			const rect = el.getBoundingClientRect();
			return {
				tagName: el.tagName,
				text: el.textContent,
				id: el.id,
				testId: el.getAttribute("data-testid"),
				role: el.getAttribute("role"),
				label: el.getAttribute("aria-label"),
				placeholder: el.getAttribute("placeholder"),
				className: el.className,
				rect: {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height
				}
			};
		}, {
			x,
			y
		}) };
	});
	ipcMain.handle("interact_browser", async (event, params) => {
		page = await getActivePage();
		if (!page) throw new Error("Browser not launched");
		const { action, x, y, key, deltaX, deltaY } = params;
		if (action === "click" && x != null && y != null) await page.mouse.click(x, y);
		else if (action === "keydown" && key) await page.keyboard.press(key);
		else if (action === "scroll" && deltaX != null && deltaY != null) await page.mouse.wheel(deltaX, deltaY);
		await page.waitForTimeout(500);
		const title = await page.title();
		const screenshot = await page.screenshot({ type: "png" });
		return {
			url: page.url(),
			title,
			image: screenshot.toString("base64"),
			mimeType: "image/png"
		};
	});
	ipcMain.handle("set_browser_mode", async (event, { mode }) => {
		page = await getActivePage();
		if (!page) return;
		try {
			await page.evaluate(() => {
				if (window.__tracyCleanup) window.__tracyCleanup();
			});
		} catch (e) {}
		if (mode === "inspect" || mode === "record") {
			try {
				await page.exposeFunction("__tracyEmitEvent", (type, data) => {
					const wins = __require("electron").BrowserWindow.getAllWindows();
					if (wins[0]) wins[0].webContents.send("browser-event", {
						type,
						data
					});
				});
			} catch (e) {}
			await page.evaluate((currentMode) => {
				let lastHighlighted = null;
				const over = (e) => {
					if (lastHighlighted) lastHighlighted.style.outline = "";
					lastHighlighted = e.target;
					if (lastHighlighted) {
						lastHighlighted.style.outline = "2px solid #3b82f6";
						lastHighlighted.style.outlineOffset = "-2px";
						lastHighlighted.style.cursor = "crosshair";
					}
				};
				const out = (e) => {
					if (lastHighlighted) {
						lastHighlighted.style.outline = "";
						lastHighlighted.style.cursor = "";
						lastHighlighted = null;
					}
				};
				const click = (e) => {
					if (currentMode === "inspect") {
						e.preventDefault();
						e.stopPropagation();
					}
					if (lastHighlighted) lastHighlighted.style.outline = "";
					const target = e.target;
					const rect = target.getBoundingClientRect();
					window.__tracyEmitEvent(currentMode === "inspect" ? "inspect-click" : "record-click", {
						tagName: target.tagName,
						text: target.textContent,
						id: target.id,
						className: target.className,
						testId: target.getAttribute("data-testid"),
						role: target.getAttribute("role"),
						placeholder: target.getAttribute("placeholder"),
						label: target.getAttribute("aria-label"),
						rect: {
							x: rect.x,
							y: rect.y,
							width: rect.width,
							height: rect.height
						}
					});
				};
				document.addEventListener("mouseover", over, true);
				document.addEventListener("mouseout", out, true);
				document.addEventListener("click", click, true);
				window.__tracyCleanup = () => {
					document.removeEventListener("mouseover", over, true);
					document.removeEventListener("mouseout", out, true);
					document.removeEventListener("click", click, true);
					if (lastHighlighted) {
						lastHighlighted.style.outline = "";
						lastHighlighted.style.cursor = "";
					}
				};
			}, mode);
		}
	});
}
//#endregion
//#region electron/ipc/webviewManager.ts
var webview = null;
function registerWebviewHandlers() {
	ipcMain.handle("open_child_webview", async (event, { url, x, y, width, height }) => {
		const parentWin = BrowserWindow.fromWebContents(event.sender);
		if (!parentWin) return;
		if (webview) {
			parentWin.contentView.removeChildView(webview);
			webview = null;
		}
		webview = new WebContentsView();
		parentWin.contentView.addChildView(webview);
		webview.setBounds({
			x: Math.round(x),
			y: Math.round(y),
			width: Math.round(width),
			height: Math.round(height)
		});
		webview.webContents.loadURL(url);
	});
	ipcMain.handle("resize_child_webview", async (event, { x, y, width, height }) => {
		if (webview) webview.setBounds({
			x: Math.round(x),
			y: Math.round(y),
			width: Math.round(width),
			height: Math.round(height)
		});
	});
	ipcMain.handle("set_child_webview_visible", async (event, { visible }) => {
		if (webview) {
			if (!visible) webview.setBounds({
				x: 0,
				y: 0,
				width: 0,
				height: 0
			});
		}
	});
	ipcMain.handle("close_child_webview", async (event) => {
		const parentWin = BrowserWindow.fromWebContents(event.sender);
		if (parentWin && webview) {
			parentWin.contentView.removeChildView(webview);
			webview = null;
		}
	});
}
//#endregion
//#region electron/ipc/index.ts
function registerIpcHandlers() {
	registerFileSystemHandlers();
	registerPlaywrightHandlers();
	registerWebviewHandlers();
}
//#endregion
//#region electron/main.ts
var __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
var VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
var MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
var RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
app.commandLine.appendSwitch("remote-debugging-port", "9222");
var win;
function createWindow() {
	win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			contextIsolation: true,
			nodeIntegration: false
		}
	});
	if (VITE_DEV_SERVER_URL) win.loadURL(VITE_DEV_SERVER_URL);
	else win.loadFile(path.join(RENDERER_DIST, "index.html"));
}
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
		win = null;
	}
});
app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(() => {
	createWindow();
	registerIpcHandlers();
});
//#endregion
export { MAIN_DIST, RENDERER_DIST, VITE_DEV_SERVER_URL };
