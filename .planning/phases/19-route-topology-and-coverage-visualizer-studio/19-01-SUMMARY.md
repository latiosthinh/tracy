# Phase 19 Plan 01: Route Topology Contracts & Zustand Crawler Store Summary

**One-liner:** Installed `@xyflow/react`, defined visualizer and crawler types, and implemented Zustand `crawlerStore` with live IPC stream ingestion and route coverage computation.

## Key Changes

1. **Installed Dependency:**
   - Added `@xyflow/react` (^12.11.3) to `package.json` for React Flow canvas integration.

2. **Types & UI Contracts:**
   - Created `src/types/crawler.ts` defining `VisualizerNodeData`, `VisualizerEdgeData`, `RouteCoverageStatus`, `FlowGenerationOptions`, and `CrawlerStoreState`.
   - Updated `src/types/ui.ts` to include `'visualizer'` in the `ActiveTab` union.
   - Updated `src/types/index.ts` to export all crawler types.
   - Added accessibility translation dictionaries in `src/a11y/en.json` for `visualizer` and `crawler`.

3. **Zustand Crawler Store:**
   - Created `src/stores/crawlerStore.ts` with `calculateRouteCoverage(pathname, url, existingFlows)`.
   - Wired live IPC stream handling via `tracyApi.onCrawlerProgress` and clean unlisten callbacks to prevent memory leaks.
   - Built node/edge deduplication and capped visualizer graph capacity to 500 nodes (mitigating T-19-01).

4. **Testing & Quality:**
   - Created `src/stores/crawlerStore.test.ts` with 8 unit tests covering coverage tagging, crawl lifecycle, graph addition/deduplication, and flow synthesis.
   - Verified `pnpm test` and `pnpm lint` pass with zero errors.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Register Mitigations Applied

| Threat ID | Category | Component | Disposition | Mitigation Applied |
|-----------|----------|-----------|-------------|--------------------|
| T-19-01 | Denial of Service (Memory Bloat) | `crawlerStore.ts` | mitigate | Deduplicated nodes by `id` and capped graph state to 500 nodes. |
| T-19-02 | State Desynchronization | `crawlerStore.ts` | mitigate | Explicit `unlistenProgress()` cleanup on `stopCrawl()`, `resetGraph()`, and crawl initialization. |

## Self-Check: PASSED
- `src/types/crawler.ts`: FOUND
- `src/stores/crawlerStore.ts`: FOUND
- `src/stores/crawlerStore.test.ts`: FOUND
- Commits `adf99e6` and `3bf657d`: FOUND
