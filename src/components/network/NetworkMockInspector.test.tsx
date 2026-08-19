import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NetworkMockInspector } from './NetworkMockInspector';
import { MockRuleEditorModal } from './MockRuleEditorModal';
import { RequestWaterfallView } from './RequestWaterfallView';
import { useNetworkStore } from '@/src/stores/networkStore';

describe('Network Mock Inspector & Request Waterfall Components', () => {
  beforeEach(() => {
    useNetworkStore.setState({
      rules: [],
      requests: [],
      isInterceptionActive: true,
      filterText: '',
      selectedMethod: 'ALL',
      selectedRuleId: null,
      selectedRequestId: null,
      isHarModalOpen: false,
    });
  });

  it('renders active interception toggle, Add Mock Rule button, and mock rules table', () => {
    render(<NetworkMockInspector />);

    expect(screen.getByText('Network Mock & Traffic Waterfall')).toBeInTheDocument();
    expect(screen.getByText('Active Interception')).toBeInTheDocument();
    expect(screen.getByText('Add Mock Rule')).toBeInTheDocument();
    expect(screen.getByText('No mock rules configured.')).toBeInTheDocument();
  });

  it('opens MockRuleEditorModal and validates input before saving', () => {
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    const { rerender } = render(
      <MockRuleEditorModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
      />
    );

    expect(screen.getByText('Add Mock Rule')).toBeInTheDocument();

    // Click Save without filling fields -> error
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('Rule name is required.')).toBeInTheDocument();
    expect(handleSave).not.toHaveBeenCalled();

    // Fill rule name
    fireEvent.change(screen.getByLabelText(/Rule Name/i), { target: { value: 'Mock User' } });
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('URL pattern is required.')).toBeInTheDocument();

    // Fill pattern and save
    fireEvent.change(screen.getByLabelText(/URL Pattern/i), { target: { value: '**/api/v1/users' } });
    fireEvent.click(screen.getByText('Save'));

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Mock User',
      url: '**/api/v1/users',
      patternType: 'glob',
      method: 'ALL',
      status: 200,
    }));
  });

  it('renders RequestWaterfallView with captured HTTP requests and filters them', () => {
    useNetworkStore.setState({
      requests: [
        {
          id: 'req-1',
          url: 'https://api.acme.com/v1/items',
          method: 'GET',
          status: 200,
          durationMs: 45,
          timestamp: Date.now(),
          fromMock: false,
        },
        {
          id: 'req-2',
          url: 'https://api.acme.com/v1/checkout',
          method: 'POST',
          status: 500,
          durationMs: 120,
          timestamp: Date.now(),
          fromMock: true,
        },
      ],
    });

    render(<RequestWaterfallView />);

    expect(screen.getByText('https://api.acme.com/v1/items')).toBeInTheDocument();
    expect(screen.getByText('https://api.acme.com/v1/checkout')).toBeInTheDocument();
    expect(screen.getByText('Mocked Response')).toBeInTheDocument();

    // Search filter
    const searchInput = screen.getByPlaceholderText(/Filter URLs/i);
    fireEvent.change(searchInput, { target: { value: 'checkout' } });

    expect(screen.queryByText('https://api.acme.com/v1/items')).not.toBeInTheDocument();
    expect(screen.getByText('https://api.acme.com/v1/checkout')).toBeInTheDocument();
  });

  it('selects request to inspect headers and response body', () => {
    useNetworkStore.setState({
      requests: [
        {
          id: 'req-inspect-1',
          url: 'https://api.acme.com/v1/profile',
          method: 'GET',
          status: 200,
          durationMs: 30,
          timestamp: Date.now(),
          requestHeaders: { authorization: 'Bearer test-token' },
          responseBody: '{"id": 42, "name": "Alice"}',
        },
      ],
      selectedRequestId: 'req-inspect-1',
    });

    render(<RequestWaterfallView />);

    expect(screen.getByText('Request Headers')).toBeInTheDocument();
    expect(screen.getByText('Bearer test-token')).toBeInTheDocument();
    expect(screen.getByText('{"id": 42, "name": "Alice"}')).toBeInTheDocument();
  });

  it('toggles rule status and removes rule in NetworkMockInspector', () => {
    useNetworkStore.setState({
      rules: [
        {
          id: 'rule-test-1',
          name: 'Intercept Billing',
          url: '**/billing',
          patternType: 'glob',
          method: 'POST',
          status: 200,
          enabled: true,
        },
      ],
    });

    render(<NetworkMockInspector />);

    expect(screen.getByText('Intercept Billing')).toBeInTheDocument();

    const checkbox = screen.getByLabelText('Enabled Intercept Billing');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(useNetworkStore.getState().rules[0].enabled).toBe(false);

    const deleteBtn = screen.getByLabelText('Delete');
    fireEvent.click(deleteBtn);
    expect(useNetworkStore.getState().rules).toHaveLength(0);
  });
});
