import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaywrightExportModal } from './PlaywrightExportModal';
import type { FlowFile } from '@/src/types/flow';

const mockFlow: FlowFile = {
  id: 'test-flow',
  name: 'login-test.yaml',
  path: 'flows/login-test.yaml',
  tags: ['smoke'],
  metadata: { url: 'https://example.com' },
  yamlContent: 'url: https://example.com\n---\n- navigate: /login',
  steps: [
    { id: 's1', command: 'navigate', value: '/login', status: 'pending' },
    { id: 's2', command: 'assertTitle', value: 'Sign In', status: 'pending' },
  ],
};

describe('PlaywrightExportModal', () => {
  it('renders generated Playwright TypeScript code', () => {
    render(
      <PlaywrightExportModal
        isOpen={true}
        onClose={vi.fn()}
        flow={mockFlow}
        targetUrl="https://example.com"
      />
    );

    expect(screen.getByText(/Export Playwright TypeScript Spec/i)).toBeInTheDocument();
    expect(screen.getByText(/await page\.goto\('https:\/\/example\.com\/login'\);/)).toBeInTheDocument();
    expect(screen.getByText(/await expect\(page\)\.toHaveTitle\(\/Sign In\/\);/)).toBeInTheDocument();
  });

  it('handles copy button click and shows copied state', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <PlaywrightExportModal
        isOpen={true}
        onClose={vi.fn()}
        flow={mockFlow}
        targetUrl="https://example.com"
      />
    );

    const copyBtn = screen.getByText(/Copy/i);
    await fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Copied Playwright Code!/i)).toBeInTheDocument();
  });

  it('triggers download with .spec.ts extension', () => {
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/fake-url');
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    render(
      <PlaywrightExportModal
        isOpen={true}
        onClose={vi.fn()}
        flow={mockFlow}
        targetUrl="https://example.com"
      />
    );

    const downloadBtn = screen.getByText(/Download \.spec\.ts/i);
    fireEvent.click(downloadBtn);

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
  });
});
