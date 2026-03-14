import { create } from 'zustand';
import { apiClient } from '../services/apiClient';
import { getInitialUiLang, persistUiLang, type UiLang } from '../i18n';

type LinkStreamMeta = {
  type: 'meta';
  status: string;
  xp_gained: number;
  total_xp: number;
  level: number;
};

type LinkStreamDelta = { type: 'delta'; delta: string };

type LinkStreamResult = {
  type: 'result';
  status: string;
  narrative: string;
  xp_gained: number;
  total_xp: number;
  level: number;
};

type LinkStreamEvent = LinkStreamMeta | LinkStreamDelta | LinkStreamResult;

async function postSSE<TBody>(
  path: string,
  body: TBody,
  onEvent: (event: LinkStreamEvent) => void,
) {
  const baseURL = apiClient.defaults.baseURL || '';
  const url = new URL(path, baseURL).toString();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`SSE request failed: ${res.status}`);
  }
  if (!res.body) {
    throw new Error('SSE response body missing');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const sepIndex = buffer.indexOf('\n\n');
      if (sepIndex === -1) break;

      const raw = buffer.slice(0, sepIndex);
      buffer = buffer.slice(sepIndex + 2);

      const lines = raw.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        onEvent(JSON.parse(data) as LinkStreamEvent);
      }
    }
  }
}

// --- 1. 类型定义 ---
export interface GalaxyNode {
  id: string;
  content: string;
  mastery_level: number;
  is_mission_target: boolean;
  is_reviewed_today:boolean;
  position: [number, number, number]; 
  relation?: string;
  is_linked?: boolean;
  narrative?: string;
  note?: string;
  hasUnseenLog?: boolean;
}

interface UserProfile {
  level: number;
  current_xp: number;
  next_level_xp: number;
}
export interface MissionTarget {
    word: string;
    reviewed: boolean;
}

export interface Mission {
  id: number;
  type: string;
  status: string;
  xp_reward: number;
  target_words: string[];
  targets: MissionTarget[]; // 🔥 新字段
}

export interface BookInfo {
  name: string;
  total: number;
}

export type AgentState = 'idle' | 'listening' | 'observing' | 'synthesizing' | 'speaking';

interface GameState {
  centerNode: GalaxyNode | null;
  neighbors: GalaxyNode[];
  user: UserProfile;
  missions: Mission[];
  uiLang: UiLang;
  isWorldReady: boolean;
  isWorldBooting: boolean;
  
  // 状态标志
  isScanning: boolean;
  isLinking: boolean;
  agentState: AgentState;
  scanResult: any;
  activeNodeId: string | null;
  lastNarrative: string | null;
  hoveredNodeId: string | null; // 当前悬停的节点ID
  availableBooks: BookInfo[];
  currentBook: string | null;
  bookProgress: number;

  // 动作
  fetchBooks: () => Promise<void>;
  setBook: (bookName: string) => Promise<void>;
  requestExtraMission: () => Promise<void>;
  initWorld: () => Promise<void>;
  setUiLang: (lang: UiLang) => void;
  // 🔥 更新：支持 definition 参数
  saveNote: (note: string) => Promise<void>;
  jumpTo: (word: string, targetPos?: [number, number, number], definition?: string) => Promise<void>;
  fetchMissions: () => Promise<void>;
  addNode: (word: string) => Promise<void>;
  setActiveNode: (id: string | null) => void;
  establishLink: (targetId: string, type: string, action?: 'toggle' | 'regenerate' | 'delete') => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  setLastNarrative: (text: string | null) => void;
  performDeepScan: () => Promise<void>;
  // 添加这一行
  deleteCurrentNode: () => Promise<void>;
  analyzeVision: (imageB64: string, text?: string) => Promise<void>;
  agentChat: (text: string) => Promise<void>;
  setAgentState: (state: AgentState) => void;
  setHoveredNodeId: (id: string | null) => void;
  completeMission: (word: string, analysis?: string) => Promise<void>; 
  cancelMission: (missionId: number) => Promise<void>;
  showNarrative: (targetId: string) => Promise<void>; 
}

const ORBIT_RADIUS = 18; 

const createUISlice = (set: any) => ({
  setLastNarrative: (text: string | null) => set({ lastNarrative: text }),
  setActiveNode: (id: string | null) => set({ activeNodeId: id }),
  setHoveredNodeId: (id: string | null) => set({ hoveredNodeId: id }),
  setAgentState: (state: AgentState) => set({ agentState: state }),
  setUiLang: (lang: UiLang) => {
    persistUiLang(lang);
    set({ uiLang: lang });
  },
  agentChat: async (text: string) => {
     set({ agentState: 'synthesizing' });
     try {
       const res = await apiClient.post('/agent/chat', { text });
       set({ lastNarrative: res.data.response, agentState: 'speaking' });
       setTimeout(() => set({ agentState: 'idle' }), 3000);
     } catch (e) {
      console.error('Agent chat failed', e);
      const detail = (e as any)?.response?.data?.detail;
      set({ agentState: 'idle', lastNarrative: detail || '对话失败，请检查网络或后端日志。' });
    }
  },
});

const createMissionSlice = (set: any, get: any) => ({
  cancelMission: async (missionId: number) => {
    if (!window.confirm('TERMINATE THIS MISSION? 所有进度将丢失。')) return;

    try {
      await apiClient.delete(`/missions/${missionId}`);
      await get().fetchMissions();
    } catch (e) {
      console.error('Failed to abort mission', e);
    }
  },
  requestExtraMission: async () => {
    try {
      await apiClient.post('/missions/add_extra');
      await get().fetchMissions();
    } catch (e) {
      console.error('Extra mission failed', e);
    }
  },
  completeMission: async (word: string, analysis?: string) => {
    const { centerNode } = get();
    if (!centerNode) return;

    set({ isLinking: true });

    try {
      const res = await apiClient.post('/mission/complete_word', {
        word_id: word,
        analysis: analysis || '',
      });

      if (res.data.status === 'reviewed') {
        const ai_analysis = res.data.analysis;

        await get().fetchMissions();

        set({
          centerNode: {
            ...centerNode,
            is_reviewed_today: true,
            note: ai_analysis,
          },
          lastNarrative: ai_analysis,
        });

        const userRes = await apiClient.get('/user/profile');
        set({ user: userRes.data });
      }
    } catch (e) {
      console.error('Mission completion failed:', e);
    } finally {
      set({ isLinking: false });
    }
  },
  fetchMissions: async () => {
    try {
      const res = await apiClient.get('/missions/daily');
      set({ missions: res.data });
    } catch (e) {
      console.error(e);
    }
  },
});

const createUserSlice = (set: any, get: any) => ({
  fetchBooks: async () => {
    const res = await apiClient.get('/books/list');
    const userRes = await apiClient.get('/user/profile');
    set({
      availableBooks: res.data,
      currentBook: userRes.data.current_book,
      bookProgress: userRes.data.book_progress_index,
    });
  },
  setBook: async (bookName: string) => {
    await apiClient.post(`/user/set_book`, null, { params: { book_name: bookName } });
    set({ currentBook: bookName });
    await get().fetchMissions();
  },
});

const createGraphSlice = (set: any, get: any) => ({
  initWorld: async () => {
    if (get().isWorldReady || get().isWorldBooting) return;
    set({ isWorldBooting: true });

    try {
      await get().jumpTo('Strand', [0, 0, 0]);

      try {
        await apiClient.post('/missions/generate');
      } catch (e) {
        console.warn('[Mission] Failed to generate missions:', e);
      }

      await get().fetchMissions();
      set({ isWorldReady: true });
    } finally {
      set({ isWorldBooting: false });
    }
  },
  jumpTo: async (word: string, targetPos?: [number, number, number], definition?: string) => {
    if (!word) return;
    set({ isScanning: true });

    let currentPos = targetPos;
    if (!currentPos) {
      const existingNode = get().neighbors.find((n: any) => n.id === word);

      if (existingNode) {
        currentPos = existingNode.position;
      } else {
        const JUMP_RADIUS = 40;
        const MAP_BOUNDARY = 120;

        const prevPos = get().centerNode?.position || [0, 0, 0];
        const angle = Math.random() * Math.PI * 2;

        let nextX = prevPos[0] + JUMP_RADIUS * Math.cos(angle);
        let nextZ = prevPos[2] + JUMP_RADIUS * Math.sin(angle);

        const distFromOrigin = Math.sqrt(nextX ** 2 + nextZ ** 2);
        if (distFromOrigin > MAP_BOUNDARY) {
          const resetRadius = 30 + Math.random() * 20;
          nextX = resetRadius * Math.cos(angle);
          nextZ = resetRadius * Math.sin(angle);
        }

        currentPos = [nextX, 0, nextZ];
      }
    }

    try {
      const [graphRes, userRes] = await Promise.all([
        apiClient.post('/graph/context', { word, definition }),
        apiClient.get('/user/profile'),
      ]);

      const { center, neighbors } = graphRes.data;

      if (!center) {
        set({ isScanning: false });
        return;
      }

      const layoutNeighbors = neighbors.map((n: any, index: number) => {
        const [rx, , rz] = n.position || [
          ORBIT_RADIUS * Math.cos((index / neighbors.length) * Math.PI * 2),
          0,
          ORBIT_RADIUS * Math.sin((index / neighbors.length) * Math.PI * 2),
        ];

        return {
          ...n,
          position: [currentPos![0] + rx, 0, currentPos![2] + rz],
        };
      });

      set({
        centerNode: { ...center, position: currentPos },
        neighbors: layoutNeighbors,
        user: userRes.data,
        isScanning: false,
        lastNarrative: null,
        activeNodeId: word,
      });
    } catch (error) {
      console.error('Jump failed:', error);
      set({ isScanning: false });
    }
  },
  addNode: async (word: string) => {
    await get().jumpTo(word);
  },
  establishLink: async (targetId: string, type: string, action = 'toggle') => {
    const { centerNode, neighbors } = get();
    if (!centerNode) return;

    set({ isLinking: true });

    try {
      const payload = {
        source_id: centerNode.id,
        target_id: targetId,
        type: type,
        action: action,
      };

      let streamed = '';
      let result: LinkStreamResult | null = null;

      set({ lastNarrative: null });

      try {
        await postSSE('/link/stream', payload, (event) => {
          if (event.type === 'delta') {
            streamed += event.delta;
            set({ lastNarrative: streamed });
          } else if (event.type === 'result') {
            result = event;
          }
        });
      } catch {
        const res = await apiClient.post('/link', payload);
        result = {
          type: 'result',
          status: res.data.status,
          narrative: res.data.narrative,
          xp_gained: res.data.xp_gained ?? 0,
          total_xp: res.data.total_xp,
          level: res.data.level,
        };
      }

      if (!result) {
        throw new Error('Link stream finished without result');
      }

      const { status, narrative, total_xp, level } = result;

      const newNeighbors = neighbors.map((n: any) => {
        if (n.id === targetId) {
          const isNewlyCreated = status === 'created';
          const isUpdated = status === 'updated';
          const isDeleted = status === 'deleted';

          return {
            ...n,
            is_linked: isNewlyCreated || isUpdated || status === 'exists',
            narrative: isDeleted ? undefined : narrative,
            hasUnseenLog: isDeleted ? false : isNewlyCreated || isUpdated,
          };
        }
        return n;
      });

      set({
        neighbors: newNeighbors,
        lastNarrative: status === 'created' ? narrative : get().lastNarrative,
        user: { ...get().user, current_xp: total_xp, level },
      });

      if (status === 'created') {
        set((state: any) => ({
          neighbors: state.neighbors.map((n: any) =>
            n.id === targetId ? { ...n, hasUnseenLog: false } : n,
          ),
        }));
      }
    } catch (e) {
      console.error('[Store] Link protocol failed:', e);
    } finally {
      set({ isLinking: false });
    }
  },
  showNarrative: async (targetId: string) => {
    const { neighbors, establishLink } = get();

    const targetNode = neighbors.find((n: any) => n.id === targetId);

    if (targetNode) {
      if (targetNode.is_linked && !targetNode.narrative) {
        await establishLink(targetId, targetNode.relation || 'auto', 'toggle');
        return;
      }

      if (targetNode.narrative) {
        set({ lastNarrative: null });

        setTimeout(() => {
          set({ lastNarrative: targetNode.narrative });
        }, 10);

        set((state: any) => ({
          neighbors: state.neighbors.map((n: any) =>
            n.id === targetId ? { ...n, hasUnseenLog: false } : n,
          ),
        }));
      }
    }
  },
  performDeepScan: async () => {
    const { centerNode } = get();
    if (!centerNode) return;
    const word = centerNode.id;

    set({ isScanning: true });

    try {
      await apiClient.post('/node/deep_scan', { word });

      let attempts = 0;
      const maxAttempts = 8;

      const interval = setInterval(async () => {
        attempts++;

        const res = await apiClient.post('/graph/context', { word });
        const { neighbors } = res.data;

        const currentNeighbors = get().neighbors;

        const currentPos = get().centerNode!.position;
        const layoutNeighbors = neighbors.map((n: any, index: number) => {
          const total = neighbors.length;
          const angle = (index / total) * Math.PI * 2;
          return {
            ...n,
            position: [currentPos[0] + 18 * Math.cos(angle), 0, currentPos[2] + 18 * Math.sin(angle)],
          };
        });

        set({ neighbors: layoutNeighbors });

        if (neighbors.length > currentNeighbors.length || attempts >= maxAttempts) {
          if (attempts >= maxAttempts) {
            set({ isScanning: false });
            clearInterval(interval);
          }
        }
      }, 2000);
    } catch (e) {
      console.error('Deep scan trigger failed', e);
      set({ isScanning: false });
    }
  },
  deleteCurrentNode: async () => {
    const { centerNode } = get();
    if (!centerNode) return;

    if (
      !window.confirm(
        `WARNING: Initiate Voidout for "${centerNode.id}"?\n此操作不可逆，将永久删除该节点及所有连接。`,
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(`/node/${centerNode.id}`);
      await get().jumpTo('fernweh');
    } catch (e) {
      console.error('Voidout failed:', e);
      alert('销毁失败，数据残留。');
    }
  },
  analyzeVision: async (imageB64: string, text?: string) => {
    set({ isScanning: true });
    try {
      const res = await apiClient.post('/agent/vision_analyze', {
        image_base64: imageB64,
        text,
      });
      const { summary, suggestions } = res.data;
      const narrative = `${summary}\n\n建议:\n${suggestions.map((s: string) => `- ${s}`).join('\n')}`;
      set({ lastNarrative: narrative, isScanning: false });
    } catch (e) {
      console.error('Vision analysis failed', e);
      const detail = (e as any)?.response?.data?.detail;
      set({ isScanning: false, lastNarrative: detail || "视觉分析失败，请检查网络或配置。" });
    }
  },
});

const createKnowledgeSlice = (set: any, get: any) => ({
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      set({ agentState: 'synthesizing' });
      const res = await apiClient.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const msg =
        res?.data?.status === 'success'
          ? `上传成功：${file.name}`
          : `上传完成：${file.name}`;
      set({ lastNarrative: msg, agentState: 'speaking' });
      setTimeout(() => set({ agentState: 'idle' }), 2500);
    } catch (e) {
      console.error(e);
      set({ lastNarrative: '上传失败，请检查网络或后端日志。', agentState: 'idle' });
    }
  },
  saveNote: async (noteContent: string) => {
    const { centerNode } = get();

    if (!centerNode) {
      console.warn('[Store] No active node to attach note.');
      return;
    }

    try {
      const res = await apiClient.post('/node/note', {
        word_id: centerNode.id,
        note_content: noteContent,
      });

      if (res.data.status === 'success') {
        set((state: any) => ({
          centerNode: state.centerNode ? { ...state.centerNode, note: noteContent } : null,
        }));
      }
    } catch (e) {
      console.error('[Store] Failed to save note:', e);
    }
  },
});

const initialState = {
  centerNode: null,
  neighbors: [],
  user: { level: 1, current_xp: 0, next_level_xp: 100 },
  missions: [],
  uiLang: getInitialUiLang(),
  isWorldReady: false,
  isWorldBooting: false,
  isScanning: false,
  isLinking: false,
  agentState: 'idle' as AgentState,
  scanResult: null,
  activeNodeId: null,
  lastNarrative: null,
  hoveredNodeId: null,
  availableBooks: [],
  currentBook: null,
  bookProgress: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...initialState,
  ...createUISlice(set),
  ...createMissionSlice(set, get),
  ...createUserSlice(set, get),
  ...createGraphSlice(set, get),
  ...createKnowledgeSlice(set, get),
}));
