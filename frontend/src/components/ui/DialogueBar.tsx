import { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { useGameStore } from '../../store/store';
import { useTypewriter } from '../../hooks/useTypewriter';
import { audioService } from '../../utils/AudioService';
import AIAvatar from './AIAvatar'; 

// --- 战术语料库：中文版 ---
const IDLE_MESSAGES = [
  "正在监测手性网络密度，连接状态稳定。",
  "奥德拉德克扫描仪已校准，未发现异常干扰。",
  "开罗尔物质水平正常，系统延迟低于 10ms。",
  "知识链路刻录就绪，等待注入指令。",
  "正在同步周边拓扑结构，星图已更新。",
  "M4 核心算力负载均衡中，系统性能最优。",
  "外部时间雨干扰极低，通讯信道通畅。",
  "系统完备率 98.4%。未发现虚爆风险。"
];

interface Candidate {
  word: string; lang: string; definition: string; source: 'MEMORY' | 'CLOUD';
}

// 辅助组件：干扰效果文本 (解密动画)
const GlitchText = ({ text }: { text: string }) => (
  <div className="relative inline-block text-orange-500/50 mix-blend-screen overflow-hidden font-mono">
    <span className="animate-pulse blur-[1px] opacity-70 select-none">
      {text.split('').map((char, i) => Math.random() > 0.7 ? String.fromCharCode(33 + Math.random() * 30) : char).join('')}
    </span>
    <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
  </div>
);

export default function DialogueBar() {
  // --- 1. 指挥中心数据解构 ---
  const { 
    centerNode, neighbors, isScanning, isLinking, establishLink, 
    lastNarrative, performDeepScan, showNarrative, jumpTo, completeMission 
  } = useGameStore();

  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [idleText, setIdleText] = useState(IDLE_MESSAGES[0]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // --- 2. 状态判定：同步协议逻辑 ---
  const isMissionTarget = centerNode?.is_mission_target;
  const isReviewedToday = centerNode?.is_reviewed_today;
  const canSync = !isReviewedToday; // 逻辑：今日未同步则允许操作

  // --- 3. 逻辑引擎：动态待机消息 ---
  useEffect(() => {
    if (!lastNarrative && !isLinking && !isScanning) {
      const interval = setInterval(() => {
        setIdleText(IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)]);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [lastNarrative, isLinking, isScanning]);

  // --- 4. 逻辑引擎：语音播报 ---
  useEffect(() => {
    if (lastNarrative) {
      audioService.speak(lastNarrative);
    }
  }, [lastNarrative]);

  // --- 5. 交互音效处理 ---
  const handleInteraction = (type: 'click' | 'hover') => {
    audioService.init(); 
    if (type === 'click') audioService.playSFX('click');
    else audioService.playSFX('hover', 0.1); 
  };

  // --- 6. 搜索联想逻辑 (Debounce) ---
  useEffect(() => {
    if (input.trim().length < 2) { setCandidates([]); setShowDropdown(false); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/search/hints?q=${input.trim()}`);
        setCandidates(res.data);
        setShowDropdown(true);
        setSelectedIndex(0); 
      } catch (e) {
        console.error("Radar Offline:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const executeCommand = async (candidate: Candidate) => {
    handleInteraction('click');
    setShowDropdown(false);
    setInput(""); 
    await jumpTo(candidate.word, undefined, candidate.definition);
  };

  // --- 7. 键盘操作逻辑 ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || candidates.length === 0) return;
    if (e.key === 'ArrowUp') {
      handleInteraction('hover');
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : candidates.length - 1));
    } else if (e.key === 'ArrowDown') {
      handleInteraction('hover');
      e.preventDefault();
      setSelectedIndex(prev => (prev < candidates.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) executeCommand(candidates[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // --- 8. 文本渲染准备 (带 Key 闪断修复) ---
  const narrativeText = isLinking ? "正在解析信号频率..." : (lastNarrative || idleText);
  const typewriterKey = useMemo(() => lastNarrative ? lastNarrative.slice(0, 10) + Date.now() : 'idle', [lastNarrative]);
  const displayNarrative = useTypewriter(narrativeText, 25);

  // --- 9. 子渲染：本地网络项 ---
  const renderOptionItem = (node: any, index: number) => {
    const isConnected = node.is_linked;
    const hasNewInfo = node.hasUnseenLog;
    return (
      <div key={node.id} className="flex items-center gap-2 mb-1 group">
        <button
          onMouseEnter={() => handleInteraction('hover')}
          onClick={() => {
            handleInteraction('click');
            if (isConnected) {
                showNarrative(node.id); 
            } else {
                establishLink(node.id, node.relation || 'auto', 'toggle');
            }
          }}
          className={`flex-1 text-left px-3 py-2 text-xs font-mono border-l-2 transition-all flex justify-between items-center 
            ${hasNewInfo 
                ? 'border-orange-500 text-orange-400 animate-pulse bg-orange-500/10' 
                : isConnected 
                    ? 'border-orange-500 text-orange-200 bg-orange-900/10' 
                    : 'border-cyan-500 text-cyan-200 hover:bg-white/10'}`}
        >
          <div className="flex items-center">
             <span className="mr-2 opacity-50 font-bold">[{index + 1}]</span>
             <span className={`truncate max-w-[120px] font-bold uppercase ${hasNewInfo ? 'text-white' : ''}`}>
                 {node.id}
             </span>
          </div>
          {hasNewInfo && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>}
        </button>
      </div>
    );
  };

  if (!centerNode) return null;

  return (
     <div className={`fixed bottom-0 left-0 w-full h-48 z-50 flex bg-gray-950/95 backdrop-blur-xl border-t-2 ${isLinking ? 'border-orange-500 animate-pulse' : 'border-cyan-500/50'} text-white font-rpg shadow-[0_-10px_50px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-500`}>
      
      {/* 1. 左侧区域：AI 头像与状态条 */}
      <div className="w-40 h-full border-r border-white/10 flex flex-col items-center justify-center bg-black/40">
        <AIAvatar state={isLinking || isSearching ? 'processing' : 'idle'} />
        <div className="w-full h-1 mt-auto bg-gray-900 flex">
           <div className={`h-full transition-all duration-300 ${isLinking ? 'w-full bg-orange-500 animate-pulse' : 'w-1/3 bg-cyan-500'}`}></div>
        </div>
      </div>

      {/* 2. 中间区域：系统日志与指令输入 */}
      <div className="flex-1 flex flex-col relative px-8 py-6">
        {/* 系统日志显示区 */}
        <div className="flex-1 overflow-y-auto scrollbar-none mb-4 relative">
            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-gray-950/0 w-full z-10">
                <span className={`w-2 h-2 rounded-full ${isLinking ? 'bg-orange-500 animate-ping' : 'bg-orange-600 shadow-[0_0_8px_orange]'}`}></span>
                <span className="text-[11px] text-orange-500 font-bold tracking-[0.2em] uppercase opacity-90">SC-7274 Tactical Log</span>
            </div>
            <div key={typewriterKey} className="text-base leading-relaxed text-orange-100/90 font-serif max-w-[95%]">
                {isLinking ? <GlitchText text="DECRYPTING_SIGNAL_STREAM..." /> : displayNarrative}
            </div>
        </div>

        {/* 交互输入框容器 */}
        <div className="relative w-full h-12 group">

{showDropdown && candidates.length > 0 && (
    <div className="absolute bottom-full left-0 w-full mb-2 bg-black/95 border border-cyan-500/30 rounded-t shadow-[0_-15px_40px_rgba(0,0,0,0.9)] overflow-hidden z-50">
        <div className="flex justify-between items-center px-3 py-1 bg-cyan-950/50 border-b border-cyan-500/20">
            <span className="text-[9px] text-cyan-400 tracking-widest uppercase">Detected Signals</span>
            <span className="text-[9px] text-cyan-600 uppercase">{candidates.length} Matches</span>
        </div>
        <ul className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900">
            {candidates.map((item, idx) => (
                <li key={idx}>
                    <button
                        onMouseEnter={() => handleInteraction('hover')}
                        onClick={() => executeCommand(item)}
                        className={`w-full text-left px-5 py-3 text-xs flex justify-between items-center border-l-2 transition-all
                            ${idx === selectedIndex ? 'bg-cyan-500/10 border-cyan-400 text-white' : 'border-transparent text-gray-400 hover:bg-white/5'}`}
                    >
                        {/* 🔥 核心修复：单词与释义纵向排列 */}
                        <div className="flex flex-col gap-0.5 overflow-hidden pr-4">
                            <span className={`font-bold uppercase tracking-wider text-sm ${idx === selectedIndex ? 'text-cyan-300' : 'text-gray-200'}`}>
                                {item.word}
                            </span>
                            {/* 释义预览 */}
                            <span className="text-[10px] opacity-50 font-serif italic truncate max-w-[280px]">
                                {item.definition || "Analyzing pattern..."}
                            </span>
                        </div>

                        {/* 语言标签 */}
                        <div className="flex-shrink-0 flex items-center gap-2">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${item.lang === 'DE' ? 'border-yellow-700 text-yellow-500' : 'border-cyan-700 text-cyan-500'}`}>
                                {item.lang}
                            </span>
                        </div>
                    </button>
                </li>
            ))}
        </ul>
    </div>
)}
            <div className="absolute inset-0 bg-cyan-950/20 border border-cyan-500/30 rounded-lg flex items-center px-4 shadow-[0_0_20px_rgba(0,255,255,0.05)] group-focus-within:border-cyan-400 transition-colors">
                <span className={`mr-4 font-mono text-xl select-none ${isSearching ? 'text-orange-500 animate-spin' : 'text-cyan-500 animate-pulse'}`}>
                    {isSearching ? '⟳' : '>_'}
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => audioService.init()}
                    placeholder="ENTER COMMAND / SCAN COORDINATES..."
                    className="w-full bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-900 font-mono text-base h-full tracking-[0.1em] uppercase"
                    autoComplete="off"
                />
            </div>
        </div>
      </div>

      {/* 3. 右侧区域：本地网络列表与战术控制 (高度优化版) */}
      <div className="w-64 md:w-72 bg-black/60 border-l border-white/10 p-3 flex flex-col overflow-hidden relative shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        
        {/* 头部：紧凑排列 */}
        <div className="flex justify-between items-center mb-2 px-1 border-b border-white/5 pb-1">
            <span className="text-[9px] uppercase text-cyan-700 font-mono font-black tracking-widest">Local_Net</span>
            <span className="text-[10px] text-gray-600 font-mono">{neighbors.length} OBJ</span>
        </div>
        
        {/* 邻居滚动列表：使用 flex-1 撑满剩余高度 */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-900/30">
            {neighbors.length === 0 && (
                 <div className="text-gray-800 text-[9px] italic text-center py-4 font-mono uppercase tracking-widest">No Signals</div>
            )}
            
            {neighbors.map((node, index) => {
                const isConnected = node.is_linked;
                const hasNewInfo = node.hasUnseenLog;
                return (
                    <div key={node.id} className="mb-0.5 group">
                        <button
                            onMouseEnter={() => handleInteraction('hover')}
                            onClick={() => {
                                handleInteraction('click');
                                if (isConnected) showNarrative(node.id);
                                else establishLink(node.id, node.relation || 'auto', 'toggle');
                            }}
                            className={`w-full text-left px-2 py-1.5 text-[11px] font-mono border-l-2 transition-all flex justify-between items-center
                                ${hasNewInfo 
                                    ? 'border-orange-500 text-orange-400 animate-pulse bg-orange-500/5' 
                                    : isConnected 
                                        ? 'border-orange-500/40 text-orange-200/70 bg-orange-950/5 hover:bg-orange-900/10 hover:text-orange-200' 
                                        : 'border-cyan-900/30 text-cyan-600 hover:border-cyan-500 hover:bg-cyan-500/5 hover:text-cyan-100'}`}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <span className="opacity-30 text-[9px] font-bold">{(index + 1).toString().padStart(2, '0')}</span>
                                <span className="truncate font-bold uppercase tracking-tighter">{node.id}</span>
                            </div>
                            
                            {/* 仅在未连接或有新消息时显示标记，减少视觉噪音 */}
                            <div className="flex items-center gap-1.5 ml-2">
                                {node.relation && !isConnected && (
                                    <span className="text-[7px] opacity-40 uppercase border border-current px-0.5 rounded-sm scale-90 origin-right">
                                        {node.relation.slice(0, 4)}
                                    </span>
                                )}
                                {hasNewInfo && <span className="w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_5px_orange]"></span>}
                            </div>
                        </button>
                    </div>
                );
            })}
        </div>
        
        {/* 战术操作区：按钮颜色深度优化版 */}
        {!isScanning && (
           <div className="mt-2 pt-2 border-t border-white/10 bg-black/40">
             <div className="flex gap-1.5">
                {/* 1. 同步/稳定按钮 */}
                <button 
                    disabled={!canSync} 
                    onClick={() => { 
                        handleInteraction('click');
                        audioService.playSFX('sucess'); 
                        completeMission(centerNode.id); 
                    }} 
                    className={`flex-1 py-1.5 border font-black text-[9px] uppercase transition-all tracking-tighter rounded-sm
                        ${canSync 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
                        // 🔥 [核心优化]：弃用灰色，改用深邃的“静默青”
                        : 'bg-cyan-950/30 border-cyan-900/50 text-cyan-800 cursor-not-allowed opacity-80'}`}
                > 
                    <div className="flex items-center justify-center gap-1">
                        {!canSync && <span className="w-1 h-1 bg-cyan-800 rounded-full"></span>}
                        {canSync ? "SYNC_LINK" : "LINK_STABLE"} 
                    </div>
                </button>
                
                {/* 2. 扫描按钮：保持经典的青色高亮 */}
                <button 
                    onMouseEnter={() => handleInteraction('hover')}
                    onClick={() => { 
                        handleInteraction('click'); 
                        audioService.playSFX('scan'); 
                        performDeepScan(); 
                    }} 
                    className="flex-1 group relative py-1.5 bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 text-[9px] font-black uppercase overflow-hidden tracking-tighter rounded-sm"
                > 
                    <div className="absolute inset-0 bg-cyan-400/5 translate-x-[-100%] group-hover:animate-[scan_1s_linear_infinite]"></div>
                    <span className="relative">{neighbors.length === 0 ? "SCAN" : "RE-SCAN"}</span>
                </button>
             </div>
             
             {/* 优先级提示 */}
             {isMissionTarget && canSync && (
                <div className="text-[7px] text-orange-600 font-mono text-center mt-1 animate-pulse font-bold tracking-tighter">
                    [!] TARGET_SYNC_REQUIRED
                </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
}