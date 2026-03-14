import { useEffect, useState, useRef, useMemo } from 'react';
import { useGameStore } from '../../store/store';
import { useTypewriter } from '../../hooks/useTypewriter';
import { audioService } from '../../utils/AudioService';
import AIAvatar from './AIAvatar';
import { apiClient } from '../../services/apiClient';
import { t } from '../../i18n';

type SearchCandidate = {
  word: string;
  lang: string;
  definition: string;
  source: 'MEMORY' | 'CLOUD';
};

const IDLE_MESSAGES_ZH = [
  "正在监测手性网络密度，连接状态稳定。",
  "知识链路刻录就绪，等待注入指令。",
  "M4 核心算力负载均衡中，系统性能最优。",
  "系统完备率 98.4%。未发现虚爆风险。",
  "您那里天气好吗？",
  "有人对我说：“路遥知马力”，这对吗？",
];

const IDLE_MESSAGES_EN = [
  "Monitoring chiral network density. Link status stable.",
  "Knowledge imprinting ready. Awaiting command injection.",
  "Core compute balanced. System performance optimal.",
  "System integrity at 98.4%. No critical anomalies detected.",
  "How's the weather on your side?",
  "Someone told me: 'Distance tests a horse’s strength.' Is that right?",
];

// 辅助组件：信号干扰效果
const glitchChar = (char: string, index: number, seedText: string) => {
  const base = (seedText.length + 1) * 97;
  const hash = (base + index * 31 + char.charCodeAt(0) * 17) % 101;
  if (hash > 70) {
    return String.fromCharCode(33 + (hash % 30));
  }
  return char;
};

const GlitchText = ({ text }: { text: string }) => (
  <div className="relative inline-block text-orange-500/50 mix-blend-screen overflow-hidden font-mono">
    <span className="animate-pulse blur-[1px] opacity-70 select-none">
      {text
        .split('')
        .map((char, index) => glitchChar(char, index, text))
        .join('')}
    </span>
    <div className="absolute inset-0 bg-orange-500/10 animate-pulse"></div>
  </div>
);

export default function DialogueBar() {
  const {
    centerNode, neighbors, isScanning, isLinking, lastNarrative, agentState,
    performDeepScan, showNarrative, jumpTo, completeMission, establishLink, analyzeVision, agentChat, setAgentState, uiLang
  } = useGameStore();

  const [mode, setMode] = useState<'chat' | 'search'>('chat');
  const [chatInput, setChatInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchCandidates, setSearchCandidates] = useState<SearchCandidate[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [idleText, setIdleText] = useState(IDLE_MESSAGES_ZH[0]);

  const inputRef = useRef<HTMLInputElement>(null);

  // 状态判定
  const isReviewedToday = centerNode?.is_reviewed_today;
  const canSync = !isReviewedToday;
  const isMissionTarget = centerNode?.is_mission_target;

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // 1. 自动待机消息切换
  useEffect(() => {
    if (!lastNarrative && !isLinking && !isScanning && agentState === 'idle') {
      const pool = uiLang === 'zh' ? IDLE_MESSAGES_ZH : IDLE_MESSAGES_EN;
      if (pool[0]) setIdleText(pool[0]);
      const interval = setInterval(() => {
        setIdleText(pool[Math.floor(Math.random() * pool.length)]);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [lastNarrative, isLinking, isScanning, agentState, uiLang]);

  // 2. 语音播报触发
  useEffect(() => {
    if (lastNarrative) {
      audioService.speak(
        lastNarrative,
        () => setAgentState('speaking'),
        () => setAgentState('idle')
      );
    }
  }, [lastNarrative, setAgentState]);

  // 语音识别初始化
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        setIsRecording(true);
        setAgentState('listening');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setChatInput(transcript);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setAgentState('idle');
      };

      recognition.onerror = (event: any) => {
        console.error('STT Error', event.error);
        setIsRecording(false);
        setAgentState('idle');
      };

      recognitionRef.current = recognition;
    }
  }, [setAgentState]);

  const toggleRecording = () => {
    if (mode !== 'chat') return;
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      audioService.init();
      recognitionRef.current?.start();
    }
  };

  useEffect(() => {
    if (mode !== 'search') {
      setIsSearching(false);
      setSearchCandidates([]);
      setShowSearchDropdown(false);
      setSearchSelectedIndex(-1);
    } else {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [mode]);

  // 3. 搜索逻辑
  useEffect(() => {
    if (mode !== 'search') return;

    const q = searchInput.trim();
    const isWordQuery =
      q.length >= 2 &&
      q.length <= 30 &&
      !q.startsWith('/') &&
      !q.includes(' ') &&
      /^(?=.{2,30}$)[A-Za-zÄÖÜäöüß-]+$/.test(q);

    if (!isWordQuery) {
      setSearchCandidates([]);
      setShowSearchDropdown(false);
      setSearchSelectedIndex(-1);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get<SearchCandidate[]>('/search/hints', {
          params: { q },
        });
        const next = res.data || [];
        setSearchCandidates(next);
        if (next.length > 0) {
          setShowSearchDropdown(true);
          setSearchSelectedIndex(0);
        } else {
          setShowSearchDropdown(false);
          setSearchSelectedIndex(-1);
        }
      } catch (e) { console.error(e); } finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [mode, searchInput]);

  const executeCommand = async (candidate: SearchCandidate) => {
    audioService.playSFX('click');
    setShowSearchDropdown(false);
    setSearchInput("");
    await jumpTo(candidate.word, undefined, candidate.definition);
  };

  const runSearchSubmit = async () => {
    const q = searchInput.trim();
    if (!q) return;

    if (showSearchDropdown && searchCandidates.length > 0 && searchSelectedIndex >= 0) {
      await executeCommand(searchCandidates[searchSelectedIndex]);
      return;
    }

    const isWordQuery =
      q.length >= 2 &&
      q.length <= 30 &&
      !q.startsWith('/') &&
      !q.includes(' ') &&
      /^(?=.{2,30}$)[A-Za-zÄÖÜäöüß-]+$/.test(q);
    if (isWordQuery) {
      await jumpTo(q);
      setSearchInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'search') {
      if (e.key === 'Tab') {
        if (showSearchDropdown && searchCandidates.length > 0 && searchSelectedIndex >= 0) {
          e.preventDefault();
          executeCommand(searchCandidates[searchSelectedIndex]);
        }
        return;
      }

      if (e.key === 'Escape') {
        setShowSearchDropdown(false);
        setSearchSelectedIndex(-1);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        runSearchSubmit();
        return;
      }

      if (showSearchDropdown && searchCandidates.length > 0) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSearchSelectedIndex((prev) => (prev > 0 ? prev - 1 : searchCandidates.length - 1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSearchSelectedIndex((prev) => (prev < searchCandidates.length - 1 ? prev + 1 : 0));
        }
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualCommand();
    }
  };

  // --- 4. 文本渲染核心逻辑 (强化版) ---
  const narrativeText = useMemo(() => {
    if (isLinking) return t(uiLang, 'dialogue.linking');
    return lastNarrative || idleText;
  }, [isLinking, lastNarrative, idleText, uiLang]);
  const typewriterKey = useMemo(() => {
    return (lastNarrative?.slice(0, 10) || "idle") + isLinking + (isSearching ? "S" : "");
  }, [lastNarrative, isLinking, isSearching]);
  const displayNarrative = useTypewriter(narrativeText, 25);

  const handleInteraction = (type: 'click' | 'hover') => {
    audioService.init();
    if (type === 'click') audioService.playSFX('click');
    else audioService.playSFX('hover', 0.1);
  };

  const handleVisionScan = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    setAgentState('observing');
    const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    audioService.playSFX('scan');
    await analyzeVision(b64, chatInput.trim() || undefined);
    setAgentState('speaking');
    setTimeout(() => setAgentState('idle'), 3000);
  };

  const handleManualCommand = async () => {
    if (!chatInput.trim()) return;
    const cmd = chatInput.trim();

    // 意图解析
    if (cmd.startsWith('/jump ')) {
      const word = cmd.slice(6).trim();
      await jumpTo(word);
    } else if (cmd.startsWith('/scan')) {
      await performDeepScan();
    } else {
      // 默认自由对话
      await agentChat(cmd);
    }
    setChatInput("");
  };

  if (!centerNode) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full h-60 z-50 flex bg-gray-950/95 backdrop-blur-xl border-t-2 border-cyan-500/50 text-white font-rpg shadow-[0_-10px_50px_rgba(0,0,0,0.8)] pointer-events-auto transition-all duration-500">

      {/* 1. 左侧 Avatar */}
      <div className="w-40 h-full border-r border-white/10 flex flex-col items-center justify-center bg-black/40">
        <AIAvatar state={agentState} />
        <div className="w-full h-1 mt-auto bg-gray-900 flex">
          <div className={`h-full transition-all duration-300 ${isLinking ? 'w-full bg-orange-500 animate-pulse' : 'w-1/3 bg-cyan-500'}`}></div>
        </div>
      </div>

      {/* 2. 中间指挥区 */}
      <div className="flex-1 flex flex-col relative px-8 py-6">
        <div className="flex-1 overflow-y-auto scrollbar-none mb-4 relative">
          <div className="flex items-center justify-between mb-2 sticky top-0 bg-gray-950/0 w-full z-10">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLinking ? 'bg-orange-500 animate-ping' : 'bg-orange-600 shadow-[0_0_8px_orange]'}`}></span>
              <span className="text-[10px] text-orange-500 font-bold tracking-widest uppercase opacity-90">{t(uiLang, 'dialogue.logTitle')}</span>
            </div>
            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                onClick={() => setMode('chat')}
                className={`px-2 py-1 text-[9px] font-mono font-black tracking-widest border rounded-sm transition-all ${mode === 'chat'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-black/20 border-white/10 text-gray-500 hover:text-cyan-400'
                  }`}
              >
                {t(uiLang, 'dialogue.chat')}
              </button>
              <button
                onClick={() => setMode('search')}
                className={`px-2 py-1 text-[9px] font-mono font-black tracking-widest border rounded-sm transition-all ${mode === 'search'
                  ? 'bg-orange-500/15 border-orange-400 text-orange-200'
                  : 'bg-black/20 border-white/10 text-gray-500 hover:text-orange-300'
                  }`}
              >
                {t(uiLang, 'dialogue.search')}
              </button>
            </div>
          </div>

          {/* 打字机显示区域 */}
          <div key={typewriterKey} className="text-base leading-relaxed text-orange-100/90 font-serif">
            {isLinking ? <GlitchText text={t(uiLang, 'dialogue.decrypting')} /> : displayNarrative}
            {!isLinking && <span className="inline-block w-2 h-4 bg-orange-500/60 ml-1 animate-pulse" />}
          </div>
        </div>

        <div className="relative w-full h-12 group">
          {mode === 'search' && showSearchDropdown && searchCandidates.length > 0 && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-black/95 border border-cyan-500/30 rounded-t shadow-2xl overflow-hidden z-50">
              <ul className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900">
                {searchCandidates.map((item, idx) => (
                  <li key={idx}>
                    <button
                      onMouseEnter={() => handleInteraction('hover')}
                      onClick={() => executeCommand(item)}
                      className={`w-full text-left px-5 py-3 text-xs flex justify-between items-center border-l-2 ${idx === searchSelectedIndex
                        ? 'bg-white/10 border-cyan-400 text-white'
                        : 'border-transparent text-gray-400'
                        }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold uppercase tracking-wider text-sm">{item.word}</span>
                        <span className="text-[10px] opacity-40 italic">{item.definition}</span>
                      </div>
                      <span
                        className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${item.lang === 'DE'
                          ? 'border-yellow-700 text-yellow-500'
                          : 'border-cyan-700 text-cyan-500'
                          }`}
                      >
                        {item.lang}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="absolute inset-0 bg-cyan-950/20 border border-cyan-500/30 rounded-lg flex items-center px-4">
            <span className={`mr-4 font-mono text-xl select-none ${isSearching ? 'text-orange-500 animate-spin' : 'text-cyan-500'}`}>&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={mode === 'chat' ? chatInput : searchInput}
              onChange={(e) => (mode === 'chat' ? setChatInput(e.target.value) : setSearchInput(e.target.value))}
              onKeyDown={handleKeyDown}
              onFocus={() => audioService.init()}
              placeholder={mode === 'chat' ? t(uiLang, 'dialogue.placeholderChat') : t(uiLang, 'dialogue.placeholderSearch')}
              className="w-full bg-transparent border-none outline-none text-cyan-100 placeholder-cyan-900 font-mono text-base h-full"
              autoComplete="off"
            />
            {mode === 'chat' && (
              <button
                onClick={toggleRecording}
                className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'text-cyan-700 hover:text-cyan-400'
                  }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 text-[9px] text-cyan-900/70 font-mono tracking-widest select-none">
          {mode === 'chat' ? t(uiLang, 'dialogue.hintChat') : t(uiLang, 'dialogue.hintSearch')}
        </div>
      </div>
      {/* 3. 右侧 Network */}
      <div className="w-64 md:w-72 bg-black/60 border-l border-white/10 p-3 flex flex-col overflow-hidden relative">
        <div className="flex justify-between items-center mb-2 px-1 border-b border-white/5 pb-1">
          <span className="text-[9px] uppercase text-cyan-700 font-mono font-black tracking-widest">{t(uiLang, 'dialogue.networkTitle')}</span>
          <span className="text-[10px] text-gray-600 font-mono">{neighbors.length} {t(uiLang, 'dialogue.objects')}</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-cyan-900/30">
          {neighbors.map((node) => (
            <button
              key={node.id}
              onMouseEnter={() => handleInteraction('hover')}
              onClick={() => {
                audioService.playSFX('click');
                if (node.is_linked) {
                  showNarrative(node.id);
                } else {
                  establishLink(node.id, 'auto');
                }
              }}
              className={`w-full text-left mb-0.5 px-2 py-1.5 text-[11px] font-mono border-l-2 transition-all ${node.is_linked ? 'border-orange-500 text-orange-200 bg-orange-950/5' : 'border-cyan-900 text-cyan-600 hover:border-cyan-500'}`}
            >
              {node.id.toUpperCase()}
            </button>
          ))}
        </div>

        {!isScanning && (
          <div className="mt-2 pt-2 border-t border-white/10 bg-black/40">
            <div className="flex gap-1.5">
              <button
                disabled={!canSync || isLinking}
                onClick={async () => {
                  handleInteraction('click');
                  await completeMission(centerNode.id); // 后端自动生成 AI 笔记
                  audioService.playSFX('success');
                }}
                className={`flex-1 py-1.5 border font-black text-[9px] uppercase transition-all rounded-sm
                        ${canSync
                    ? 'bg-orange-500/20 border-orange-500 text-orange-500 hover:bg-orange-500 animate-pulse'
                    : 'bg-cyan-950/30 border-cyan-900/50 text-cyan-800 cursor-not-allowed opacity-80'}`}
              >
                {isLinking ? t(uiLang, 'dialogue.syncing') : (canSync ? t(uiLang, 'dialogue.syncLink') : t(uiLang, 'dialogue.stable'))}
              </button>

              <button onClick={() => { audioService.playSFX('scan'); performDeepScan(); }} className="flex-1 py-1.5 bg-cyan-950/40 border border-cyan-500/40 text-cyan-400 text-[9px] font-black uppercase rounded-sm">
                {t(uiLang, 'dialogue.scan')}
              </button>
              <button onClick={handleVisionScan} className="flex-1 py-1.5 bg-orange-950/40 border border-orange-500/40 text-orange-400 text-[9px] font-black uppercase rounded-sm">
                {t(uiLang, 'dialogue.observe')}
              </button>
            </div>
            {isMissionTarget && canSync && (
              <div className="text-[7px] text-orange-600 font-mono text-center mt-1 animate-pulse font-bold">
                {t(uiLang, 'dialogue.syncRequired')}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
