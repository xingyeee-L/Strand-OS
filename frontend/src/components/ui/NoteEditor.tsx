import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/store';

interface NoteEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NoteEditor({ isOpen, onClose }: NoteEditorProps) {
  const { centerNode, saveNote } = useGameStore();
  const [text, setText] = useState("");

  useEffect(() => {
    if (isOpen && centerNode) {
      setText(centerNode.note || "");
    }
  }, [isOpen, centerNode]);

  if (!centerNode) return null;

  const handleSave = async () => {
    await saveNote(text);
    onClose();
  };

  return (
    /* 
       外层容器：
       - top-24: 严格对齐 MissionBoard 顶部
       - bottom-[13rem]: 严格对齐 MissionBoard 底部
       - left-0: 靠左对齐
    */
    <div className={`
      fixed top-24 bottom-[13rem] left-0 z-50 flex justify-start pl-6
      transition-all duration-500
      ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}
    `}>
      
      {/* 隐形护盾：拦截点击穿透 */}
      <div 
        className="absolute inset-0 bg-transparent cursor-default" 
        onClick={onClose}
      />

      {/* 战术面板主体 */}
      <div className={`
        relative w-80 md:w-96 h-full bg-gray-950/70 backdrop-blur-2xl
        border border-cyan-500/30 rounded-2xl shadow-[20px_0_60px_rgba(0,0,0,0.8)]
        p-8 flex flex-col 
        transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1)
        ${isOpen ? 'translate-x-0' : '-translate-x-[120%]'}
      `}>
        
        {/* 发光装饰边缘 */}
        <div className="absolute inset-0 rounded-2xl border border-cyan-500/10 pointer-events-none"></div>

        {/* 1. 头部标题区 */}
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <div className="text-[9px] text-cyan-600 font-mono tracking-[0.4em] font-bold">
                    // STORAGE_CHANNELS
                </div>
                <button onClick={onClose} className="text-cyan-900 hover:text-cyan-400 transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            
            <h2 className="text-3xl font-black text-white tracking-widest uppercase font-mono flex items-center gap-3">
                <span className="w-1.5 h-8 bg-cyan-500 shadow-[0_0_15px_rgba(0,255,255,0.6)]"></span>
                {centerNode.id}
            </h2>
        </div>

        {/* 2. 编辑区域 (自动撑开 flex-1) */}
        <div className="flex-1 flex flex-col relative bg-black/50 rounded-xl overflow-hidden border border-white/5 focus-within:border-cyan-500/40 transition-all">
            <div className="bg-cyan-950/40 px-3 py-1.5 text-[8px] text-cyan-400 font-mono tracking-widest flex justify-between border-b border-white/5">
                <span>INSCRIBE_MEMORY_FRAGMENT</span>
                <span className="animate-pulse">ONLINE</span>
            </div>
            
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="在此注入战术笔记..."
                className="flex-1 bg-transparent text-cyan-50 p-5 font-serif text-base focus:outline-none resize-none leading-relaxed placeholder:opacity-10 scrollbar-thin scrollbar-thumb-cyan-900"
                autoFocus
            />
            
            {/* 底部动态装饰 */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
        </div>

        {/* 3. 底部操作指令 */}
        <div className="mt-6 flex flex-col gap-2">
            <button 
                onClick={handleSave}
                className="group w-full py-4 bg-cyan-600/10 border border-cyan-500/40 text-cyan-400 font-mono text-xs tracking-[0.3em] hover:bg-cyan-500 hover:text-black transition-all duration-300 uppercase font-black rounded flex items-center justify-center gap-3"
            >
                <span>SYNCHRONIZE</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
            <div className="text-center text-[7px] text-cyan-900 tracking-tighter">DATA INTEGRITY GUARANTEED BY CHIRAL NETWORK</div>
        </div>

        {/* 4. 左侧锚点线条 (增加悬浮实感) */}
        <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 w-6 h-[1px] bg-cyan-500/20"></div>
        <div className="absolute top-1/2 left-[-4px] -translate-y-1/2 w-1 h-12 bg-cyan-500/50 rounded-full"></div>
      </div>
    </div>
  );
}