<div align="center">
  <img src="./src-tauri/icons/128x128.png" width="128" height="128" alt="Tracy Icon" />
  <h1>Tracy</h1>
  <p><strong>The modern, AI-powered IDE for End-to-End browser testing</strong></p>
</div>

<br/>

## 🌟 What is Tracy?

Tracy is a next-generation E2E testing tool that completely re-imagines how developers and QA engineers write browser automation tests. Instead of dealing with fragile locators, boilerplate code, and headless setups, Tracy offers a **blazing-fast desktop environment** combining Playwright, visual flows, and cutting-edge GenAI features.

Built with **Electron, React, Vite, and TailwindCSS**, Tracy empowers you to build tests by simply describing your intent or picking elements visually.

---

## ✨ Features

- **⚡ Instant Playwright Bridge**: Watch your tests run live, step-by-step, in an embedded Chromium browser right inside the IDE.
- **🤖 AI Copilot & DOM Miner**: Ask Tracy to write flows for you. With our custom `dom-miner`, Tracy efficiently compresses complex web pages into an optimized syntax tree, drastically reducing token usage while helping the AI output perfect element selectors.
- **📝 Premium YAML Editor**: A fully-featured text editor with context-aware autocomplete, syntax highlighting, and hover descriptions for actions and attributes. 
- **🧩 Visual Step Builder**: Prefer dragging and dropping? Use the visual mode to construct flows seamlessly.
- **♿ First-Class Accessibility**: Every component is designed with screen readers, tab-navigation, and tooltips in mind (powered by an underlying translation dictionary).
- **📊 Real-time Timeline**: See precise step durations, debug information, and network assertions in the runner timeline.

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Framer Motion
- **Backend / Desktop**: Electron, Playwright (for embedded testing)
- **AI / Tooling**: Google GenAI SDK, `dom-miner`

---

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   pnpm install
   ```
   
2. **Start the Development Server & Electron App**
   ```bash
   pnpm dev
   ```

3. **Explore the Docs**
   Check out our [Documentation folder](./docs/) for deep dives into Tracy's architecture and advanced features.

---

## 📚 Documentation

The `docs/` folder contains comprehensive documentation to help you master Tracy and contribute to its ecosystem:

- [**Architecture Overview**](./docs/ARCHITECTURE.md) - Learn how Tracy's stores, IPC layer, and Electron backend operate together.
- [**Flow Schema Definition**](./docs/FLOW_SCHEMA.md) - Discover all supported test step actions (e.g., `navigate`, `leftClick`, `fill`, `waitFor`) and their YAML structure.
- [**DOM Miner**](./docs/DOM_MINER.md) - Deep dive into how we compress web pages and feed efficient tokens to GenAI models.

---

## 🤝 Contributing

We welcome contributions! Please review our architecture docs and file an issue before submitting a PR. Let's make browser automation a joy to write. 

<div align="center">
  <sub>Built with ❤️ by the Tracy Team</sub>
</div>
