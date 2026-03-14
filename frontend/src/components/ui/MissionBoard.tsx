import { useState } from 'react';
import { useGameStore } from '../../store/store';
import BookManager from './BookManager'; 
import { t } from '../../i18n';

export default function MissionBoard() {
  const { missions, jumpTo, requestExtraMission, cancelMission, uiLang } = useGameStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showBooks, setShowBooks] = useState(false);

  // 计算任务进度
  const getProgress = (m: any) => {
    if (m.status === 'completed') return 100;
    if (!m.targets || m.targets.length === 0) return 0;
    const doneCount = m.targets.filter((t: any) => t.reviewed).length;
    return (doneCount / m.targets.length) * 100;
  };

  return (
    <>
      {showBooks && <BookManager onClose={() => setShowBooks(false)} />}

      {/* 
          外层容器：
          - top-24: 避让顶部 Header
          - bottom-50: 确保底部不接触对话框 (DialogueBar h-50)
      */}
      <div 
          className={`
              fixed top-24 bottom-60 right-0 z-30 flex items-start pointer-events-auto
              transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
              ${isCollapsed ? 'translate-x-[calc(100%-3rem)]' : 'translate-x-0'}
          `}
      >
        
        {/* 1. 把手 (Handle) */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="relative -mr-[1px] mt-4 flex flex-col items-center gap-2 bg-black/90 border-y border-l border-cyan-500/50 p-2 rounded-l-md shadow-[-10px_0_20px_rgba(0,0,0,0.5)] group hover:bg-cyan-900/20 transition-colors py-4 w-12 h-40"
        >
          <svg 
              className={`w-4 h-4 text-cyan-500 transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          <div className="writing-vertical-rl text-[9px] font-mono tracking-[0.2em] text-gray-500 uppercase flex-1 flex items-center justify-center group-hover:text-cyan-400">
              {isCollapsed ? t(uiLang, 'mission.openData') : t(uiLang, 'mission.missions')}
          </div>
          {/* 进度点指示器 */}
          <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse mb-2"></div>
        </button>

        {/* 2. 任务列表主体 (Drawer Body) */}
        {/* 🔥 使用 flex flex-col h-full 充满可用高度 */}
        <div className="bg-black/85 backdrop-blur-2xl border-l border-b border-cyan-500/30 w-72 h-full shadow-2xl flex flex-col rounded-bl-3xl overflow-hidden">
          
          {/* A. 头部：固定不动 */}
          <div className="p-5 pb-3 border-b border-white/5 flex justify-between items-end bg-cyan-950/10">
              <div className="flex flex-col">
                  <h3 className="text-sm font-black text-white tracking-widest font-mono">{t(uiLang, 'mission.dailyOrders')}</h3>
                  <div className="text-[9px] text-cyan-600 font-bold mt-1">
                    {missions.filter(m => m.status === 'active').length} {t(uiLang, 'mission.pendingCount')}
                  </div>
              </div>
              <button 
                  onClick={() => setShowBooks(true)} 
                  className="text-gray-500 hover:text-cyan-400 p-1.5 border border-white/10 rounded-lg hover:bg-cyan-500/10 transition-all"
                  title={t(uiLang, 'mission.switchVocabulary')}
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
              </button>
          </div>

          {/* B. 任务滚动容器：🔥 自动滑动区域 */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">
              {missions.length === 0 && (
                  <div className="text-gray-700 text-xs italic text-center py-10 border border-dashed border-gray-800 rounded">
                      {t(uiLang, 'mission.noStreams')}
                  </div>
              )}
            {missions.map((m) => (
              <div key={m.id} className="relative border-l border-white/5 pl-3 group/block">
                {/* 1. 任务头：增加取消按钮 */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold tracking-tighter ${m.type.includes('review') ? 'bg-orange-950/50 text-orange-500 border border-orange-500/20' : 'bg-cyan-950/50 text-cyan-500 border border-cyan-500/20'}`}>
                      {m.type.includes('review') ? t(uiLang, 'mission.reinforce') : t(uiLang, 'mission.explore')}
                    </span>
                {/* 🔥 [新增] 取消按钮：仅在 Block 悬停时显现，保持界面整洁 */}
                    <button 
                        onClick={() => cancelMission(m.id)}
                        className="opacity-0 group-hover/block:opacity-100 transition-opacity text-red-500/50 hover:text-red-500 text-[8px] font-mono"
                      >
                        {t(uiLang, 'mission.abort')}
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-500 font-mono">+{m.xp_reward}XP</span>
                </div>
                  
                  {/* 单词列表 */}
                  <div className="flex flex-col gap-1.5 mb-3">
                      {m.targets?.map((t: any) => (
                          <button 
                              key={t.word} 
                              onClick={() => jumpTo(t.word)}
                              className={`
                                  text-left text-xs px-2.5 py-2 rounded border border-white/5 flex items-center justify-between group/word
                                  transition-all duration-300
                                  ${t.reviewed 
                                      ? 'bg-green-900/5 text-gray-600 border-transparent opacity-40' 
                                      : 'bg-white/5 text-gray-200 hover:bg-cyan-900/20 hover:border-cyan-500/40 hover:pl-4'}
                              `}
                          >
                              <div className="flex items-center gap-2">
                                  <div className={`w-1 h-1 rounded-full ${t.reviewed ? 'bg-green-600' : 'bg-orange-500 animate-pulse'}`}></div>
                                  <span className={`font-mono ${t.reviewed ? 'line-through' : 'font-bold'}`}>{t.word}</span>
                              </div>
                              {t.reviewed && <span className="text-[7px] font-bold">{t(uiLang, 'mission.ok')}</span>}
                          </button>
                      ))}
                  </div>

                  {/* 进度条 */}
                  <div className="w-full h-[2px] bg-gray-800 rounded-full overflow-hidden">
                      <div 
                          className={`h-full transition-all duration-700 ${m.status === 'completed' ? 'bg-green-600' : 'bg-cyan-500'}`}
                          style={{ width: `${getProgress(m)}%` }}
                      ></div>
                  </div>
              </div>
              ))}
          </div>

          {/* C. 底部按钮：🔥 固定在底部，不随任务滚动 */}
          <div className="p-5 pt-3 border-t border-white/5 bg-black/40">
              <button
                  onClick={requestExtraMission}
                  className="w-full py-3 bg-cyan-500/5 border border-cyan-500/20 text-cyan-500 font-mono text-[10px] tracking-[0.2em] hover:bg-cyan-500 hover:text-black transition-all duration-300 uppercase font-bold rounded flex items-center justify-center gap-2"
              >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  {t(uiLang, 'mission.requestSlot')}
              </button>
          </div>

        </div>
      </div>
    </>
  );
}
