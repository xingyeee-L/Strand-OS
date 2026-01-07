import { useEffect } from 'react';
import { useGameStore } from '../../store/store';

export default function MissionBoard() {
  const missions = useGameStore(state => state.missions);
  const fetchMissions = useGameStore(state => state.fetchMissions);
  // ❌ 旧的: const scanTarget = useGameStore(state => state.scanTarget);
  // ✅ 新的: 使用 jumpTo (星系跳跃)
  const jumpTo = useGameStore(state => state.jumpTo); 
  
  useEffect(() => {
    fetchMissions();
  }, []);

  if (missions.length === 0) return null;

  return (
    <div className="absolute top-24 right-8 w-64 pointer-events-auto select-none z-20 font-mono">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-yellow-500 animate-pulse"></div>
        <h3 className="text-yellow-500 text-xs font-bold tracking-widest uppercase">
          Daily Orders
        </h3>
      </div>

      <div className="space-y-3">
        {missions.map(mission => (
          <div 
            key={mission.id}
            className="bg-black/80 border border-yellow-900/50 p-3 rounded backdrop-blur-sm"
          >
            <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-1">
              <span className="text-[10px] text-gray-400">
                {mission.type === 'MAIN' ? '⚡️ PRIORITY' : '🔧 MAINTENANCE'}
              </span>
              <span className="text-[10px] text-yellow-600">
                +{mission.xp_reward} XP
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {mission.target_words.map(word => (
                <button
                  key={word}
                  // 🔥 点击任务目标，触发星系跳跃
                  onClick={() => jumpTo(word)}
                  className="text-left text-sm text-cyan-200 hover:text-orange-400 hover:pl-2 transition-all duration-200 flex items-center group"
                >
                  <span className="w-1 h-1 bg-cyan-800 rounded-full mr-2 group-hover:bg-orange-500"></span>
                  {word}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}