import { useRef, useState } from 'react';
import { useGameStore } from '../../store/store';
import { useTypewriter } from '../../hooks/useTypewriter';
import NoteEditor from './NoteEditor'; // 🔥 确保此文件已存在

export default function TargetHeader() {
  const { centerNode, isScanning, uploadFile } = useGameStore();
  
  // --- A. Data Uplink Logic (右翼) ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsUploading(true);
      await uploadFile(file);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- B. Note Logic (左翼 - 核心修复点) ---
  // 移除之前的 alert 逻辑，改用状态控制
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // --- C. Display Logic ---
  const title = centerNode?.id || "NO TARGET";
  const rawDefinition = isScanning 
    ? "SCANNING..." 
    : (centerNode?.content || "SYSTEM STANDBY");
  
  const displayDefinition = useTypewriter(rawDefinition, 5);

  return (
    <>
      {/* 🔥 1. 挂载编辑器 Modal (放在最外层，确保 z-index 层级正确) */}
      <NoteEditor 
        isOpen={isEditorOpen} 
        onClose={() => setIsEditorOpen(false)} 
      />

      <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-40">
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".pdf,.txt,.md"
        />

        {/* === 主轮盘容器 === */}
        <div className="relative mt-0 pointer-events-auto group">
          
          {/* 1. 背景光环 */}
          <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[150%] rounded-b-full border-b border-cyan-500/30 bg-black/90 backdrop-blur-md shadow-[0_10px_50px_rgba(0,0,0,0.5)] -z-10 clip-path-circle"></div>
          
          {/* 2. 核心内容区 */}
          <div className="w-[500px] h-36 flex flex-col items-center pt-4 relative">
              <div className="w-1/3 h-1 bg-cyan-500 mb-2 shadow-[0_0_10px_rgba(0,255,255,0.5)]"></div>

              {/* Title */}
              <div className="text-4xl font-black text-white tracking-[0.2em] font-mono drop-shadow-md">
                  {title}
              </div>

              {/* Badges */}
              {centerNode && (
                  <div className="flex gap-2 mt-1 opacity-70 mb-2">
                      <span className="text-[9px] border border-cyan-800 text-cyan-500 px-1 rounded bg-black">
                          Lv.{centerNode.mastery_level}
                      </span>
                      <span className="text-[9px] border border-gray-700 text-gray-400 px-1 rounded bg-black">
                          SECURE
                      </span>
                  </div>
              )}

              {/* 释义滚动区 */}
              <div className="px-10 text-center w-full pointer-events-auto">
                  <div className="text-xs md:text-sm text-cyan-100/90 font-serif leading-relaxed h-14 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent pr-2">
                      <span className="w-1 h-1 bg-orange-500 rounded-full inline-block mr-2 align-middle"></span>
                      {displayDefinition}
                  </div>
              </div>
          </div>

          {/* 3. 左翼：笔记接口 (🔥 修复点: 绑定 setIsEditorOpen) */}
          <div className="absolute top-4 left-4 -translate-x-full flex items-center flex-row-reverse group/note">
              <div className="w-8 h-[1px] bg-cyan-500/50"></div>
              <button
                  onClick={() => setIsEditorOpen(true)} // 🔥 唤起全息编辑器
                  className="relative w-10 h-10 flex items-center justify-center border border-cyan-800 bg-black/80 hover:bg-cyan-900/30 hover:border-cyan-400 transition-all rounded-l-md"
                  title="添加单词笔记"
              >
                  {/* 如果 centerNode 有笔记，图标颜色加深或点亮 (可选视觉反馈) */}
                  <svg 
                    className={`w-4 h-4 transition-colors ${centerNode?.note ? 'text-cyan-300' : 'text-cyan-600'} group-hover/note:text-cyan-300`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <div className="absolute top-full mt-1 right-0 text-[8px] font-bold tracking-widest text-cyan-700 uppercase whitespace-nowrap opacity-0 group-hover/note:opacity-100 transition-opacity">
                      ADD NOTE
                  </div>
              </button>
          </div>

          {/* 4. 右翼：数据接口 */}
          <div className="absolute top-4 right-4 translate-x-full flex items-center group/uplink">
              <div className="w-8 h-[1px] bg-cyan-500/50"></div>
              <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="relative w-10 h-10 flex items-center justify-center focus:outline-none"
                  title="上传全局记忆 (RAG)"
              >
                  <div className={`absolute inset-0 border-2 border-dashed rounded-full transition-all duration-1000 
                      ${isUploading 
                          ? 'border-yellow-500 animate-spin' 
                          : 'border-cyan-800 group-hover/uplink:border-cyan-400 group-hover/uplink:rotate-180'
                      }`}
                  ></div>
                  <div className={`absolute inset-1 rounded-full bg-black/90 flex items-center justify-center border transition-colors
                      ${isUploading ? 'border-yellow-500/50' : 'border-cyan-900 group-hover/uplink:border-cyan-500'}`}
                  >
                      <svg 
                          className={`w-4 h-4 transition-colors ${isUploading ? 'text-yellow-500' : 'text-cyan-600 group-hover/uplink:text-cyan-300'}`} 
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                          {isUploading ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          )}
                      </svg>
                  </div>
                  <div className="absolute top-full mt-1 left-0 text-[8px] font-bold tracking-widest text-cyan-700 uppercase whitespace-nowrap opacity-0 group-hover/uplink:opacity-100 transition-opacity">
                      {isUploading ? "UPLOADING..." : "INGEST DATA"}
                  </div>
              </button>
          </div>

        </div>
      </div>
    </>
  );
}