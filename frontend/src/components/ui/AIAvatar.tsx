import { useEffect, useState } from 'react';

interface AIAvatarProps {
  state: 'idle' | 'processing' | 'error';
}

export default function AIAvatar({ state }: AIAvatarProps) {
  // 内部维护一个随机的 glitch 状态，模拟信号干扰
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    if (state === 'processing') {
      const interval = setInterval(() => {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 100);
      }, 2000); // 每2秒抖动一次
      return () => clearInterval(interval);
    }
  }, [state]);

  // 颜色映射
  const colorClass = state === 'processing' ? 'text-orange-500' : 'text-cyan-400';
  const shadowClass = state === 'processing' ? 'shadow-orange-500/50' : 'shadow-cyan-500/50';

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/80 overflow-hidden border border-white/5">
      
      {/* 1. 背景网格扫描线 */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className={`w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px] ${state === 'processing' ? 'animate-pulse' : ''}`}></div>
      </div>

      {/* 2. 核心 SVG 动画 */}
      <div className={`relative z-10 w-24 h-24 transition-all duration-500 ${glitch ? 'translate-x-1 opacity-80' : ''}`}>
        <svg viewBox="0 0 100 100" className={`w-full h-full ${colorClass} transition-colors duration-500`}>
            
            {/* A. 外环：刻度盘 */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 2" className="opacity-30 animate-[spin_10s_linear_infinite]" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="20 60" className="opacity-60 animate-[spin_5s_linear_infinite_reverse]" />

            {/* B. 中环：聚焦环 */}
            <circle 
              cx="50" cy="50" r="30" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              className={`transition-all duration-500 ${state === 'processing' ? 'r-[25] stroke-[4] opacity-100' : 'opacity-50'}`} 
            />

            {/* C. 内核：瞳孔 */}
            <circle 
              cx="50" cy="50" 
              r={state === 'processing' ? 10 : 5} 
              className={`fill-current transition-all duration-300 ${state === 'processing' ? 'animate-ping' : 'animate-pulse'}`} 
            />
            
            {/* D. 装饰：十字准星 */}
            <path d="M50 10v80 M10 50h80" stroke="currentColor" strokeWidth="0.5" className="opacity-20" />
        </svg>
        
        {/* 光晕效果 */}
        <div className={`absolute inset-0 rounded-full blur-xl opacity-20 bg-current animate-pulse ${colorClass}`}></div>
      </div>

      {/* 3. 状态标签 HUD */}
      <div className="absolute bottom-2 left-0 w-full text-center">
         <div className={`text-[9px] font-mono tracking-[0.3em] font-bold ${colorClass} ${glitch ? 'opacity-0' : 'opacity-100'}`}>
            {state === 'processing' ? 'CALCULATING' : 'STANDBY'}
         </div>
      </div>

      {/* 4. 扫描光束 (Scanline) */}
      <div className="absolute inset-0 z-20 pointer-events-none opacity-30 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-[scan_3s_linear_infinite]"></div>
    </div>
  );
}