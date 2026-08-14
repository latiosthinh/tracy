import { describe, it, expect, beforeEach } from 'vitest';
import { useExecutionStore } from './executionStore';

function getStore() {
  return useExecutionStore.getState();
}

describe('executionStore', () => {
  beforeEach(() => {
    getStore().resetExecution();
  });

  describe('initial state', () => {
    it('starts not executing', () => {
      expect(getStore().isExecuting).toBe(false);
    });

    it('has no active step', () => {
      expect(getStore().activeStepIndex).toBe(-1);
    });

    it('has default execution speed of 600', () => {
      expect(getStore().executionSpeed).toBe(600);
    });

    it('has empty logs', () => {
      expect(getStore().executionLogs).toEqual([]);
    });

    it('has no last result', () => {
      expect(getStore().lastResult).toBeNull();
    });
  });

  describe('setExecutionSpeed', () => {
    it('updates execution speed', () => {
      getStore().setExecutionSpeed(1000);
      expect(getStore().executionSpeed).toBe(1000);
    });
  });

  describe('addLogEntry', () => {
    it('prepends a log entry', () => {
      getStore().addLogEntry({
        id: 'log-1',
        timestamp: '10:00:00',
        level: 'info',
        message: 'Test log',
      });

      const logs = getStore().executionLogs;
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Test log');
    });

    it('newest entries appear first', () => {
      getStore().addLogEntry({ id: 'log-1', timestamp: '10:00:00', level: 'info', message: 'First' });
      getStore().addLogEntry({ id: 'log-2', timestamp: '10:00:01', level: 'info', message: 'Second' });

      const logs = getStore().executionLogs;
      expect(logs[0].message).toBe('Second');
      expect(logs[1].message).toBe('First');
    });
  });

  describe('updateStepStatus', () => {
    it('updates active step index', () => {
      getStore().updateStepStatus(3, 'passed', 150);
      expect(getStore().activeStepIndex).toBe(3);
    });

    it('adds a log entry for passed steps', () => {
      getStore().updateStepStatus(0, 'passed', 100);
      const logs = getStore().executionLogs;
      expect(logs.some(l => l.message.includes('PASSED'))).toBe(true);
    });

    it('adds a log entry for failed steps', () => {
      getStore().updateStepStatus(1, 'failed', 200, 'Element not found');
      const logs = getStore().executionLogs;
      expect(logs.some(l => l.message.includes('FAILED'))).toBe(true);
      expect(logs.some(l => l.message.includes('Element not found'))).toBe(true);
    });
  });

  describe('pauseExecution', () => {
    it('sets isExecuting to false', () => {
      useExecutionStore.setState({ isExecuting: true });
      getStore().pauseExecution();
      expect(getStore().isExecuting).toBe(false);
    });
  });

  describe('resetExecution', () => {
    it('resets all execution state', () => {
      useExecutionStore.setState({
        isExecuting: true,
        activeStepIndex: 5,
        executionLogs: [{ id: '1', timestamp: '', level: 'info', message: 'test' }],
      });

      getStore().resetExecution();

      const state = getStore();
      expect(state.isExecuting).toBe(false);
      expect(state.activeStepIndex).toBe(-1);
      expect(state.executionLogs).toEqual([]);
      expect(state.lastResult).toBeNull();
    });
  });
});
