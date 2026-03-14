import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from './store';

vi.mock('axios');

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      centerNode: null,
      neighbors: [],
      user: { level: 1, current_xp: 0, next_level_xp: 100 },
      missions: [],
      isScanning: false,
      isLinking: false,
      activeNodeId: null,
    });
  });

  it('should initialize with default state', () => {
    const state = useGameStore.getState();
    expect(state.centerNode).toBeNull();
    expect(state.user.level).toBe(1);
    expect(state.isScanning).toBe(false);
  });

  it('should set active node', () => {
    const { setActiveNode } = useGameStore.getState();
    setActiveNode('test-node');
    expect(useGameStore.getState().activeNodeId).toBe('test-node');
  });

  it('should set last narrative', () => {
    const { setLastNarrative } = useGameStore.getState();
    setLastNarrative('Hello World');
    expect(useGameStore.getState().lastNarrative).toBe('Hello World');
  });
});
