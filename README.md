# Tracy — E2E Browser Testing IDE & Autonomous QA Studio

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Version](https://img.shields.io/badge/version-5.0.0-amber.svg)]()
[![Platform](https://img.shields.io/badge/platform-Electron%20+%20Web%20+%20CLI-cyan.svg)]()
[![Tech Stack](https://img.shields.io/badge/stack-React%2019+Playwright+AI+Zustand-purple.svg)]()

> **Desktop-first AI-powered testing IDE and autonomous QA studio** that lets you design, edit, crawl, profile, self-heal, and execute E2E browser tests through YAML flows. Run locally in Electron, headlessly in CI with `tracy` CLI, or in-browser for zero-install flow design.

---

## Screenshots

| Studio View | YAML Editor | AI Copilot |
|-------------|-------------|------------|
| ![Studio View](public/screenshots/studio-view.png) | ![YAML Editor](public/screenshots/yaml-editor.png) | ![AI Copilot](public/screenshots/ai-copilot.png) |

> **Tip:** Run `pnpm capture-screenshots` to regenerate all screenshots from a live Tracy instance.

---

## What is Tracy?

Tracy bridges manual QA exploration, AI-driven test synthesis, autonomous site crawling, performance profiling, and enterprise CI execution. Instead of hand-coding brittle browser automation scripts, define tests declaratively in YAML, let AI synthesize flows from compressed DOM snapshots, crawl entire route trees autonomously, mock network APIs, simulate throttled devices, profile Core Web Vitals, and auto-heal broken selectors during execution.

### Key Capabilities

- **No-Code & Pro-Code YAML Authoring** — Natural-language flow generation with AI Copilot, schema autocomplete (`Ctrl+Space`), side-by-side YAML diffing, and export to standalone Playwright TypeScript tests.
- **Autonomous Crawler & Visual Topology** — Crawl web applications to map routes, detect forms/actions, and render interactive React Flow route graphs with instant flow generation.
- **Self-Healing Execution Engine** — Dynamic runtime selector healing with fuzzy DOM matching and AI heuristics that output comment-preserving YAML AST patches.
- **Multi-Browser Matrix Runner** — Execute tests concurrently across Chromium, Firefox, and WebKit with configurable worker pools and per-step browser conditionals (`when` / `skip_if`).
- **Declarative Network Mocking & HAR Replay** — Route mocking, fixture responses, latency simulation, and HAR recording/replay directly from frontmatter or inline steps.
- **Core Web Vitals & Performance Profiling** — Harvest LCP, CLS, INP, FCP, TTFB, memory usage, and enforce strict performance budgets under CPU/network throttling.
- **Headless CI CLI** — Run suites headlessly in CI pipelines with JUnit XML, JSON, and self-heal patch generation via `tracy run`.
- **Live DOM Mining & Multi-Provider AI** — Token-compressed DOM extraction (`dom-miner`) paired with multi-turn AI providers (Google Gemini, OpenAI-compatible, Anthropic).

---

## Feature Matrix

| Feature | Web Mode | Desktop Mode (Electron) | Headless CLI (`tracy`) |
|---------|:--------:|:-----------------------:|:----------------------:|
| YAML Flow Editing & Visual Builder | ✅ | ✅ | ❌ |
| AI Flow Generation & QA Recipes | ✅ (HTTP) | ✅ (Direct / CLI Agents) | ❌ |
| Live Playwright Execution | ❌ (Simulated) | ✅ (Real Browser) | ✅ (Headless) |
| Multi-Browser Matrix (Chromium / Firefox / WebKit) | ❌ | ✅ | ✅ |
| Autonomous Crawler & Topology Graph | ❌ | ✅ | ❌ |
| Self-Healing Engine & AST Patching | ❌ | ✅ | ✅ (`--heal`) |
| Network Route Mocking & HAR Replay | ❌ | ✅ | ✅ |
| Core Web Vitals & Throttle Profiling | ❌ | ✅ | ✅ |
| Local File System & Native Storage | IndexedDB (Dexie) | ✅ Native FS | ✅ Local FS |
| Interactive HTML Reports & Flamechart | ✅ | ✅ | ✅ (JUnit / JSON) |

---

## Getting Started

### Desktop App (Full IDE & Automation)

Full feature set including Playwright automation, live DOM mining, crawler, profiler, and matrix runner.

```bash
git clone https://github.com/latiosthinh/tracy.git
cd tracy
pnpm install
pnpm dev              # Launch Electron + Vite dev studio
pnpm build            # Package production desktop app
```

### Headless CI CLI

Run test flows in CI/CD pipelines without launching the graphical IDE.

```bash
# Run all YAML flows in current directory
pnpm cli run

# Run specific flows with JUnit reporting and self-healing in CI
pnpm cli run "flows/*.yaml" --browser chromium,firefox --workers 4 --heal --reporter junit --output ./test-results

# Or link global binary
pnpm link --global
tracy run --ci --heal
```

### Web Studio (Zero-Install Authoring)

Author flows, generate tests with AI, and simulate executions directly in your browser.

```bash
pnpm dev:web          # Launch web studio on http://localhost:5174
pnpm build:web        # Build static production bundle in dist-web/
pnpm server:web       # (Optional) Launch AI proxy backend on port 3001
```

---

## Quick Workflow

1. **Configure AI Provider** — Setup Google Gemini, OpenAI, or local endpoint in Settings.
2. **Explore or Crawl Application** — Enter target URL in Studio or run Autonomous Crawler to map routes.
3. **Generate Flows** — Use AI Copilot or built-in QA Recipes to synthesize test flows from DOM trees.
4. **Refine & Mock** — Fine-tune selectors, add network mock rules, configure throttling, and set performance budgets.
5. **Run Matrix & Profiler** — Execute across Chromium/Firefox/WebKit and inspect real-time logs, network waterfalls, and Web Vitals scorecards.
6. **Automate in CI** — Commit YAML flows and run `tracy run --ci --heal` in your pipeline.

---

## CLI Reference

`tracy [command] [options]`

| Command / Option | Description |
|------------------|-------------|
| `run [pattern]` | Execute YAML flow files (default: `./**/*.yaml`) |
| `-b, --browser <list>` | Target browser engines: `chromium`, `firefox`, `webkit`, `all` (default: `chromium`) |
| `-w, --workers <num>` | Parallel worker concurrency (default: `1`) |
| `-u, --url <url>` | Override base target URL |
| `--heal` | Enable runtime self-healing and generate unified patch files |
| `--patch-file <path>` | Destination path for auto-healing diff patch |
| `-r, --reporter <type>` | Output reporter: `console`, `junit`, `json`, `all` |
| `-o, --output <dir>` | Directory for test reports and artifacts (default: `test-results`) |
| `--timeout <ms>` | Step timeout limit in milliseconds (default: `30000`) |
| `--ci` | CI mode (enables JUnit report and non-interactive output) |
| `-h, --help` | Display CLI help screen |
| `-v, --version` | Output version info |

---

## Flow Schema Snapshot

Test flows are defined in human-readable, comment-preserving YAML with optional frontmatter:

```yaml
# E2E Checkout Flow with Mocks & Performance Budget
url: https://example.com
browsers:
  - chromium
  - firefox
throttling: fast3g
performanceBudget:
  lcp: "< 2500ms"
  cls: "<= 0.1"
mocks:
  - url: "**/api/v1/inventory"
    status: 200
    body: { available: true, stock: 99 }
---
- navigate: /login
- fill: test@example.com
  selector: '#email'
- fill: secret123
  selector: '#password'
- leftClick: true
  selector: button[type="submit"]
- waitFor: networkIdle
- assertPerformance: true
  lcp: "< 2500ms"
```

For full syntax and step attributes, see [docs/FLOW_SCHEMA.md](docs/FLOW_SCHEMA.md).

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Tracy Studio UI                     │
│  React 19 • Tailwind v4 • Zustand • @xyflow (React Flow) │
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ YAML Editor  │ │ Studio View  │ │ Route Visualizer │  │
│  │  & Diffing   │ │ & Inspector  │ │ & Perf Profiler  │  │
│  └──────────────┘ └──────────────┘ └──────────────────┘  │
└────────────────────────────┬─────────────────────────────┘
                             │ IPC Bridge / HTTP
┌────────────────────────────▼─────────────────────────────┐
│              Electron Main / CLI Runner                  │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────────────┐  │
│  │  Playwright Engine │  │ Multi-Provider AI Engine   │  │
│  │  • Matrix Workers  │  │ • Gemini / OpenAI / Claude │  │
│  │  • Route Mock / HAR│  │ • Agent Skills Registry    │  │
│  │  • Self-Healing    │  │ • DOM-Miner AST Synthesizer│  │
│  │  • Web Vitals/CDP  │  │ • Comment YAML Patcher     │  │
│  └────────────────────┘  └────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **UI & Renderer:** React 19, Vite, TypeScript, Zustand, Tailwind CSS v4, `@xyflow/react`, Lucide Icons
- **Desktop Runtime:** Electron (sandboxed, secure IPC bridge with contextIsolation)
- **Automation Core:** `playwright-core` (Chromium, Firefox, WebKit execution, CDP emulation)
- **AI & Reasoning:** `@google/genai` (Gemini), Multi-turn Provider abstraction (OpenAI, Anthropic, Custom endpoints)
- **Analysis & Parsing:** `dom-miner` (token-compressed DOM extraction), `yaml` / `js-yaml` (AST preservation)
- **Storage:** Native File System (Desktop/CLI), Dexie / IndexedDB (Web)
- **Testing & Tooling:** Vitest (70+ test suites, 660+ tests), ESLint, TypeScript 5.9

---

## Development Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Electron + Vite live development environment |
| `pnpm dev:web` | Start standalone Web IDE on port 5174 |
| `pnpm test` | Run Vitest test suite |
| `pnpm typecheck` | Run TypeScript compiler checks |
| `pnpm lint` | Run ESLint verification |
| `pnpm cli` | Run local Tracy CLI runner |
| `pnpm build` | Build full Electron installer package |
| `pnpm build:web` | Build static web application |
| `pnpm clean` | Clean all build output directories |

---

## License

MIT © Tracy Authors
