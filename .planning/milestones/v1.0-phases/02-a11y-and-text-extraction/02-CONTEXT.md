# Phase 02 Context: A11y & Zero-Hardcoded-Text Refactor

## Why

The application currently has over 250 hardcoded user-visible text strings across 40 component files, almost zero ARIA semantics, and modals lack focus trapping and keyboard navigation. Per CLAUDE.md, accessibility and the `src/a11y/en.json` dictionary are first-class architectural requirements.

## Decisions

1. **Dictionary Schema (`src/a11y/en.json`):**
   - Single-locale English dictionary organized into domains: `common`, `header`, `tabs`, `studio`, `copilot`, `settings`, `projects`, `modals`, `reports`, `setup`, `docs`, `toolbar`, `domMiner`.
   - All static button labels, tooltips, titles, placeholders, headers, and descriptions must be key references.

2. **useTranslation Hook (`src/hooks/useTranslation.ts`):**
   - Enhanced with `{param}` / `%s` string interpolation: `t('common.count', { count: 5 })` or `t('key', { name: 'Foo' })`.
   - Retains missing-key warning in dev and fallback to raw key.

3. **jsx-a11y Lint Enforcement:**
   - Add `eslint-plugin-jsx-a11y` as a devDependency.
   - Configure in `eslint.config.js` / `.eslintrc.cjs` extending recommended rules.

4. **Modal A11y Hardening:**
   - Update `src/components/ui/Modal.tsx` to include `role="dialog"`, `aria-modal="true"`, focus trapping with Tab/Shift+Tab, Escape key listener to close, and autofocusing the first interactive element or container.

5. **Exemptions (Documented):**
   - Dynamic error text returned at runtime from the Electron IPC backend (e.g. raw shell errors, Playwright connection errors) are dynamic data, not static UI strings.
   - Test YAML and code snippet templates.

6. **Guard Test (`src/a11y/a11yTextGuard.test.ts`):**
   - Automated Vitest test scanning all `.tsx` components in `src/components/` to verify zero hardcoded JSX text nodes remain outside allowed dynamic expressions.
