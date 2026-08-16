# Phase 05 Plan 02: Device Framing and Viewport Orientation Summary

Realistic device bezel frames (mobile, tablet, laptop, desktop) and orientation toggles (portrait/landscape) for embedded browser preview.

## Key Changes

1. **State & Translations:**
   - Added `deviceOrientation` (`portrait` | `landscape`) and `showDeviceBezel` (`boolean`) state to `useUiStore` with localStorage persistence.
   - Added actions `setDeviceOrientation`, `toggleDeviceOrientation`, `setShowDeviceBezel`, `toggleDeviceBezel`.
   - Added translation keys `layout.deviceFrame`, `layout.rotateOrientation`, `layout.portrait`, `layout.landscape` in `src/a11y/en.json`.

2. **UI Controls & Viewport Bezels:**
   - Added rotate orientation (`RotateCw`) and bezel frame toggle (`SmartphoneCharging`) icon buttons to `StudioToolbar.tsx`.
   - Implemented styled bezels in `RealBrowserView.tsx` with rounded outer borders, camera/speaker cutouts, home indicators, and stands for mobile, tablet, laptop, and desktop.
   - Swapped viewport widths/heights dynamically in landscape orientation (375x812 <-> 812x375 for mobile, 768x1024 <-> 1024x768 for tablet).
   - Ensured `containerRef` wraps the inner screen area so `getBoundingClientRect()` accurately sizes and positions the native `WebContentsView`.

## Verification

- `pnpm lint` passed with 0 warnings.
- `pnpm test` passed 18 test files (285 tests).
- `a11yTextGuard.test.ts` passed with zero untranslated hardcoded JSX text.

## Commits

- `1389487`: feat(05-02): add device framing and orientation state
- `63dc05a`: feat(05-02): build device bezel frames in RealBrowserView and toolbar triggers

## Self-Check: PASSED
