import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useGameStore } from '../../store/store';
import { useTypewriter } from '../../hooks/useTypewriter';
import { audioService } from '../../utils/AudioService';
import AIAvatar from './AIAvatar'; 

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

const GlitchText = ({ text }: { text: string }) => (
  <div className="relative inline-block text-orange-500/50 mix-blend-screen overflow-hidden font-mono">
    <span className="animate-pulse blur-[1px] opacity-70 select-none">
      {text.split('').map((char, i) => Math.random() > 0.7 ? String.fromCharCode(33 + Math.random() * 30) : char).join('')}
    </span>
    <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
  </div>
);

export default function DialogueBar() {
  const { 
    centerNode, neighbors, isScanning, isLinking, establishLink, lastNarrative, performDeepScan,
    jumpTo, missions, completeMission 
  } = useGameStore();

  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [idleText, setIdleText] = useState(IDLE_MESSAGES[0]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lastNarrative && !isLinking && !isScanning) {
      const interval = setInterval(() => {
        setIdleText(IDLE_MESSAGES[Math.floor(Math.random() * IDLE_MESSAGES.length)]);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [lastNarrative, isLinking, isScanning]);

  useEffect(() => {
    if (lastNarrative) {
      audioService.speak(lastNarrative);
    }
  }, [lastNarrative]);

  const handleInteraction = (type: 'click' | 'hover') => {
    audioService.init(); 
    if (type === 'click') audioService.playSFX('click');
    else audioService.playSFX('hover', 0.1); 
  };

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

  const executeCommand = async (candidate: Candidate) => {
    handleInteraction('click');
    setShowDropdown(false);
    setInput(""); 
    await jumpTo(candidate.word, undefined, candidate.definition);
  };

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

  const narrativeText = isLinking ? "正在解析信号频率..." : (lastNarrative || idleText);
  const displayNarrative = useTypewriter(narrativeText, 25);
  const isMissionTarget = centerNode?.is_mission_target;

  const renderOptionItem = (node: any, index: number) => {
    const isConnected = node.is_linked;
    return (
      <div key={node.id} className="flex items-center gap-2 mb-1 group">
        <button
          onMouseEnter={() => handleInteraction('hover')}
          onClick={() => {
            handleInteraction('click');
            if (isConnected) useGameStore.setState({ lastNarrative: node.narrative });
            else establishLink(node.id, node.relation || 'auto', 'toggle');
          }}
          className={`flex-1 text-left px-3 py-2 text-xs font-mono border-l-2 transition-all flex justify-between items-center ${isConnected ? 'border-orange-500 text-orange-200 bg-orange-900/10' : 'border-cyan-500 text-cyan-200 hover:bg-white/10'}`}
        >
          <div className="flex items-center">
             <span className="mr-2 opacity-50 font-bold">[{index + 1}]</span>
             <span className="truncate max-w-[120px] font-bold uppercase">{node.id}</span>
          </div>
        </button>
      </div>
    );
  };

  if (!centerNode) return null;

  return (
     <div className={`fixed bottom-0 left-0 w-full h-48 z-50 flex bg-gray-950/95 backdrop-blur-xl border-t-2 ${isLinking ? 'border-orange-500 animate-pulse' : 'border-cyan-500/50'} text-white font-rpg shadow-[0_-10px_50px_rgba(0,0,0,0.8)] pointer-events-auto`}>
      
      <div className="w-40 h-full border-r border-white/10 flex flex-col items-center justify-center bg-black">
        <AIAvatar state={isLinking || isSearching ? 'processing' : 'idle'} />
        <div className="w-full h-1 mt-auto bg-gray-900 flex">
           <div className={`h-full transition-all duration-300 ${isLinking ? 'w-full bg-orange-500 animate-pulse' : 'w-1/3 bg-cyan-500'}`}></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative px-6 py-4">
        <div className="flex-1 overflow-y-auto scrollbar-none mb-2 relative">
            <div className="flex items-center gap-2 mb-1 sticky top-0 bg-gray-950/0 w-full z-10">
                <span className={`w-1.5 h-1.5 rounded-full ${isLinking ? 'bg-orange-500 animate-ping' : 'bg-orange-600'}`}></span>
                <span className="text-[10px] text-orange-500 font-bold tracking-wider uppercase opacity-80">SC-7274 实时链路日志</span>
            </div>
            <div className="text-sm leading-relaxed text-orange-100/90 font-serif">
                {isLinking ? <GlitchText text="DECRYPTING_SIGNAL_STREAM..." /> : displayNarrative}
            </div>
        </div>

        <div className="relative w-full h-10 group">
            {showDropdown && candidates.length > 0 && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-black/95 border border-cyan-500/30 rounded-t shadow-2xl overflow-hidden z-50">
                    <ul className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900">
                        {candidates.map((item, idx) => (
                            <li key={idx}>
                                <button
                                    onMouseEnter={() => handleInteraction('hover')}
                                    onClick={() => executeCommand(item)}
                                    className={`w-full text-left px-4 py-2 text-xs flex justify-between items-center border-l-2 ${idx === selectedIndex ? 'bg-white/10 border-cyan-400 text-white' : 'border-transparent text-gray-400'}`}
                                >
                                    <span className="font-bold uppercase tracking-wider">{item.word}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${item.lang === 'DE' ? 'border-yellow-700 text-yellow-500' : 'border-blue-700 text-blue-500'}`}>{item.lang}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="absolute inset-0 bg-cyan-900/10 border border-cyan-500/30 rounded flex items-center px-3 shadow-[0_0_15px_rgba(0,255,255,0.05)]">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => audioService.init()}
                    placeholder="输入指令或坐标..."
                    className="w-full bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-800 font-mono text-sm h-full tracking-widest uppercase"
                    autoComplete="off"
                />
            </div>
        </div>
      </div>

      <div className="w-72 md:w-80 bg-black/40 border-l border-white/10 p-4 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 relative">
        <div className="text-[9px] uppercase text-gray-600 mb-3 tracking-[0.2em] font-bold flex justify-between">
            <span>本地网络</span>
            <span>{neighbors.length} 目标已锁定</span>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto">
            {neighbors.slice(0, 10).map((node, index) => renderOptionItem(node, index))}
            {neighbors.length === 0 && !isMissionTarget && (
                 <div className="text-gray-700 text-[10px] italic text-center py-4 uppercase">未检测到有效关联信号</div>
            )}
        </div>
        
        {!isScanning && (
           <div className="flex flex-col items-center gap-2 mt-4 border-t border-white/5 pt-4">
             {isMissionTarget && (
                 <button 
                    onClick={() => { audioService.playSFX('sucess'); completeMission(centerNode.id); }} 
                    className="w-full py-2 bg-orange-500/20 border border-orange-500 text-orange-500 text-[10px] font-bold uppercase mb-1 hover:bg-orange-500 hover:text-black transition-all"
                 > 
                    [ 确认掌握此目标 ] 
                 </button>
             )}
             <button 
                onMouseEnter={() => handleInteraction('hover')}
                onClick={() => { audioService.playSFX('scan'); performDeepScan(); }} 
                className="group relative w-full py-2 bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase overflow-hidden"
             > 
                <div className="absolute inset-0 bg-cyan-400/5 translate-x-[-100%] group-hover:animate-[scan_1s_linear_infinite]"></div>
                {neighbors.length === 0 ? "启动奥德拉德克深描" : "重新扫描当前区域"} 
             </button>
           </div>
        )}
      </div>
    </div>
  );
}