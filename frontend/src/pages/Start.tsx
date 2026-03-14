import { useMemo, useState } from 'react';
import { useGameStore } from '../store/store';
import { t } from '../i18n';
import { purgeLegacyCache } from '../utils/cacheCleanup';

export default function Start({ onBoot }: { onBoot: () => void }) {
  const [isPurging, setIsPurging] = useState(false);
  const { uiLang, setUiLang } = useGameStore();

  const bootLines = useMemo(
    () => [
      'SC-7274 ONLINE',
      'LINK LAYER: STABLE',
      'MEMORY BUS: READY',
      'STRAND MAP: STANDBY',
    ],
    [],
  );

  const handlePurge = async () => {
    setIsPurging(true);
    await purgeLegacyCache();
    window.location.reload();
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_35%,rgba(0,0,0,0.9)_100%)]" />
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
      </div>

      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start select-none z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h1 className="text-4xl font-bold text-cyan-500 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            STRAND OS
          </h1>
          <div className="text-orange-500 text-xs font-mono mt-1 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            {t(uiLang, 'start.bootSequence')}
          </div>
        </div>
        <div className="text-right">
          <button
            onClick={() => setUiLang(uiLang === 'zh' ? 'en' : 'zh')}
            className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-black tracking-widest border rounded-lg bg-black/30 border-white/10 text-gray-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-all"
          >
            {uiLang === 'zh' ? t(uiLang, 'common.en') : t(uiLang, 'common.zh')}
          </button>
          <div className="text-xs text-gray-400 font-mono">v1.3.0</div>
          <div className="text-[10px] text-cyan-600 font-mono mt-1">TACTICAL UI</div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="w-[720px] max-w-[92vw] bg-black/70 border border-cyan-500/25 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,255,255,0.08)] rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-white/5 bg-cyan-950/10">
            <div className="text-[10px] text-cyan-500 tracking-[0.35em] uppercase font-mono font-black">
              {t(uiLang, 'start.initialization')}
            </div>
            <div className="mt-3 text-3xl font-black text-white tracking-wider">
              {t(uiLang, 'start.enter')}
            </div>
            <div className="mt-2 text-sm text-gray-400 font-mono">
              {t(uiLang, 'start.tip')}
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/40 border border-white/5 rounded-xl p-5">
              <div className="text-[10px] text-gray-500 tracking-[0.25em] uppercase font-mono">
                {t(uiLang, 'start.systemLog')}
              </div>
              <div className="mt-3 space-y-2 font-mono text-[12px]">
                {bootLines.map((l) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60" />
                    <span className="text-gray-300">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] text-gray-500 tracking-[0.25em] uppercase font-mono">
                  {t(uiLang, 'start.controls')}
                </div>
                <div className="mt-3 text-[12px] text-gray-400 font-mono leading-relaxed">
                  {t(uiLang, 'start.recommendPurge')}
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={onBoot}
                  className="flex-1 py-3 text-center bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-[11px] font-black uppercase rounded-lg tracking-widest hover:bg-cyan-950/60 transition-all"
                >
                  {t(uiLang, 'start.boot')}
                </button>
                <button
                  onClick={handlePurge}
                  disabled={isPurging}
                  className={`flex-1 py-3 text-center border text-[11px] font-black uppercase rounded-lg tracking-widest transition-all ${isPurging
                      ? 'bg-gray-900/40 border-gray-700/40 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-950/20 border-orange-500/40 text-orange-300 hover:bg-orange-950/40'
                    }`}
                >
                  {isPurging ? t(uiLang, 'start.purging') : t(uiLang, 'start.purgeCache')}
                </button>
              </div>
              <div className="mt-3 text-[9px] text-cyan-900/70 font-mono tracking-widest select-none">
                {t(uiLang, 'start.safeMode')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
