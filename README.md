# Tracy — Agentic E2E Web Automation Studio

An AI-powered end-to-end web automation studio built with React, Tauri, and the Gemini API. Tracy lets you record, author, and run browser automation workflows with an agentic AI copilot.

## Prerequisites

| Requirement | Needed for | Install |
|---|---|---|
| **Node.js** (≥ 22) | All modes | [nodejs.org](https://nodejs.org) |
| **Rust** (stable) | Desktop app | [rustup.rs](https://rustup.rs) |
| **System build tools** | Desktop app (Tauri compile) | See [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) |
| **Playwright browsers** | Real browser mode | `npx playwright install chromium` |

> **Note:** On Windows you need the **Visual Studio C++ Build Tools** and **WebView2** (pre-installed on Windows 10+). On macOS you need **Xcode Command Line Tools**. On Linux you need several system libraries — check the Tauri docs linked above.

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Install Playwright browser** (for real browser mode):

   ```bash
   npx playwright install chromium
   ```

3. **Set your Gemini API key** in [.env.local](.env.local):

   ```
   GEMINI_API_KEY=your_key_here
   ```

## Running the App

### 🖥️ Tauri Desktop (Full App — Recommended)

Launches the full desktop application with the Rust backend and real browser engine:

```bash
npm run dev
```

This runs `tauri dev` under the hood, which:
- Starts the Vite frontend dev server on `http://localhost:5173`
- Compiles the Rust backend (first run takes a few minutes)
- Opens the Tracy desktop window with hot-reload enabled

### 🌐 Frontend Only (Browser)

To run just the React frontend in your browser without the Tauri shell:

```bash
npm run dev:frontend
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

> **Tip:** This is useful for quick UI iteration when you don't need the Rust/native features.

## Building for Production

```bash
npm run build
```

This runs `tauri build`, creating a distributable desktop installer for your platform in `src-tauri/target/release/bundle/`.

To build only the frontend assets:

```bash
npm run build:frontend
```

## Available Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `tauri dev` | Run the full Tauri desktop app in dev mode |
| `dev:frontend` | `vite` | Run only the frontend dev server |
| `build` | `tauri build` | Build the production desktop app |
| `build:frontend` | `vite build` | Build only the frontend assets |
| `clean` | `rimraf dist src-tauri/target` | Clean all build artifacts |
| `lint` | `tsc --noEmit` | Type-check the frontend code |
| `typecheck` | `tsc --noEmit` | Alias for lint |

## Browser Mode

Tracy supports two browser modes in the sandbox panel:

- **Real Browser** — Uses Playwright to load actual websites via a Node.js bridge. Supports any URL, screenshots, and DOM mining.
- **Mock Sandbox** — A built-in mock e-commerce app for testing without external dependencies.

Toggle between modes using the **Mock / Real** buttons in the browser toolbar.

> **Note:** If a website blocks iframe embedding (X-Frame-Options), use the "Open in Browser" button to view it externally.

## Project Structure

```
tracy/
├── src/                          # React frontend (Vite + TailwindCSS)
│   ├── components/
│   │   ├── ai/                   # AI Copilot panel
│   │   ├── editor/               # YAML & visual editors
│   │   ├── layout/               # App shell & header
│   │   ├── projects/             # Project manager
│   │   ├── reports/              # Test reports & CLI terminal
│   │   ├── settings/             # Settings modal
│   │   ├── shared/               # Shared components
│   │   └── studio/               # Studio view & browser panels
│   ├── stores/                   # Zustand state stores
│   ├── types/                    # TypeScript types
│   ├── utils/                    # Utilities (flowUtils, domMiner)
│   ├── data/                     # Default data
│   └── lib/
│       └── tauri.ts              # Tauri IPC bridge
├── src-tauri/                    # Tauri / Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   ├── lib.rs                # App setup & plugin registration
│   │   ├── ipc.rs                # Frontend ↔ Backend commands
│   │   ├── ai/                   # Agent CLI scanner
│   │   ├── engine/               # Playwright bridge & execution engine
│   │   └── projects/             # YAML parser & project store
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── playwright-bridge.js           # Node.js Playwright bridge server
├── package.json
└── .env.local                    # API keys (not committed)
```

## Key Features

- **AI Copilot** — Generate test flows from natural language prompts using Gemini
- **DOM Miner** — Mine page structure for token-efficient AI flow generation
- **Real Browser** — Load any website via Playwright + Chromium
- **YAML Editor** — Author automation flows in a custom YAML format
- **Visual Step Editor** — Block-based flow builder
- **Execution Timeline** — Real-time step-by-step test runner
- **Project Management** — Multi-project support with tab-based switching
- **Auto-Save** — Automatic local disk persistence for flows, snapshots, and configs
