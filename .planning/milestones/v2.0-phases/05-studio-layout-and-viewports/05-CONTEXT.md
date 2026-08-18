# Phase 05 Context: Studio Layout Versatility & Device Viewports

## Overview
Flexible workspace orientation (horizontal vs vertical split), realistic responsive device bezel frames (mobile/tablet/desktop mockups with orientation flip), and dark/light color scheme page emulation.

## Decisions
- Studio layout split orientation (`splitOrientation: 'vertical' | 'horizontal'`) stored in `uiStore` with localStorage persistence.
- Vertical split: left = browser, right = side panel.
- Horizontal split: top = browser, bottom = side panel (ideal for wide screens or tall mobile test recordings).
- Device bezel framing: optional bezel frame wrapping the embedded browser with realistic rounded borders, notch/camera indicator, and portrait/landscape rotation.
- Webview color-scheme emulation toggle (`emulateMedia: { colorScheme: 'dark' | 'light' }`) via Playwright engine & webview IPC.
- All labels and tooltips extracted to `src/a11y/en.json` under `layout` and `viewports`.
