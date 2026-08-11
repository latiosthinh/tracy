import { FlowFile, WorkspaceConfig } from '../types/autoflow';

export const DEFAULT_WORKSPACE_CONFIG: WorkspaceConfig = {
  flows: ['flows/**', 'subflows/**'],
  testOutputDir: './test-results',
  browser: 'chromium',
  headless: false,
  viewport: { width: 1280, height: 720 },
  timeout: 10000,
  retries: 3,
  continueOnFailure: false,
  env: {
    BASE_URL: 'https://staging.shop.example.com',
    DEFAULT_EMAIL: 'alex.dev@example.com',
    TEST_COUPON: 'SUMMER25',
  },
  testIdAttribute: 'data-testid',
  parallel: 2,
  reportFormat: 'html',
};

export const DEFAULT_FLOWS: FlowFile[] = [
  {
    id: 'checkout-flow',
    name: 'checkout-flow.yaml',
    path: 'flows/checkout-flow.yaml',
    category: 'E2E',
    tags: ['smoke', 'checkout', 'e2e'],
    metadata: {
      url: 'https://staging.shop.example.com',
      tags: ['smoke', 'checkout', 'e2e'],
      env: {
        COUPON_CODE: 'SUMMER25',
        TEST_EMAIL: 'alex.checkout@example.com',
      },
      browser: 'chromium',
      viewport: { width: 1280, height: 720 },
      timeout: 10000,
      retries: 2,
      video: true,
      trace: true,
    },
    yamlContent: `# E2E Checkout Flow — E-Commerce Cart & Order Confirmation
url: https://staging.shop.example.com
tags:
  - smoke
  - checkout
  - e2e
env:
  COUPON_CODE: SUMMER25
  TEST_EMAIL: alex.checkout@example.com
browser: chromium
viewport:
  width: 1280
  height: 720
timeout: 10000
retries: 2
video: true
trace: true
---
# 1. Navigate to Store
- navigate: /products
- assertTitle: "Products - Tracy Shop"

# 2. Search for Product
- inputText:
    selector:
      placeholder: "Search products..."
    text: "Wireless Headphones"
- pressKey: Enter
- waitForNetwork: idle

# 3. Add item to cart
- click:
    testId: "add-cart-headphones"
- assertVisible:
    selector:
      testId: "cart-badge"
    text: "1"

# 4. Open Cart Drawer & Proceed to Checkout
- click: "Cart"
- click: "Proceed to Checkout"
- assertUrl: "*/checkout*"

# 5. Apply Promo Coupon
- click: "Have a coupon?"
- inputText:
    selector:
      placeholder: "Enter promo code"
    text: \${COUPON_CODE}
- click: "Apply Coupon"
- assertVisible: "25% Discount Applied!"

# 6. Fill Shipping Details
- inputText:
    selector:
      label: "Full Name"
    text: "Alex Rivera"
- inputText:
    selector:
      label: "Email Address"
    text: \${TEST_EMAIL}
- selectOption:
    selector: "#country-select"
    value: "US"
- inputText:
    selector:
      label: "Shipping Address"
    text: "742 Evergreen Terrace"

# 7. Complete Order & Assert Confirmation
- click: "Place Order"
- waitForNetwork: idle
- assertVisible: "Order Confirmed!"
- copyTextFrom:
    selector: "#order-id-badge"
    output: ORDER_ID
- assertVisible: "Order #\${ORDER_ID} has been created."
`,
    steps: [
      { id: 'c-1', command: 'navigate', value: '/products', status: 'pending' },
      { id: 'c-2', command: 'assertTitle', value: 'Products - Tracy Shop', status: 'pending' },
      { id: 'c-3', command: 'inputText', target: { type: 'placeholder', value: 'Search products...' }, value: 'Wireless Headphones', status: 'pending' },
      { id: 'c-4', command: 'pressKey', value: 'Enter', status: 'pending' },
      { id: 'c-5', command: 'click', target: { type: 'testId', value: 'add-cart-headphones' }, status: 'pending' },
      { id: 'c-6', command: 'assertVisible', target: { type: 'testId', value: 'cart-badge' }, value: '1', status: 'pending' },
      { id: 'c-7', command: 'click', target: 'Cart', status: 'pending' },
      { id: 'c-8', command: 'click', target: 'Proceed to Checkout', status: 'pending' },
      { id: 'c-9', command: 'assertUrl', value: '*/checkout*', status: 'pending' },
      { id: 'c-10', command: 'click', target: 'Have a coupon?', status: 'pending' },
      { id: 'c-11', command: 'inputText', target: { type: 'placeholder', value: 'Enter promo code' }, value: '${COUPON_CODE}', status: 'pending' },
      { id: 'c-12', command: 'click', target: 'Apply Coupon', status: 'pending' },
      { id: 'c-13', command: 'assertVisible', value: '25% Discount Applied!', status: 'pending' },
      { id: 'c-14', command: 'inputText', target: { type: 'label', value: 'Full Name' }, value: 'Alex Rivera', status: 'pending' },
      { id: 'c-15', command: 'inputText', target: { type: 'label', value: 'Email Address' }, value: '${TEST_EMAIL}', status: 'pending' },
      { id: 'c-16', command: 'selectOption', target: { type: 'id', value: 'country-select' }, value: 'US', status: 'pending' },
      { id: 'c-17', command: 'inputText', target: { type: 'label', value: 'Shipping Address' }, value: '742 Evergreen Terrace', status: 'pending' },
      { id: 'c-18', command: 'click', target: 'Place Order', status: 'pending' },
      { id: 'c-19', command: 'assertVisible', value: 'Order Confirmed!', status: 'pending' },
      { id: 'c-20', command: 'copyTextFrom', target: { type: 'id', value: 'order-id-badge' }, args: { output: 'ORDER_ID' }, status: 'pending' },
    ],
  },
  {
    id: 'login-validation',
    name: 'login-validation.yaml',
    path: 'flows/login-validation.yaml',
    category: 'Smoke',
    tags: ['auth', 'security', 'smoke'],
    metadata: {
      url: 'https://staging.shop.example.com',
      tags: ['auth', 'security', 'smoke'],
      env: {
        USER_EMAIL: 'alex.dev@example.com',
        CORRECT_PASS: 'GhostFlow2026!',
        WRONG_PASS: 'invalid123',
      },
      browser: 'chromium',
      timeout: 8000,
    },
    yamlContent: `# Authentication & Validation Flow
url: https://staging.shop.example.com
tags:
  - auth
  - security
  - smoke
env:
  USER_EMAIL: alex.dev@example.com
  CORRECT_PASS: Tracy2026!
  WRONG_PASS: invalid123
browser: chromium
timeout: 8000
---
- navigate: /login
- assertTitle: "Sign In - Tracy Portal"

# 1. Test Incorrect Password Assertion
- inputText:
    selector:
      label: "Email Address"
    text: \${USER_EMAIL}
- inputText:
    selector:
      label: "Password"
    text: \${WRONG_PASS}
- click: "Sign In"
- assertVisible: "Invalid email or password"

# 2. Test Correct Credentials
- inputText:
    selector:
      label: "Password"
    text: \${CORRECT_PASS}
- click:
    role: "button"
    name: "Remember me"
- click: "Sign In"
- waitForNetwork: idle
- assertVisible: "Welcome back, Alex!"
- assertUrl: "*/dashboard*"
`,
    steps: [
      { id: 'l-1', command: 'navigate', value: '/login', status: 'pending' },
      { id: 'l-2', command: 'assertTitle', value: 'Sign In - Tracy Portal', status: 'pending' },
      { id: 'l-3', command: 'inputText', target: { type: 'label', value: 'Email Address' }, value: '${USER_EMAIL}', status: 'pending' },
      { id: 'l-4', command: 'inputText', target: { type: 'label', value: 'Password' }, value: '${WRONG_PASS}', status: 'pending' },
      { id: 'l-5', command: 'click', target: 'Sign In', status: 'pending' },
      { id: 'l-6', command: 'assertVisible', value: 'Invalid email or password', status: 'pending' },
      { id: 'l-7', command: 'inputText', target: { type: 'label', value: 'Password' }, value: '${CORRECT_PASS}', status: 'pending' },
      { id: 'l-8', command: 'click', target: { type: 'role', value: 'button', name: 'Remember me' }, status: 'pending' },
      { id: 'l-9', command: 'click', target: 'Sign In', status: 'pending' },
      { id: 'l-10', command: 'assertVisible', value: 'Welcome back, Alex!', status: 'pending' },
    ],
  },
  {
    id: 'responsive-navigation',
    name: 'responsive-navigation.yaml',
    path: 'flows/responsive-navigation.yaml',
    category: 'Visual',
    tags: ['responsive', 'mobile', 'ui'],
    metadata: {
      url: 'https://staging.shop.example.com',
      tags: ['responsive', 'mobile', 'ui'],
      device: 'iPhone 14',
      viewport: { width: 375, height: 812 },
    },
    yamlContent: `# Responsive Mobile Viewport Test
url: https://staging.shop.example.com
tags:
  - responsive
  - mobile
  - ui
device: iPhone 14
viewport:
  width: 375
  height: 812
---
- setViewport: "iPhone 14"
- navigate: /
- assertNotVisible:
    selector: ".desktop-navigation"
- click:
    testId: "mobile-hamburger-btn"
- assertVisible: "Categories"
- click: "Electronics"
- assertUrl: "*/category/electronics*"
- assertVisible: "Filter Products"
`,
    steps: [
      { id: 'r-1', command: 'setViewport', value: 'iPhone 14', status: 'pending' },
      { id: 'r-2', command: 'navigate', value: '/', status: 'pending' },
      { id: 'r-3', command: 'click', target: { type: 'testId', value: 'mobile-hamburger-btn' }, status: 'pending' },
      { id: 'r-4', command: 'assertVisible', value: 'Categories', status: 'pending' },
      { id: 'r-5', command: 'click', target: 'Electronics', status: 'pending' },
    ],
  },
  {
    id: 'network-mocking',
    name: 'network-mocking.yaml',
    path: 'flows/network-mocking.yaml',
    category: 'API',
    tags: ['network', 'api', 'mocking'],
    metadata: {
      url: 'https://staging.shop.example.com',
      tags: ['network', 'api', 'mocking'],
    },
    yamlContent: `# Network Route Interception & API Mocking
url: https://staging.shop.example.com
tags:
  - network
  - api
  - mocking
---
- interceptNetwork:
    url: "*/api/user-profile"
    method: GET
    response:
      status: 200
      body:
        id: "usr_99"
        name: "Mocked Test User"
        membership: "VIP Platinum"
        creditBalance: "$500.00"

- navigate: /profile
- assertVisible: "Mocked Test User"
- assertVisible: "VIP Platinum"
- assertVisible: "$500.00"
`,
    steps: [
      { id: 'n-1', command: 'interceptNetwork', value: '*/api/user-profile', status: 'pending' },
      { id: 'n-2', command: 'navigate', value: '/profile', status: 'pending' },
      { id: 'n-3', command: 'assertVisible', value: 'Mocked Test User', status: 'pending' },
      { id: 'n-4', command: 'assertVisible', value: 'VIP Platinum', status: 'pending' },
    ],
  },
];
