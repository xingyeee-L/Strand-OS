import { create } from 'zustand';
import axios from 'axios';

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
  hoveredNodeId: string | null; // 当前悬停的节点ID
  availableBooks: string[];
  currentBook: string | null;
  bookProgress: number;

  // 动作
  fetchBooks: () => Promise<void>;
  setBook: (bookName: string) => Promise<void>;
  requestExtraMission: () => Promise<void>;
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
  setHoveredNodeId: (id: string | null) => void;
  completeMission: (word: string, analysis?: string) => Promise<void>; 
  cancelMission: (missionId: number) => Promise<void>;
  showNarrative: (targetId: string) => void; 
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
  hoveredNodeId: null,
  availableBooks: [],
  currentBook: null,
  bookProgress: 0,

  setLastNarrative: (text) => set({ lastNarrative: text }),
  setActiveNode: (id) => set({ activeNodeId: id }),
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),
  // 在 useGameStore 实现中：
  cancelMission: async (missionId: number) => {
    // 战术建议：增加一个简单的确认，防止手滑
    if (!window.confirm("TERMINATE THIS MISSION? 所有进度将丢失。")) return;

    try {
        await axios.delete(`http://127.0.0.1:8000/missions/${missionId}`);
        // 刷新列表
        await get().fetchMissions();
        console.log(`[Mission] Protocol ${missionId} terminated.`);
    } catch (e) {
        console.error("Failed to abort mission", e);
    }
  },
  fetchBooks: async () => {
    const res = await axios.get('http://127.0.0.1:8000/books/list');
    const userRes = await axios.get('http://127.0.0.1:8000/user/profile');
    set({ 
        availableBooks: res.data,
        currentBook: userRes.data.current_book,
        bookProgress: userRes.data.book_progress_index
    });
  },

  setBook: async (bookName) => {
    await axios.post(`http://127.0.0.1:8000/user/set_book?book_name=${bookName}`);
    set({ currentBook: bookName });
    await get().fetchMissions();
  },
  requestExtraMission: async () => {
    try {
        await axios.post('http://127.0.0.1:8000/missions/add_extra');
        await get().fetchMissions(); // 刷新列表
    } catch (e) {
        console.error("Extra mission failed", e);
    }
},
completeMission: async (word: string, analysis?: string) => {
    const { centerNode } = get();
    if (!centerNode) return;

    // 🔥 [关键修复 1]：激活刻录状态，触发 UI 显示“正在刻录...”
    set({ isLinking: true });

    try {
        const res = await axios.post('http://127.0.0.1:8000/mission/complete_word', { 
            word_id: word, 
            analysis: analysis || "" 
        });
        
        if (res.data.status === 'reviewed') {
            const ai_analysis = res.data.analysis; // 获取 AI 生成的分析

            // 1. 刷新任务列表
            await get().fetchMissions();
            
            // 2. 🔥 [关键修复 2]：将 AI 分析结果直接推送到对话框
            set({ 
                centerNode: { 
                    ...centerNode, 
                    is_reviewed_today: true,
                    note: ai_analysis 
                },
                lastNarrative: ai_analysis // 确保结果呈现到屏幕
            });
            
            // 3. 刷新用户状态
            const userRes = await axios.get('http://127.0.0.1:8000/user/profile');
            set({ user: userRes.data });
        }
    } catch (e) {
        console.error("Mission completion failed:", e);
    } finally {
        // 🔥 [关键修复 3]：无论成功失败，结束刻录状态
        set({ isLinking: false });
    }
  },
  initWorld: async () => {
    // 1. 初始化位置
    await get().jumpTo("Strand", [0, 0, 0]);
    
    // 2. 🔥 [新增] 触发每日任务生成 (后端会自己判断今天是否已生成)
    try {
        await axios.post('http://127.0.0.1:8000/missions/generate');
        console.log("[Mission] Daily missions check completed.");
    } catch (e) {
        console.warn("[Mission] Failed to generate missions:", e);
    }

    // 3. 拉取最新任务列表
    await get().fetchMissions();
  },

// 🔥 [核心引擎] 星系跳跃 & 节点创建
  jumpTo: async (word: string, targetPos?: [number, number, number], definition?: string) => {
    if (!word) return;
    set({ isScanning: true });
    
     // A. 坐标计算逻辑升级
    let currentPos = targetPos;
    if (!currentPos) {
        const existingNode = get().neighbors.find(n => n.id === word);
        
        if (existingNode) {
            currentPos = existingNode.position;
        } else {
            // --- 🔥 [战术重构：环形折跃] ---
            const JUMP_RADIUS = 40; // 每次跳跃的固定跨度
            const MAP_BOUNDARY = 120; // 这里的边界必须小于 Terrain.tsx 里的 500
            
            const prevPos = get().centerNode?.position || [0, 0, 0];
            
            // 1. 生成随机角度 (0 ~ 360度)
            const angle = Math.random() * Math.PI * 2;
            
            // 2. 计算候选新坐标
            let nextX = prevPos[0] + JUMP_RADIUS * Math.cos(angle);
            let nextZ = prevPos[2] + JUMP_RADIUS * Math.sin(angle);
            
            // 3. 边界引力检查 (Boundary Gravity Check)
            // 如果新点离中心 (0,0,0) 太远，将其拉回原点附近的随机环带
            const distFromOrigin = Math.sqrt(nextX ** 2 + nextZ ** 2);
            if (distFromOrigin > MAP_BOUNDARY) {
                console.log("⚠️ [SYSTEM] 接近手性边界，执行引力回航...");
                // 强制将新坐标设定在离原点 30-50 米的随机环带内
                const resetRadius = 30 + Math.random() * 20;
                nextX = resetRadius * Math.cos(angle);
                nextZ = resetRadius * Math.sin(angle);
            }
            
            currentPos = [nextX, 0, nextZ];
        }
    }

    try {
      console.log("[Store] Jumping to:", word);

      // B. 并行请求：获取星系数据 & 用户状态
      // 传递 definition 确保新词能直接带入释义
      const [graphRes, userRes] = await Promise.all([
        axios.post('http://127.0.0.1:8000/graph/context', { 
            word, 
            definition 
        }),
        axios.get('http://127.0.0.1:8000/user/profile')
      ]);

      const { center, neighbors } = graphRes.data;
      
      // 熔断：如果后端没返回中心节点，终止
      if (!center) {
          console.error("[Store] Center node missing!");
          set({ isScanning: false });
          return;
      }

      // C. 布局计算：将相对坐标转换为世界绝对坐标
      const layoutNeighbors = neighbors.map((n: any, index: number) => {
        // 后端返回的是 [relX, 0, relZ]，基于 (0,0)
        // 我们要把它加到 currentPos 上
        // 如果后端没算坐标（理论上不会），默认用圆形分布
        const [rx, , rz] = n.position || [
            ORBIT_RADIUS * Math.cos((index / neighbors.length) * Math.PI * 2), 
            0, 
            ORBIT_RADIUS * Math.sin((index / neighbors.length) * Math.PI * 2)
        ];
        
        return {
          ...n,
          position: [
            currentPos![0] + rx, 
            0, // Y轴由前端地形计算，这里填0
            currentPos![2] + rz
          ]
        };
      });

      // D. 更新全局状态
      set({ 
        centerNode: { ...center, position: currentPos }, 
        neighbors: layoutNeighbors,
        user: userRes.data,
        isScanning: false,
        lastNarrative: null,
        activeNodeId: word
      });

      // 🔥 [新增] 自动深扫逻辑 (Auto Odradek)
      // 如果是拓荒新词（没有邻居），自动触发后台深度扫描
     console.log(`[Cruise] Jump to ${word} completed.`);
      
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

   // 🔥 [Action] 建立/修改物理链路
  establishLink: async (targetId: string, type: string, action = 'toggle') => {
    const { centerNode, neighbors } = get();
    if (!centerNode) return;

    // 只有在创建和重生成时显示 Linking 动画
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
              const isNewlyCreated = status === 'created';
              const isUpdated = status === 'updated';
              const isDeleted = status === 'deleted';

              return { 
                  ...n, 
                  is_linked: isNewlyCreated || isUpdated || (status === 'exists'), 
                  narrative: isDeleted ? undefined : narrative,
                  // 🔥 [核心逻辑] 如果是后台重生成或者是新创建，标记为“有未读情报”
                  // 如果是删除，则清除标记
                  hasUnseenLog: isDeleted ? false : (isNewlyCreated || isUpdated)
              };
          }
          return n;
      });

      set({ 
        neighbors: newNeighbors,
        // 如果是创建新连接，我们允许它直接弹出来（爽感反馈）
        // 如果是重生成，保持静默，不修改 lastNarrative
        lastNarrative: status === 'created' ? narrative : get().lastNarrative,
        user: { ...get().user, current_xp: total_xp, level }
      });

      // 如果直接弹出了剧情，取消掉那个未读标记
      if (status === 'created') {
          set((state) => ({
              neighbors: state.neighbors.map(n => n.id === targetId ? { ...n, hasUnseenLog: false } : n)
          }));
      }
      
    } catch (e) { 
      console.error("[Store] Link protocol failed:", e); 
    } finally {
      set({ isLinking: false });
    }
  },

  // 🔥 [新增 Action] 战术指令：点击展示情报
  // 🔥 修复点 1：必须加上 async 关键字
  showNarrative: async (targetId: string) => {
    // 🔥 修复点 2：从 get() 中解构需要的 Action 和数据
    const { neighbors, establishLink } = get();
    
    const targetNode = neighbors.find(n => n.id === targetId);
    
    if (targetNode) {
        // 如果已连接但没剧情，强制补全
        if (targetNode.is_linked && !targetNode.narrative) {
            console.log("[Store] Narrative missing. Re-linking...");
            // 🔥 修复点 3：这里现在可以安全地使用 await 和解构出来的 establishLink
            await establishLink(targetId, targetNode.relation || 'auto', 'toggle');
            return;
        }

        // 状态闪断逻辑，触发打字机重置
        if (targetNode.narrative) {
            set({ lastNarrative: null });
            
            // 延迟 10ms 重新赋值，确保 React 触发渲染更新
            setTimeout(() => {
                set({ lastNarrative: targetNode.narrative });
            }, 10);
            
            // 清除“未读”红点标记
            set((state) => ({
                neighbors: state.neighbors.map(n => 
                    n.id === targetId ? { ...n, hasUnseenLog: false } : n
                )
            }));
        }
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