import { useState, useEffect, useRef } from 'react';

export const useTypewriter = (text: string, speed: number = 30) => {
  const [displayText, setDisplayText] = useState('');
  
  // 索引追踪
  const index = useRef(0);
  
  // 🔥 修复点：移除 <NodeJS.Timeout>。
  // 使用 ReturnType<typeof setInterval> 是最优雅的写法，
  // 它会自动识别当前环境是 Browser(返回number) 还是 Node(返回对象)。
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // 1. 重置
    index.current = 0;
    setDisplayText('');
    if (timer.current) clearInterval(timer.current);

    if (!text) return;

    // 2. 启动
    timer.current = setInterval(() => {
      index.current++;
      
      // 使用 slice 切片，绝对稳健
      setDisplayText(text.slice(0, index.current));

      if (index.current >= text.length) {
        if (timer.current) clearInterval(timer.current);
      }
    }, speed);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, speed]);

  if (speed === 0) return text;

  return displayText;
};