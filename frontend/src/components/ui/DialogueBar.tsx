// @ts-nocheck
import { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { useGameStore } from '../../store/store';
import { useTypewriter } from '../../hooks/useTypewriter';
import { audioService } from '../../utils/AudioService';
import AIAvatar from './AIAvatar'; 

// --- 战术语料库：中文版 ---
const IDLE_MESSAGES = [
  "正在监测手性网络密度，连接状态稳定。",
  "知识链路刻录就绪，等待注入指令。",
  "M4 核心算力负载均衡中，系统性能最优。",
  "系统完备率 98.4%。未发现虚爆风险。",
  "您那里天气好吗？",
  "有人对我说：“路遥知马力”，这对吗？"
];

interface Candidate {
  word: string; lang: string; definition: string; source: 'MEMORY' | 'CLOUD';
}

// 辅助组件：信号干扰效果
const GlitchText = ({ text }: { text: string }) => (
  <div className="relative inline-block text-orange-500/50 mix-blend-screen overflow-hidden font-mono">
    <span className="animate-pulse blur-[1px] opacity-70 select-none">
      {text.split('').map((char) => Math.random() > 0.7 ? String.fromCharCode(33 + Math.random() * 30) : char).join('')}
    </span>
    <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
  </div>
);

export default function DialogueBar() {
  const { 
    centerNode, neighbors, isScanning, isLinking, lastNarrative, 
    performDeepScan, showNarrative, jumpTo, completeMission 
  } = useGameStore();

  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [idleText, setIdleText] = useState(IDLE_MESSAGES[0]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // 状态判定
  const isReviewedToday = centerNode?.is_reviewed_today;
  const canSync = !isReviewedToday;
  const isMissionTarget = centerNode?.is_mission_target;

  // 1. 自动待机消息切换
  useEffect(() => {
    if (!lastNarrative && !isLinking && !isScanning) {
      const interval = setInterval(() => {
        setIdleText(IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)]);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [lastNarrative, isLinking, isScanning]);

  // 2. 语音播报触发
  useEffect(() => {
    if (lastNarrative) audioService.speak(lastNarrative);
  }, [lastNarrative]);

  // 3. 搜索逻辑
  useEffect(() => {
    if (input.trim().length < 2) { setCandidates([]); setShowDropdown(false); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`http://127.0.0.1:8000/search/hints?q=${input.trim()}`);
        setCandidates(res.data);
        setShowDropdown(true);
        setSelectedIndex(0); 
      } catch (e) { console.error(e); } finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const executeCommand = async (candidate: any) => {
    audioService.playSFX('click');
    setShowDropdown(false);
    setInput(""); 
    await jumpTo(candidate.word, undefined, candidate.definition);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || candidates.length === 0) return;
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev > 0 ? prev - 1 : candidates.length - 1)); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev < candidates.length - 1 ? prev + 1 : 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (selectedIndex >= 0) executeCommand(candidates[selectedIndex]); }
  };

// --- 4. 文本渲染核心逻辑 (强化版) ---
  const narrativeText = useMemo(() => {
    if (isLinking) return "正在刻录神经指纹...";
    return lastNarrative || idleText;
  }, [isLinking, lastNarrative, idleText]);
 const typewriterKey = useMemo(() => {
    return (lastNarrative?.slice(0, 10) || "idle") + isLinking + (isSearching ? "S" : "");
  }, [lastNarrative, isLinking, isSearching]);
  const displayNarrative = useTypewriter(narrativeText, 25);

  const handleInteraction = (type: 'click' | 'hover') => {
    audioService.init(); 
    if (type === 'click') audioService.playSFX('click');
    else audioService.playSFX('hover', 0.1); 
  };

  if (!centerNode) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full h-60 z-50 flex bg-gray-950/95 backdrop-blur-xl border-t-2 border-cyan-500/50 text-white font-rpg shadow-[0_-10px_50px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-500">
      
      {/* 1. 左侧 Avatar */}
      <div className="w-40 h-full border-r border-white/10 flex flex-col items-center justify-center bg-black/40">
        <AIAvatar state={isLinking || isScanning ? 'processing' : 'idle'} />
        <div className="w-full h-1 mt-auto bg-gray-900 flex">
           <div className={`h-full transition-all duration-300 ${isLinking ? 'w-full bg-orange-500 animate-pulse' : 'w-1/3 bg-cyan-500'}`}></div>
        </div>
      </div>

      {/* 2. 中间指挥区 */}
      <div className="flex-1 flex flex-col relative px-8 py-6">
        <div className="flex-1 overflow-y-auto scrollbar-none mb-4 relative">
            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-gray-950/0 w-full z-10">
                <span className={`w-2 h-2 rounded-full ${isLinking ? 'bg-orange-500 animate-ping' : 'bg-orange-600 shadow-[0_0_8px_orange]'}`}></span>
                <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase opacity-90">SC-7274 Tactical Log</span>
            </div>
            
            {/* 打字机显示区域 */}
            <div key={typewriterKey} className="text-base leading-relaxed text-orange-100/90 font-serif">
                {isLinking ? <GlitchText text="DECRYPTING_SIGNAL_STREAM..." /> : displayNarrative}
                {!isLinking && <span className="inline-block w-2 h-4 bg-orange-500/60 ml-1 animate-pulse" />}
            </div>
        </div>

        {/* 指令输入 */}
        <div className="relative w-full h-12 group">
            {showDropdown && candidates.length > 0 && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-black/95 border border-cyan-500/30 rounded-t shadow-2xl overflow-hidden z-50">
                    <ul className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900">
                        {candidates.map((item, idx) => (
                            <li key={idx}>
                                <button onMouseEnter={() => handleInteraction('hover')} onClick={() => executeCommand(item)} className={`w-full text-left px-5 py-3 text-xs flex justify-between items-center border-l-2 ${idx === selectedIndex ? 'bg-white/10 border-cyan-400 text-white' : 'border-transparent text-gray-400'}`}>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold uppercase tracking-wider text-sm">{item.word}</span>
                                        <span className="text-[10px] opacity-40 italic">{item.definition}</span>
                                    </div>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${item.lang === 'DE' ? 'border-yellow-700 text-yellow-500' : 'border-cyan-700 text-cyan-500'}`}>{item.lang}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="absolute inset-0 bg-cyan-950/20 border border-cyan-500/30 rounded-lg flex items-center px-4">
                <span className={`mr-4 font-mono text-xl select-none ${isSearching ? 'text-orange-500 animate-spin' : 'text-cyan-500'}`}>&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => audioService.init()}
                    placeholder="ENTER COMMAND..."
                    className="w-full bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-900 font-mono text-base h-full"
                    autoComplete="off"
                />
            </div>
        </div>
      </div>

      {/* 3. 右侧 Network */}
      <div className="w-64 md:w-72 bg-black/60 border-l border-white/10 p-3 flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center mb-2 px-1 border-b border-white/5 pb-1">
            <span className="text-[9px] uppercase text-cyan-700 font-mono font-black tracking-widest">Local_Net</span>
            <span className="text-[10px] text-gray-600 font-mono">{neighbors.length} OBJ</span>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-900/30">
            {neighbors.map((node) => (
                <button
                    key={node.id}
                    onMouseEnter={() => handleInteraction('hover')}
                    onClick={() => { audioService.playSFX('click'); node.is_linked ? showNarrative(node.id) : establishLink(node.id, 'auto'); }}
                    className={`w-full text-left mb-0.5 px-2 py-1.5 text-[11px] font-mono border-l-2 transition-all ${node.is_linked ? 'border-orange-500 text-orange-200 bg-orange-950/5' : 'border-cyan-900 text-cyan-600 hover:border-cyan-500'}`}
                >
                    {node.id.toUpperCase()}
                </button>
            ))}
        </div>
              
        {!isScanning && (
          <div className="mt-2 pt-2 border-t border-white/10 bg-black/40">
             <div className="flex gap-1.5">
                <button 
                    disabled={!canSync || isLinking} 
                    onClick={async () => { 
                        handleInteraction('click');
                        await completeMission(centerNode.id); // 后端自动生成 AI 笔记
                        audioService.playSFX('sucess'); 
                    }} 
                    className={`flex-1 py-1.5 border font-black text-[9px] uppercase transition-all rounded-sm
                        ${canSync 
                        ? 'bg-orange-500/20 border-orange-500 text-orange-500 hover:bg-orange-500 animate-pulse' 
                        : 'bg-cyan-950/30 border-cyan-900/50 text-cyan-800 cursor-not-allowed opacity-80'}`}
                > 
                    {isLinking ? "刻录中..." : (canSync ? "SYNC_LINK" : "STABLE")} 
                </button>
                
                <button onClick={() => { audioService.playSFX('scan'); performDeepScan(); }} className="flex-1 py-1.5 bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 text-[9px] font-black uppercase rounded-sm">
                    SCAN
                </button>
             </div>
             {isMissionTarget && canSync && (
                <div className="text-[7px] text-orange-600 font-mono text-center mt-1 animate-pulse font-bold">
                    [!] SYNC_REQUIRED
                </div>
             )}
           </div>
        )}
      </div>
    </div>
  );
}