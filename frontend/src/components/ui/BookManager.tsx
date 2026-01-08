import { useEffect } from 'react';
import { useGameStore } from '../../store/store';

interface Props {
  onClose: () => void;
}

export default function BookManager({ onClose }: Props) {
  const { availableBooks, currentBook, bookProgress, fetchBooks, setBook } = useGameStore();

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300">
      
      {/* 隐形护盾：点击空白关闭 */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* 面板主体 */}
      <div className="w-[640px] h-[420px] bg-gray-950 border border-cyan-500/30 flex shadow-[0_0_50px_rgba(0,255,255,0.15)] relative rounded-lg overflow-hidden">
        
        {/* 关闭按钮 */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-white z-10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* 1. 左侧：当前状态 (Status Panel) */}
        <div className="w-2/5 border-r border-cyan-500/20 p-8 flex flex-col justify-between bg-cyan-950/10 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.5)]"></div>
            
            <div>
                <div className="text-[10px] text-cyan-500 tracking-[0.2em] mb-3 uppercase opacity-70">
                    Active Protocol
                </div>
                <div className="text-3xl font-black text-white break-words leading-tight tracking-wide">
                    {currentBook || "NO DATA"}
                </div>
                {currentBook && (
                   <div className="mt-2 text-[10px] text-green-500 font-mono flex items-center gap-2">
                     <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                     ONLINE
                   </div>
                )}
            </div>
            
            <div>
                <div className="text-[10px] text-gray-500 mb-2 font-mono">PROGRESS INDEX</div>
                <div className="text-5xl font-mono text-cyan-400 tracking-tighter">
                    {bookProgress}
                </div>
                <div className="text-[9px] text-gray-600 mt-1 uppercase">Words Ingested</div>
            </div>
        </div>

        {/* 2. 右侧：书库列表 (Library List) */}
        <div className="flex-1 p-6 overflow-y-auto bg-black/20 scrollbar-thin scrollbar-thumb-gray-800">
            <div className="text-[10px] text-gray-500 tracking-[0.2em] mb-5 border-b border-white/5 pb-2">
                AVAILABLE DATABASES
            </div>
            
            <div className="flex flex-col gap-3">
                {/* 
                   backend 返回的 availableBooks 结构应该是: 
                   [{ name: "IELTS.txt", total: 3000 }, ...]
                   或者如果是简单的 string[]，我们需要适配
                   (根据之前的 endpoints.py，现在返回的是对象数组)
                */}
                {availableBooks.map((book: any) => (
                    <button
                        key={book.name}
                        onClick={() => setBook(book.name)}
                        className={`
                            relative w-full text-left p-4 border text-xs font-mono transition-all group rounded-sm overflow-hidden
                            ${currentBook === book.name 
                                ? 'border-cyan-500 bg-cyan-500/10 text-white' 
                                : 'border-white/10 text-gray-400 hover:border-cyan-500/50 hover:bg-white/5'}
                        `}
                    >
                        <div className="flex justify-between items-center z-10 relative">
                            <span className="font-bold tracking-wide text-sm">{book.name}</span>
                            <span className="text-[10px] opacity-50">{book.total} ENTRIES</span>
                        </div>

                        {/* 进度条背景 */}
                        {currentBook === book.name && (
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800 mt-3">
                                <div 
                                    className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.5)] transition-all duration-1000" 
                                    style={{ width: `${Math.min(100, (bookProgress / book.total) * 100)}%` }}
                                ></div>
                            </div>
                        )}
                        
                        {/* 激活标记 */}
                        {currentBook === book.name && (
                            <div className="absolute right-0 top-0 w-0 h-0 border-t-[10px] border-r-[10px] border-t-cyan-500 border-r-cyan-500 opacity-50"></div>
                        )}
                    </button>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}