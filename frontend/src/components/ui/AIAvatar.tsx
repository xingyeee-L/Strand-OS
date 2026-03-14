import { useEffect, useState } from 'react';
import type { AgentState } from '../../store/store';

interface AIAvatarProps {
  state: AgentState | 'error';
}

export default function AIAvatar({ state }: AIAvatarProps) {
  // 内部维护一个随机的 glitch 状态，模拟信号干扰
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (state !== 'idle') {
      const interval = setInterval(() => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 100);
      }, state === 'synthesizing' ? 500 : 2000);
      return () => clearInterval(interval);
    }
  }, [state]);

  // 颜色映射
  const getColor = () => {
    switch (state) {
      case 'listening': return 'text-green-500';
      case 'observing': return 'text-purple-500';
      case 'synthesizing': return 'text-orange-500';
      case 'speaking': return 'text-cyan-400';
      case 'error': return 'text-red-500';
      default: return 'text-cyan-600/50';
    }
  };

  const colorClass = getColor();
  const isActive = state !== 'idle' && state !== 'error';

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/80 overflow-hidden border border-white/5">

      {/* 1. 背景网格扫描线 */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className={`w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px] ${isActive ? 'animate-pulse' : ''}`}></div>
      </div>

      {/* 2. 核心 SVG 动画 */}
      <div className={`relative z-10 w-24 h-24 transition-all duration-500 ${glitch ? 'translate-x-1 opacity-80' : ''}`}>
        <svg viewBox="0 0 100 100" className={`w-full h-full ${colorClass} transition-colors duration-500`}>

          {/* A. 外环：刻度盘 */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 4" className={isActive ? "animate-[spin_20s_linear_infinite]" : ""} />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="80 170" className={isActive ? "animate-[spin_10s_linear_infinite]" : ""} />

          {/* B. 中环：六边形框 */}
          <path
            d="M50 20 L76 35 L76 65 L50 80 L24 65 L24 35 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={state === 'synthesizing' ? "animate-pulse" : ""}
          />

          {/* C. 内核：动态波纹 */}
          <circle cx="50" cy="50" r="12" fill="currentColor" className="opacity-20 animate-ping" />
          <circle cx="50" cy="50" r="8" fill="currentColor" className={state === 'synthesizing' ? "animate-bounce" : "animate-pulse"} />

          {/* D. 扫描指针 */}
          {isActive && (
            <line x1="50" y1="50" x2="50" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="origin-center animate-[spin_3s_ease-in-out_infinite]" />
          )}
        </svg>
      </div>

      {/* 3. 状态标签 */}
      <div className="absolute bottom-2 left-0 w-full text-center">
        <span className={`text-[8px] font-mono font-bold tracking-[0.3em] uppercase ${colorClass}`}>
          {state}
        </span>
      </div>
    </div>
  );
}