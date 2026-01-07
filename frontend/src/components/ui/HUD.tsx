// @ts-nocheck
import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/store';

export default function HUD({ hoverNarrative }) {
  const { 
    user, 
    centerNode, 
    neighbors, 
    isScanning, 
    isLinking, 
    establishLink, 
    lastNarrative 
  } = useGameStore();

  const [selectedNarrative, setSelectedNarrative] = useState(null);
  
  // 🔥 新增：预览状态 (存储鼠标悬停的那个节点信息)
  const [previewNode, setPreviewNode] = useState(null);

  // 剧情显示优先级
  const narrativeToShow = selectedNarrative || lastNarrative || hoverNarrative;

  useEffect(() => {
    setSelectedNarrative(null);
    setPreviewNode(null); // 切换中心词时清空预览
  }, [centerNode]);

  // 决定当前面板显示谁的信息 (优先显示预览的，否则显示中心的)
  const displayId = previewNode ? previewNode.id : (centerNode?.id || "");
  const displayContent = previewNode ? previewNode.content : (centerNode?.content || "正在解析语义...");
  
  // 如果是预览状态，标题颜色变一下，提示用户这是临时的
  const titleColor = previewNode ? "text-cyan-400" : "text-white";
  const titlePrefix = previewNode ? "> PREVIEW: " : "";

  return (
    <>
      {/* 1. 顶部状态栏 */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none select-none z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div>
            <h1 className="text-4xl font-bold text-cyan-500 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
                STRAND OS
            </h1>
            <div className="text-orange-500 text-xs font-mono mt-1 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isScanning || isLinking ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                {isScanning ? "JUMPING..." : (isLinking ? "LINKING..." : "SYSTEM ONLINE")}
            </div>
        </div>
        
        <div className="text-right">
            <div className="text-2xl font-bold text-white">LV.{user.level}</div>
            <div className="w-40 h-2 bg-gray-800 mt-1 rounded-full overflow-hidden border border-gray-700">
                <div 
                    className="h-full bg-orange-500 transition-all duration-1000 ease-out shadow-[0_0_10px_#ffaa00]" 
                    style={{ width: `${(user.current_xp / user.next_level_xp) * 100}%` }}
                ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1 font-mono">XP: {user.current_xp} / {user.next_level_xp}</div>
        </div>
      </div>

    </>
  );
}