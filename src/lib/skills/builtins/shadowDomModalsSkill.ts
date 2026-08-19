import type { SkillDefinition } from '@/src/types/skills';

export const shadowDomModalsSkill: SkillDefinition = {
  id: 'shadow-dom-modal',
  name: 'Shadow DOM & Modals Specialist',
  description:
    'Handling web components, shadow root penetration, modal overlays, focus traps, backdrop dismissal, and CSS animation transition states.',
  version: '1.0.0',
  domain: 'shadow-dom',
  systemPromptInjection: `[Skill: shadow-dom-modal]
- Shadow DOM Penetration: Pierce open shadow roots using standard Playwright CSS/text engine selectors or explicit pierce selectors without relying on fragile JS evaluation paths.
- Iframe Boundaries & Contexts: Switch to iframe frames when interacting with embedded widgets, payment forms, or sandboxed third-party apps.
- Modal Open/Close Transitions: Wait for modal animation keyframes to finish before interacting with dialog content (e.g., \`waitFor: [role="dialog"][data-state="open"]\` or checking overlay opacity/visibility).
- Dialog & Focus Traps: Scope modal element interactions inside \`[role="dialog"]\` or \`[aria-modal="true"]\` to avoid hitting obscured background elements.
- Backdrop & Dismissal: Test modal dismissal through close buttons, Escape key presses (\`press: Escape\`), or backdrop clicks (\`.modal-backdrop\`, \`[data-state="open"] >> .backdrop\`).`,
  tags: ['shadow-dom', 'modals', 'dialogs', 'web-components', 'overlays', 'iframes'],
};
