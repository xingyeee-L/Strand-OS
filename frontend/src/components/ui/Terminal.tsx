import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useGameStore } from '../../store/store';

// 定义新的候选词接口
interface Candidate {
  word: string;
  lang: string; // 'LOCAL' | 'EN' | 'DE'
  definition: string;
  source: 'MEMORY' | 'CLOUD';
}

export default function Terminal() {
  const [input, setInput] = useState("");
  // 🔥 改为 Candidate 数组
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { jumpTo } = useGameStore();

  // --- 1. 防抖搜索 ---
  useEffect(() => {
    if (input.trim().length < 2) {
      setCandidates([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // 直接调用 hints，后端已经做好了聚合
        const res = await axios.get(`http://127.0.0.1:8000/search/hints?q=${input.trim()}`);
        setCandidates(res.data);
        setShowDropdown(true);
        setSelectedIndex(0); // 默认选中第一个
      } catch (e) {
        console.error("Radar Error", e);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input]);

  // --- 2. 提交逻辑 ---
  const executeCommand = async (candidate: Candidate) => {
    setIsProcessing(true);
    setShowDropdown(false);
    
    // 跳转逻辑：传入词、坐标(undefined)、和释义
    // 这样后端就不用再次 fetch definition 了
    await jumpTo(candidate.word, undefined, candidate.definition);

    setInput(""); 
    setIsProcessing(false);
  };

  // --- 3. 键盘 ---
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || candidates.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < candidates.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : candidates.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < candidates.length) {
        executeCommand(candidates[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // 辅助函数：获取语言颜色
  const getLangColor = (lang: string) => {
    if (lang === 'DE') return 'text-yellow-500 border-yellow-700 bg-yellow-900/20';
    if (lang === 'LOCAL') return 'text-cyan-500 border-cyan-700 bg-cyan-900/20';
    return 'text-blue-400 border-blue-700 bg-blue-900/20'; // EN
  };

  return (
    <div ref={wrapperRef} className="absolute top-8 left-1/2 -translate-x-1/2 z-40 w-96 pointer-events-auto font-mono">
      {/* Input Box */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-yellow-500 rounded opacity-30 group-hover:opacity-70 transition duration-500 blur"></div>
        <div className="relative flex bg-black/95 border border-gray-700 rounded p-1 shadow-2xl">
            <span className={`flex items-center pl-3 text-lg select-none ${isProcessing ? 'text-orange-500 animate-spin' : 'text-gray-400'}`}>
                {isProcessing ? '⟳' : '>'}
            </span>
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="OMNI-SEARCH..."
                className="w-full bg-transparent text-gray-200 placeholder-gray-700 text-sm px-3 py-2 focus:outline-none font-mono"
                disabled={isProcessing}
                autoComplete="off"
            />
        </div>
      </div>

      {/* Holographic Result List */}
      {showDropdown && candidates.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-black/95 border border-gray-800 rounded-sm shadow-[0_10px_50px_rgba(0,0,0,1)] overflow-hidden">
            <div className="flex justify-between items-center px-3 py-1 bg-gray-900/80 border-b border-white/5">
                <span className="text-[9px] text-gray-500 tracking-widest">RADAR CONTACTS</span>
                <span className="text-[9px] text-gray-500">{candidates.length} FOUND</span>
            </div>

            <ul className="max-h-[400px] overflow-y-auto">
                {candidates.map((item, idx) => (
                    <li key={item.word + idx}>
                        <button
                            onClick={() => executeCommand(item)}
                            className={`
                                w-full text-left px-4 py-3 text-xs flex flex-col gap-1 transition-all border-l-2
                                ${idx === selectedIndex 
                                    ? 'bg-white/10 border-orange-500' 
                                    : 'border-transparent hover:bg-white/5'}
                            `}
                        >
                            <div className="flex justify-between items-center w-full">
                                <span className="flex items-center gap-2">
                                    <span className={`font-bold text-sm tracking-wide ${idx === selectedIndex ? 'text-white' : 'text-gray-300'}`}>
                                        {item.word}
                                    </span>
                                </span>
                                
                                {/* 语言/来源 徽章 */}
                                <div className="flex gap-1">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${getLangColor(item.lang)}`}>
                                        {item.lang}
                                    </span>
                                    {item.source === 'MEMORY' && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border border-cyan-800 text-cyan-600 bg-cyan-950">
                                            MEM
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 释义预览 */}
                            <div className="text-[10px] text-gray-500 truncate w-full font-serif opacity-80">
                                {item.definition}
                            </div>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
}