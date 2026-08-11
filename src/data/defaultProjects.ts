import { Project } from '../types/autoflow';
import { DEFAULT_FLOWS } from './defaultFlows';

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-shop-staging',
    name: 'E-Commerce Storefront',
    description: 'End-to-end regression test suite for checkout, cart, product catalog, and responsive navigation.',
    targetUrl: 'https://staging.shop.example.com',
    environment: 'staging',
    tags: ['e-commerce', 'checkout', 'critical-path'],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-08',
    lastRunStatus: 'PASSED',
    lastRunTime: '10 mins ago',
    passRate: 100,
    flows: DEFAULT_FLOWS,
    config: {
      browser: 'chromium',
      headless: false,
      timeout: 10000,
      retries: 2,
    },
  },
  {
    id: 'proj-saas-portal',
    name: 'SaaS Customer Portal',
    description: 'Authentication, role-based access control, billing flow, and user profile management.',
    targetUrl: 'https://app.saasportal.dev',
    environment: 'development',
    tags: ['auth', 'billing', 'rbac'],
    createdAt: '2026-08-03',
    updatedAt: '2026-08-07',
    lastRunStatus: 'PASSED',
    lastRunTime: '2 hours ago',
    passRate: 85,
    flows: [DEFAULT_FLOWS[1], DEFAULT_FLOWS[3]], // Login & Network Mocking flows
    config: {
      browser: 'chromium',
      headless: true,
      timeout: 8000,
      retries: 1,
    },
  },
  {
    id: 'proj-local-dev',
    name: 'Local Web App Service',
    description: 'Local development environment server testing for rapid feature iteration and API contract testing.',
    targetUrl: 'http://localhost:3000',
    environment: 'local',
    tags: ['local-dev', 'api', 'fast-feedback'],
    createdAt: '2026-08-05',
    updatedAt: '2026-08-08',
    lastRunStatus: 'NEVER_RUN',
    lastRunTime: 'Never',
    passRate: 0,
    flows: [DEFAULT_FLOWS[2]], // Responsive flow
    config: {
      browser: 'chromium',
      headless: false,
      timeout: 5000,
      retries: 0,
    },
  },
];
