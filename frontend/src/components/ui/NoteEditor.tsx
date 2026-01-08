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
       - items-center: 让面板垂直居中
       - pl-4: 左侧留一点点缝隙，增加悬浮感
    */
    <div className={`
      fixed inset-0 z-50 flex items-center justify-start pl-6
      transition-all duration-500
      ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}
    `}>
      
      {/* 隐形护盾 (点击空白关闭) */}
      <div 
        className="absolute inset-0 bg-transparent cursor-default" 
        onClick={onClose}
      />

      {/* 战术面板主体 (悬浮卡片式) */}
      <div className={`
        relative w-80 md:w-96 h-[60%] bg-gray-950/60 backdrop-blur-2xl
        border border-cyan-500/30 rounded-2xl shadow-[20px_0_60px_rgba(0,0,0,0.8)]
        p-8 flex flex-col 
        transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1)
        ${isOpen ? 'translate-x-0' : '-translate-x-[120%]'}
      `}>
        
        {/* 装饰：发光边缘 */}
        <div className="absolute inset-0 rounded-2xl border border-cyan-500/10 pointer-events-none"></div>

        {/* 1. 标题区 */}
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <div className="text-[9px] text-cyan-500 font-mono tracking-[0.4em] opacity-60">
                    MEMORY_BANK
                </div>
                {/* 关闭小按钮 */}
                <button onClick={onClose} className="text-cyan-800 hover:text-cyan-400 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
            </div>
            
            <h2 className="text-3xl font-black text-white tracking-widest uppercase font-mono flex items-center gap-3">
                <span className="w-1.5 h-8 bg-cyan-500 shadow-[0_0_15px_rgba(0,255,255,0.6)]"></span>
                {centerNode.id}
            </h2>
        </div>

        {/* 2. 编辑区域 */}
        <div className="flex-1 flex flex-col relative bg-black/40 rounded-lg overflow-hidden border border-white/5 group focus-within:border-cyan-500/30 transition-colors">
            {/* 顶部标签 */}
            <div className="bg-cyan-950/30 px-3 py-1 text-[8px] text-cyan-600 font-mono tracking-widest flex justify-between border-b border-white/5">
                <span>// USER_DATA_ENTRY</span>
                <span className="animate-pulse">REC●</span>
            </div>
            
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Writing connection notes..."
                className="flex-1 bg-transparent text-cyan-100 p-4 font-serif text-base focus:outline-none resize-none leading-relaxed placeholder:opacity-20 scrollbar-thin scrollbar-thumb-cyan-900"
                autoFocus
            />
        </div>

        {/* 3. 底部指令区 */}
        <div className="mt-6">
            <button 
                onClick={handleSave}
                className="group w-full py-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs tracking-[0.3em] hover:bg-cyan-500 hover:text-black transition-all duration-300 uppercase font-bold rounded flex items-center justify-center gap-3"
            >
                <span>COMMIT</span>
                <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
        </div>

        {/* 4. 左侧装饰线 (连接感) */}
        <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 w-6 h-[1px] bg-cyan-500/30"></div>
        <div className="absolute top-1/2 left-0 -translate-x-[2px] -translate-y-1/2 w-1 h-8 bg-cyan-500"></div>
      </div>
    </div>
  );
}