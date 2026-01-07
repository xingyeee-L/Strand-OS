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
       - fixed inset-0: 占满全屏
       - z-50: 确保在最上层
       - pointer-events: 开启时设为 auto，拦截所有点击，防止穿透到 3D 场景
    */
    <div className={`
      fixed inset-0 z-50 flex justify-start
      transition-all duration-500
      ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}
    `}>
      
      {/* 🔥 隐形护盾：完全透明，但负责拦截点击并支持“点击空白处关闭” */}
      <div 
        className="absolute inset-0 bg-transparent cursor-default" 
        onClick={onClose}
      />

      {/* 战术面板主体 */}
      <div className={`
        relative w-80 md:w-96 h-full bg-gray-950/40 backdrop-blur-2xl
        border-r border-cyan-500/20 shadow-[20px_0_60px_rgba(0,0,0,0.6)]
        p-8 flex flex-col 
        transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1)
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* 1. 顶部避让与标题 */}
        <div className="mt-32 mb-8">
            <div className="text-[9px] text-cyan-500 font-mono tracking-[0.4em] mb-2 opacity-40">
                MEMORY_ISOLATION_MODE
            </div>
            <h2 className="text-2xl font-black text-white tracking-widest uppercase font-mono flex items-center gap-3">
                <span className="w-1.5 h-6 bg-cyan-500 shadow-[0_0_15px_rgba(0,255,255,0.6)]"></span>
                {centerNode.id}
            </h2>
            <div className="h-[1px] w-full bg-gradient-to-r from-cyan-500/30 to-transparent mt-4"></div>
        </div>

        {/* 2. 编辑区域 */}
        <div className="flex-1 flex flex-col relative">
            <div className="text-[8px] text-cyan-700 mb-2 font-mono tracking-tighter uppercase flex justify-between">
                <span>// Input_Stream_Locked</span>
                <span className="animate-pulse">REC●</span>
            </div>
            
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="在此注入战术记忆碎片..."
                className="flex-1 bg-transparent border-l border-cyan-500/10 text-cyan-100 p-4 font-serif text-base focus:outline-none focus:border-cyan-500/30 resize-none leading-relaxed placeholder:opacity-20"
                autoFocus
            />
        </div>

        {/* 3. 底部指令区 */}
        <div className="mt-8 flex flex-col gap-4">
            <button 
                onClick={handleSave}
                className="w-full py-4 bg-cyan-500/5 border border-cyan-500/30 text-cyan-400 font-mono text-xs tracking-[0.3em] hover:bg-cyan-500 hover:text-black transition-all duration-500 uppercase font-bold"
            >
                COMMIT_TO_DATABASE
            </button>
            
            <button 
                onClick={onClose}
                className="w-full py-2 text-[9px] font-mono text-gray-600 hover:text-cyan-500 transition-colors tracking-[0.4em]"
            >
                [ ABORT_INSCRIPTION ]
            </button>
        </div>

        {/* 4. 装饰：右侧边缘线 */}
        <div className="absolute top-0 right-0 h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent"></div>
      </div>
    </div>
  );
}