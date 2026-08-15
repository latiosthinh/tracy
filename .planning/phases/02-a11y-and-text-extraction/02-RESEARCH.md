# Phase 02 Research: A11y & Zero-Hardcoded-Text Refactor

## Executive Summary

Audit discovered ~252 hardcoded JSX text nodes and 44 hardcoded `title` attributes across 40 `.tsx` files in `src/components/`. The infrastructure (`useTranslation` + `src/a11y/en.json`) exists but was only used in `IconButton.tsx` for 26 keys.

## Standard Stack

| Problem | Recommendation | Why |
|---------|----------------|-----|
| A11y Linting | `eslint-plugin-jsx-a11y` | Industry standard React accessibility linter; plugs directly into existing `pnpm lint` gate. |
| Localization Hook | Handcrafted `useTranslation` | Avoids adding heavyweight runtime dependencies (like `react-i18next`); matches existing dictionary architecture. |
| Modal Trapping | Native DOM focus trap in `src/components/ui/Modal.tsx` | Clean, 20-line implementation without external modal libraries; covers all dialogs centrally. |
| Text Guard | Vitest AST/regex scanner in `src/a11y/a11yTextGuard.test.ts` | Prevents future regressions of hardcoded JSX text. |

## Architecture Patterns

### Translation Pattern
```typescript
import { useTranslation } from '@/src/hooks/useTranslation';

export const MyComponent = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t('header.title')}</h1>
      <button title={t('common.save')} aria-label={t('common.save')}>
        {t('common.save')}
      </button>
    </div>
  );
};
```

### Interpolation Pattern
```typescript
// en.json: "welcome": "Welcome back, {name}! You have {count} tests."
t('dashboard.welcome', { name: user.name, count: 5 });
```

### Focus Trap Pattern in Modal.tsx
```typescript
useEffect(() => {
  if (!isOpen) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab' && modalRef.current) {
      const focusables = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onClose]);
```

## Don't Hand-Roll
- Do NOT hand-roll ad-hoc modal key listeners in individual modal components — centralize in `Modal.tsx`.
- Do NOT use separate conflicting strings for `title` and `aria-label` — share the same `t()` key.
- Do NOT add runtime i18n libraries (like i18next) — the existing `useTranslation` + `en.json` approach is lightweight and fast.

## Common Pitfalls
1. **Dynamic IPC errors:** Attempting to put dynamic server stack traces into `en.json` leads to broken lookups.
2. **Missing aria-hidden on decorative icons:** Lucide icons should carry `aria-hidden="true"` when accompanied by visible text.
3. **Double screen-reader announcements:** When a button has both visible text and `aria-label`, screen readers may read both if not aligned.
