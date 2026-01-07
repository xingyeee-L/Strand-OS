import { useRef, useState } from 'react';
import { useGameStore } from '../../store/store'; // <--- 修正

export default function DataUplink() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useGameStore(state => state.uploadFile);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      await uploadFile(file);
      setIsUploading(false);
      // 清空 input 允许再次上传同名文件
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="absolute bottom-10 right-10 pointer-events-auto select-none z-20">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept=".pdf,.txt,.md"
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`
          flex items-center gap-2 px-6 py-3 border-2 
          transition-all duration-300 group
          ${isUploading 
            ? 'border-yellow-500 bg-yellow-900/50 text-yellow-500 cursor-wait' 
            : 'border-cyan-800 bg-black/80 text-cyan-500 hover:border-cyan-400 hover:bg-cyan-900/30'
          }
        `}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isUploading ? 'animate-bounce' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        
        <span className="font-mono font-bold tracking-widest text-sm">
          {isUploading ? "UPLOADING DATA..." : "INGEST DATA"}
        </span>
      </button>
      
      {/* 底部装饰线 */}
      <div className="h-1 w-full bg-cyan-900 mt-1 group-hover:bg-cyan-500 transition-colors"></div>
    </div>
  );
}