import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useGameStore } from '../../store/store';
import { useTypewriter } from '../../hooks/useTypewriter';
import AIAvatar from './AIAvatar'; 

// --- 类型定义 (复用原 Terminal 逻辑) ---
interface Candidate {
  word: string;
  lang: string;
  definition: string;
  source: 'MEMORY' | 'CLOUD';
}

// 辅助组件：干扰效果文本
const GlitchText = ({ text }: { text: string }) => (
  <div className="relative inline-block text-orange-500/50 mix-blend-screen overflow-hidden">
    <span className="animate-pulse blur-[1px] opacity-70 select-none">
      {text.split('').map((char, i) => Math.random() > 0.7 ? String.fromCharCode(33 + Math.random() * 30) : char).join('')}
    </span>
    <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
  </div>
);

export default function DialogueBar() {
  // --- 1. 指挥中心数据接入 ---
  const { 
    centerNode, 
    neighbors, 
    isScanning, 
    isLinking, 
    establishLink, 
    lastNarrative, 
    performDeepScan,
    jumpTo // 🔥 需要此 Action 进行跳转
  } = useGameStore();

  // --- 2. 搜索状态管理 (从 Terminal 移植) ---
  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // --- 3. 搜索核心逻辑 (Debounce) ---
  useEffect(() => {
    // 空输入清理
    if (input.trim().length < 2) {
      setCandidates([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        // 调用后端全频段雷达
        const res = await axios.get(`http://127.0.0.1:8000/search/hints?q=${input.trim()}`);
        setCandidates(res.data);
        setShowDropdown(true);
        setSelectedIndex(0); // 默认选中第一个
      } catch (e) {
        console.error("Radar Offline:", e);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms 防抖

    return () => clearTimeout(timer);
  }, [input]);

  // --- 4. 提交指令 ---
  const executeCommand = async (candidate: Candidate) => {
    setShowDropdown(false);
    setInput(""); // 清空输入框
    
    // 执行跳转 (携带 definition 以便后端直接收录)
    await jumpTo(candidate.word, undefined, candidate.definition);
  };

  // --- 5. 键盘导航 (上下键选择) ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || candidates.length === 0) return;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      // 列表是向上弹出的，但在逻辑索引上，Up 依然是 index - 1
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : candidates.length - 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < candidates.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < candidates.length) {
        executeCommand(candidates[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // 辅助函数：语言徽章颜色
  const getLangColor = (lang: string) => {
    if (lang === 'DE') return 'text-yellow-500 border-yellow-700 bg-yellow-900/20';
    if (lang === 'LOCAL') return 'text-cyan-500 border-cyan-700 bg-cyan-900/20';
    return 'text-blue-400 border-blue-700 bg-blue-900/20'; 
  };

  // --- 6. 文本显示逻辑 ---
  const narrativeText = lastNarrative || "Awaiting command input...";
  const displayNarrative = useTypewriter(narrativeText, 15);

  // --- 子组件：右侧邻居项 ---
  const renderOptionItem = (node: any, index: number) => {
    const isConnected = node.is_linked;
    return (
      <div key={node.id} className="flex items-center gap-2 mb-1 group">
        <button
          disabled={isLinking}
          onClick={() => {
            if (isConnected) useGameStore.setState({ lastNarrative: node.narrative });
            else establishLink(node.id, node.relation || 'auto', 'toggle');
          }}
          className={`
            flex-1 text-left px-3 py-2 text-xs font-mono border-l-2 transition-all flex justify-between items-center
            ${isConnected ? 'border-orange-500 text-orange-200 bg-orange-900/10' : 'border-cyan-500 text-cyan-200 hover:bg-white/10'}
          `}
        >
          <div className="flex items-center overflow-hidden">
             <span className="mr-2 opacity-50 font-bold">[{index + 1}]</span>
             <span className="truncate max-w-[120px] font-bold">{node.id}</span>
          </div>
          {node.relation && <span className="text-[9px] opacity-60 uppercase border px-1 rounded">{node.relation}</span>}
        </button>
        
        {/* 操作区：刷新/删除 */}
        {isConnected && !isLinking && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e)=>{e.stopPropagation();establishLink(node.id, node.relation||'auto','regenerate')}} className="p-1 border border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-black">↻</button>
                <button onClick={(e)=>{e.stopPropagation();establishLink(node.id, node.relation||'auto','delete')}} className="p-1 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-black">×</button>
            </div>
        )}
      </div>
    );
  };

  if (!centerNode) return null;

  return (
     <div className={`
      fixed bottom-0 left-0 w-full h-48 z-50 flex
      bg-gray-950/95 backdrop-blur-xl border-t-2 
      ${isLinking ? 'border-orange-500 animate-pulse' : 'border-cyan-500/50'}
      text-white font-rpg shadow-[0_-10px_50px_rgba(0,0,0,0.8)]
      pointer-events-auto  /* 🔥 [关键修复] 必须加上这句，否则无法点击输入框和按钮 */
    `}>
      
      {/* 1. 左侧：Avatar & Status */}
      <div className="w-40 h-full border-r border-white/10 flex flex-col items-center justify-center bg-black">
        <AIAvatar state={isLinking || isSearching ? 'processing' : 'idle'} />
        <div className="w-full h-1 mt-auto bg-gray-900 flex">
           <div className={`h-full transition-all duration-300 ${isLinking ? 'w-full bg-orange-500 animate-pulse' : 'w-1/3 bg-cyan-500'}`}></div>
        </div>
      </div>

      {/* 2. 中间：指挥控制台 (Command Console) */}
      <div className="flex-1 flex flex-col relative px-6 py-4">
        
        {/* 2.1 上半部：系统日志 (System Log) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-900/50 mb-2 relative">
            <div className="flex items-center gap-2 mb-1 sticky top-0 bg-gray-950/0 w-full z-10">
                <span className={`w-1.5 h-1.5 rounded-full ${isLinking ? 'bg-orange-500 animate-ping' : 'bg-orange-600'}`}></span>
                <span className="text-[10px] text-orange-500 font-bold tracking-wider">SYSTEM LOG</span>
            </div>
            <div className="text-sm leading-relaxed text-orange-100/80 font-serif">
                {isLinking ? <GlitchText text={lastNarrative || "Processing..."} /> : displayNarrative}
            </div>
        </div>

        {/* 2.2 下半部：指令输入框 (Command Input) */}
        <div className="relative w-full h-10 group">
            
            {/* 🔥 向上弹出的全息列表 (Pop-up Radar) */}
            {showDropdown && candidates.length > 0 && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-black/95 border border-cyan-500/30 rounded-t shadow-[0_-10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                     <div className="flex justify-between items-center px-3 py-1 bg-cyan-950/50 border-b border-cyan-500/20">
                        <span className="text-[9px] text-cyan-400 tracking-widest">RADAR CONTACTS</span>
                        <span className="text-[9px] text-cyan-600">{candidates.length} FOUND</span>
                    </div>
                    {/* 列表内容 */}
                    <ul className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900">
                        {candidates.map((item, idx) => (
                            <li key={idx}>
                                <button
                                    onClick={() => executeCommand(item)}
                                    className={`w-full text-left px-4 py-2 text-xs flex justify-between items-center border-l-2 transition-colors
                                        ${idx === selectedIndex 
                                            ? 'bg-white/10 border-cyan-400 text-white' 
                                            : 'border-transparent text-gray-400 hover:bg-white/5'}
                                    `}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm tracking-wide">{item.word}</span>
                                        <span className="text-[10px] opacity-50 font-serif italic truncate max-w-[300px]">
                                            {item.definition}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${getLangColor(item.lang)}`}>
                                            {item.lang}
                                        </span>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* 输入框本体 */}
            <div className="absolute inset-0 bg-cyan-900/10 border border-cyan-500/30 rounded flex items-center px-3 group-focus-within:border-cyan-400 group-focus-within:bg-cyan-900/20 transition-all shadow-[0_0_15px_rgba(0,255,255,0.05)]">
                <span className={`mr-3 font-mono text-lg select-none ${isSearching ? 'text-orange-500 animate-spin' : 'text-cyan-500 animate-pulse'}`}>
                    {isSearching ? '⟳' : '>_'}
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="ENTER COMMAND..."
                    className="w-full bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-800 font-mono text-sm h-full tracking-widest"
                    autoComplete="off"
                />
            </div>
        </div>

      </div>

      {/* 3. 右侧：邻居列表 & Odradek */}
      <div className="w-72 md:w-80 bg-black/40 border-l border-white/10 p-4 flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
        <div className="text-[9px] uppercase text-gray-600 mb-3 tracking-[0.2em] font-bold flex justify-between">
            <span>Local Network</span>
            <span>{neighbors.length} OBJ</span>
        </div>
        
        {/* 邻居列表 */}
        {neighbors.slice(0, 10).map((node, index) => renderOptionItem(node, index))}
        
        {/* Odradek 深度扫描按钮 (兜底) */}
        {!isScanning && (
           <div className="flex flex-col items-center gap-2 mt-4 pb-4 border-t border-white/5 pt-4">
             <button 
                onClick={performDeepScan} 
                className="group relative w-full py-2 bg-cyan-950/30 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all overflow-hidden"
             >
                <div className="absolute inset-0 bg-cyan-400/10 translate-x-[-100%] group-hover:animate-[scan_1s_linear_infinite]"></div>
                <span className="relative flex items-center justify-center gap-2 text-xs font-bold text-cyan-400 tracking-widest">
                    <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    {neighbors.length === 0 ? "INITIATE ODRADEK" : "RE-SCAN AREA"}
                </span>
             </button>
           </div>
        )}
      </div>
    </div>
  );
}