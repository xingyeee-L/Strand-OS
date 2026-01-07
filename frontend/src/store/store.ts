import { create } from 'zustand';
import axios from 'axios';

// --- 1. 类型定义 ---
export interface GalaxyNode {
  id: string;
  content: string;
  mastery_level: number;
  is_mission_target: boolean;
  position: [number, number, number]; 
  relation?: string;
  is_linked?: boolean;
  narrative?: string;
  note?: string;
}

interface UserProfile {
  level: number;
  current_xp: number;
  next_level_xp: number;
}

export interface Mission {
  id: number;
  type: string;
  status: string;
  xp_reward: number;
  target_words: string[];
}

interface GameState {
  centerNode: GalaxyNode | null;
  neighbors: GalaxyNode[];
  user: UserProfile;
  missions: Mission[];
  
  // 状态标志
  isScanning: boolean;
  isLinking: boolean;
  scanResult: any;
  activeNodeId: string | null;
  lastNarrative: string | null;

  // 动作
  initWorld: () => Promise<void>;
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
  
}

const ORBIT_RADIUS = 18; 

// --- 2. 状态实现 ---

export const useGameStore = create<GameState>((set, get) => ({
  centerNode: null,
  neighbors: [],
  user: { level: 1, current_xp: 0, next_level_xp: 100 },
  missions: [],
  isScanning: false,
  isLinking: false,
  scanResult: null,
  activeNodeId: null,
  lastNarrative: null,

  setLastNarrative: (text) => set({ lastNarrative: text }),
  setActiveNode: (id) => set({ activeNodeId: id }),

  initWorld: async () => {
    await get().jumpTo("fernweh", [0, 0, 0]);
    await get().fetchMissions();
  },

  // 🔥 [核心引擎] 星系跳跃 & 节点创建
  jumpTo: async (word: string, targetPos?: [number, number, number], definition?: string) => {
    if (!word) return;
    set({ isScanning: true });
    
    // A. 坐标计算
    let currentPos = targetPos;
    if (!currentPos) {
        const existingNode = get().neighbors.find(n => n.id === word);
        currentPos = existingNode ? existingNode.position : [
            (get().centerNode?.position[0] || 0) + 10, 
            0, 
            (get().centerNode?.position[2] || 0) + 10
        ];
    }

    try {
      console.log("[Store] Jumping to:", word); // 日志 A
      const [graphRes, userRes] = await Promise.all([
        axios.post('http://127.0.0.1:8000/graph/context', { word, definition }),
        axios.get('http://127.0.0.1:8000/user/profile')
      ]);

      console.log("[Store] Data received:", graphRes.data); // 日志 B

      const { center, neighbors } = graphRes.data;
      
      // 检查 center 是否存在
      if (!center) {
          console.error("[Store] Center node is missing in response!");
          set({ isScanning: false });
          return;
      }

      // C. 布局计算
      const layoutNeighbors = neighbors.map((n: any, index: number) => {
        const total = neighbors.length;
        const angle = (index / total) * Math.PI * 2;
        
        return {
          ...n,
          position: [
            currentPos![0] + ORBIT_RADIUS * Math.cos(angle),
            0, 
            currentPos![2] + ORBIT_RADIUS * Math.sin(angle)
          ]
        };
      });

      // D. 更新状态
      set({ 
        centerNode: { ...center, position: currentPos }, 
        neighbors: layoutNeighbors,
        user: userRes.data,
        isScanning: false,
        lastNarrative: null,
        activeNodeId: word
      });
      
    } catch (error) {
      console.error("Jump failed:", error);
      set({ isScanning: false });
    }
  },

  // ✅ [恢复] 任务获取
  fetchMissions: async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/missions/daily');
      set({ missions: res.data });
    } catch (e) { console.error(e); }
  },

  // ✅ [恢复] 兼容层：addNode 直接调用 jumpTo
  addNode: async (word: string) => {
    // 现在的 jumpTo 已经足够智能，可以处理新词创建
    await get().jumpTo(word);
  },

  establishLink: async (targetId: string, type: string, action = 'toggle') => {
    const { centerNode, neighbors } = get();
    if (!centerNode) return;

    set({ isLinking: true });

    try {
      const res = await axios.post('http://127.0.0.1:8000/link', {
        source_id: centerNode.id,
        target_id: targetId,
        type: type,
        action: action 
      });
      
      const { status, narrative, total_xp, level } = res.data;
      
      const newNeighbors = neighbors.map(n => {
          if (n.id === targetId) {
              let isLinked = n.is_linked;
              let currentNarrative = n.narrative;

              if (status === 'created' || status === 'updated') {
                  isLinked = true;
                  currentNarrative = narrative;
              } else if (status === 'deleted') {
                  isLinked = false;
                  currentNarrative = undefined;
              }

              return { 
                  ...n, 
                  is_linked: isLinked, 
                  narrative: currentNarrative 
              };
          }
          return n;
      });

      set({ 
        neighbors: newNeighbors,
        lastNarrative: status === 'deleted' ? null : narrative,
        user: { ...get().user, current_xp: total_xp, level }
      });
      
    } catch (e) { 
      console.error(e); 
    } finally {
      set({ isLinking: false });
    }
  },
  // ... 在 useGameStore 的实现中 ...

  performDeepScan: async () => {
    const { centerNode } = get();
    if (!centerNode) return;
    const word = centerNode.id;

    set({ isScanning: true }); // 开始动画

    try {
        // 1. 触发后台任务 (立刻返回)
        await axios.post('http://127.0.0.1:8000/node/deep_scan', { word });
        
        // 2. 开启轮询 (Polling)
        // 每 2 秒查一次，看看有没有新邻居出来，持续 15 秒
        let attempts = 0;
        const maxAttempts = 8; // 16秒后停止
        
        const interval = setInterval(async () => {
            attempts++;
            
            // 调用 graph/context 获取最新数据 (这时应该能读到后台存入 DB 的新连接了)
            const res = await axios.post('http://127.0.0.1:8000/graph/context', { word });
            const { neighbors } = res.data;
            
            // 比较邻居数量，如果有变化，说明后台任务有产出
            const currentNeighbors = get().neighbors;
            
            // 更新状态 (无论有没有变，刷新一下总是好的，万一有新连接呢)
            // 重新计算布局
            const currentPos = get().centerNode!.position;
            const layoutNeighbors = neighbors.map((n: any, index: number) => {
                const total = neighbors.length;
                const angle = (index / total) * Math.PI * 2;
                return {
                    ...n,
                    position: [
                        currentPos[0] + 18 * Math.cos(angle),
                        0, 
                        currentPos[2] + 18 * Math.sin(angle)
                    ]
                };
            });
            
            set({ neighbors: layoutNeighbors });

            // 如果发现新邻居变多了，或者超时了，停止轮询
            if (neighbors.length > currentNeighbors.length || attempts >= maxAttempts) {
                if (attempts >= maxAttempts) {
                    set({ isScanning: false }); // 停止动画
                    clearInterval(interval);
                } else {
                    // 如果发现了新东西，可以继续扫一会儿，或者停止
                    // 这里选择继续扫，直到超时，保证所有结果都出来
                }
            }
        }, 2000);

    } catch (e) {
        console.error("Deep scan trigger failed", e);
        set({ isScanning: false });
    }
  },
  // 在 return 对象中实现:
deleteCurrentNode: async () => {
    const { centerNode } = get();
    if (!centerNode) return;
    
    // 二次确认 (防止手滑)
    if (!window.confirm(`WARNING: Initiate Voidout for "${centerNode.id}"?\n此操作不可逆，将永久删除该节点及所有连接。`)) {
        return;
    }

    try {
        // 1. 调用后端焚化接口
        await axios.delete(`http://127.0.0.1:8000/node/${centerNode.id}`);
        
        // 2. 紧急折跃到安全屋 (Fernweh)
        // 你也可以改成跳回上一个节点，这里为了简单直接回主城
        await get().jumpTo("fernweh");
        
    } catch (e) {
        console.error("Voidout failed:", e);
        alert("销毁失败，数据残留。");
    }
},

  uploadFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    try { 
        await axios.post('http://127.0.0.1:8000/knowledge/upload', formData, { 
            headers: { 'Content-Type': 'multipart/form-data' } 
        }); 
    } catch (e) { console.error(e); }
  },
  // 🔥 [核心实现] 战术笔记持久化
  saveNote: async (noteContent: string) => {
    const { centerNode } = get();
    
    // 1. 熔断检查：如果没有目标，无法记录
    if (!centerNode) {
      console.warn("[Store] No active node to attach note.");
      return;
    }

    try {
      // 2. 发送上行链路数据
      // 对应后端 NoteRequest 模型: { word_id, note_content }
      const res = await axios.post('http://127.0.0.1:8000/node/note', {
        word_id: centerNode.id,
        note_content: noteContent
      });

      if (res.data.status === "success") {
        // 3. 同步本地状态
        // 我们在本地也更新一下 centerNode 的 note 属性，确保 UI 立即响应
        set((state) => ({
          centerNode: state.centerNode ? { 
            ...state.centerNode, 
            note: noteContent 
          } : null
        }));
        
        console.log(`[SYSTEM] Note for ${centerNode.id} synchronized.`);
      }
    } catch (e) {
      console.error("[Store] Failed to save note:", e);
      // 这里可以预留一个全局错误提示状态
    }
  }
}));