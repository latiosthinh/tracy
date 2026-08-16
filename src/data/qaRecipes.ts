import { TranslationKey } from '@/src/hooks/useTranslation';

export interface QaRecipe {
  id: string;
  icon: string; // Lucide icon name identifier or descriptor
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  category: 'forms' | 'responsive' | 'a11y' | 'auth' | 'ecommerce';
  promptTemplate: string;
}

export const QA_RECIPES: QaRecipe[] = [
  {
    id: 'form-validation',
    icon: 'CheckSquare',
    labelKey: 'copilot.recipes.formValidation.label',
    descriptionKey: 'copilot.recipes.formValidation.description',
    category: 'forms',
    promptTemplate: `Generate an E2E test flow covering comprehensive Form Validation and Error Handling:
1. Attempt submitting empty required form fields and assert visible validation error messages.
2. Enter invalid email formats, short passwords, and out-of-range numeric inputs.
3. Assert that error states trigger appropriate border styling and ARIA invalid attributes.
4. Fill valid data and verify successful form submission or next step progression.`,
  },
  {
    id: 'responsive-nav',
    icon: 'Smartphone',
    labelKey: 'copilot.recipes.responsiveNav.label',
    descriptionKey: 'copilot.recipes.responsiveNav.description',
    category: 'responsive',
    promptTemplate: `Generate an E2E test flow verifying Responsive Navigation and Mobile Layout:
1. Emulate a mobile viewport (375x812, iPhone).
2. Assert desktop navigation bar is hidden and mobile hamburger button is visible.
3. Click hamburger toggle button and assert mobile drawer menu opens.
4. Click a navigation link inside mobile drawer and assert target URL navigation.`,
  },
  {
    id: 'a11y-audit',
    icon: 'Eye',
    labelKey: 'copilot.recipes.a11yAudit.label',
    descriptionKey: 'copilot.recipes.a11yAudit.description',
    category: 'a11y',
    promptTemplate: `Generate an E2E test flow for Accessibility and ARIA Assertion Audit:
1. Verify all primary interactive elements have valid accessible roles (button, link, textbox, dialog).
2. Assert interactive buttons and inputs have accessible labels or aria-label attributes.
3. Test keyboard navigation tab focus traversal through key form elements.
4. Verify modals and drawers carry proper role="dialog" and aria-modal="true" attributes.`,
  },
  {
    id: 'auth-edge-cases',
    icon: 'ShieldCheck',
    labelKey: 'copilot.recipes.authEdgeCases.label',
    descriptionKey: 'copilot.recipes.authEdgeCases.description',
    category: 'auth',
    promptTemplate: `Generate an E2E test flow testing Authentication & Session Edge Cases:
1. Attempt login with empty fields, then invalid credentials, asserting error alerts.
2. Log in with valid credentials and assert redirection to dashboard.
3. Assert authenticated navigation state and session persistence.
4. Perform logout and verify redirect back to login and inability to access protected paths.`,
  },
  {
    id: 'checkout-flow',
    icon: 'ShoppingCart',
    labelKey: 'copilot.recipes.checkoutFlow.label',
    descriptionKey: 'copilot.recipes.checkoutFlow.description',
    category: 'ecommerce',
    promptTemplate: `Generate an E2E test flow covering Complete E-Commerce Checkout:
1. Search or browse for an item and click 'Add to Cart'.
2. Assert cart badge increments and open cart drawer.
3. Proceed to checkout, apply promotional discount coupon code, and assert discount banner.
4. Fill shipping address details, select payment method, submit order, and assert order confirmation modal.`,
  },
];
