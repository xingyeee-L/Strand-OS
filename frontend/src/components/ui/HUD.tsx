import { useGameStore } from '../../store/store';
import { t } from '../../i18n';

export default function HUD() {
  const {
    user,
    agentState,
    uiLang,
    setUiLang,
  } = useGameStore();

  const getStatusColor = () => {
    switch (agentState) {
      case 'listening': return 'bg-green-500';
      case 'observing': return 'bg-purple-500';
      case 'synthesizing': return 'bg-orange-500';
      case 'speaking': return 'bg-cyan-400';
      default: return 'bg-green-500';
    }
  };

  return (
    <>
      {/* 1. 顶部状态栏 */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none select-none z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h1 className="text-4xl font-bold text-cyan-500 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            STRAND OS
          </h1>
          <div className="text-orange-500 text-xs font-mono mt-1 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${agentState !== 'idle' ? `${getStatusColor()} animate-ping` : 'bg-green-500'}`}></div>
            {agentState.toUpperCase() === 'IDLE' ? t(uiLang, 'hud.systemOnline') : agentState.toUpperCase() + "..."}
          </div>
        </div>

        <div className="text-right pointer-events-auto">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setUiLang(uiLang === 'zh' ? 'en' : 'zh')}
              className="px-2 py-1 text-[10px] font-mono font-black tracking-widest border rounded bg-black/30 border-white/10 text-gray-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all"
            >
              {uiLang === 'zh' ? 'EN' : '中文'}
            </button>
          </div>
          <div className="text-2xl font-bold text-white">{t(uiLang, 'hud.level')}.{user.level}</div>
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
