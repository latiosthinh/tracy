import type { SkillDefinition } from '@/src/types/skills';

export const authSessionSkill: SkillDefinition = {
  id: 'auth-resilience',
  name: 'Auth & Session Resilience',
  description:
    'Specialized handling for login flows, 2FA/MFA split inputs, cookie consent banners, sensitive credential masking, and session timeout/redirect delays.',
  version: '1.0.0',
  domain: 'auth',
  systemPromptInjection: `[Skill: auth-resilience]
- Multi-Step Login Flows: Anticipate multi-step authentication sequences (e.g., username/email entry followed by password or OTP challenge on a subsequent screen).
- MFA & 2FA Split Inputs: Target multi-box one-time code inputs using resilient locators like \`input[autocomplete="one-time-code"]\`, \`input[aria-label*="digit" i]\`, or index-based digit boxes (\`input[type="text"][maxlength="1"]\`).
- Cookie & Consent Banners: Explicitly dismiss or accept cookie banners (\`button:has-text("Accept")\`, \`[aria-label*="cookie" i] button\`) before interacting with underlying view elements.
- Sensitive Credential Masking: Never hardcode raw production passwords or secret session tokens in test step titles, descriptions, or assertion logs. Use environment variables or masked placeholder strings.
- Redirect & Navigation Waits: When submitting credentials or completing OAuth redirects, insert explicit \`waitFor\` conditions targeting post-login navigation milestones (e.g., dashboard header, user avatar, URL changes).
- Session Expiry & Timeout: Account for token expiration and re-authentication dialogs by asserting deterministic session-active indicators.`,
  tags: ['auth', 'login', 'security', 'session', 'mfa', 'cookies'],
};
