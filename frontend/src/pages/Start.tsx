import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameStore } from '../store/store';

type BootPhase = 'sequence' | 'hold' | 'fade';
type DoorPhase = 'hidden' | 'unlock' | 'open';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function Start({ onBoot }: { onBoot: () => void }) {
  const { initWorld, fetchBooks } = useGameStore();
  const [phase, setPhase] = useState<BootPhase>('sequence');
  const [sequenceDone, setSequenceDone] = useState(false);
  const [preloadDone, setPreloadDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [doorPhase, setDoorPhase] = useState<DoorPhase>('hidden');
  const rafRef = useRef<number | null>(null);

  const bootDurationMs = useMemo(() => {
    const raw = Number.parseInt(import.meta.env.VITE_BOOT_DURATION_MS || '', 10);
    const safe = Number.isFinite(raw) ? raw : 3800;
    return clamp(safe, 3000, 5000);
  }, []);

  const transitionMs = 720;

  const { appName, appVersion } = useMemo(() => {
    const name = (import.meta.env.VITE_APP_NAME || 'STRAND OS').toString();
    const version = (import.meta.env.VITE_APP_VERSION || 'v1.3.0').toString();
    return { appName: name, appVersion: version };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const next = clamp((now - start) / bootDurationMs, 0, 1);
      setProgress(next);
      if (next < 1 && phase !== 'fade') {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [bootDurationMs, phase]);

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      await Promise.allSettled([initWorld(), fetchBooks()]);
      if (cancelled) return;
      setPreloadDone(true);
    };

    preload();

    const seqTimer = window.setTimeout(() => {
      if (cancelled) return;
      setSequenceDone(true);
    }, bootDurationMs);

    return () => {
      cancelled = true;
      window.clearTimeout(seqTimer);
    };
  }, [bootDurationMs, fetchBooks, initWorld]);

  useEffect(() => {
    if (!sequenceDone) return;
    if (preloadDone) {
      setPhase('fade');
      const t = window.setTimeout(onBoot, transitionMs);
      return () => window.clearTimeout(t);
    }
    setPhase('hold');
  }, [onBoot, preloadDone, sequenceDone]);

  useEffect(() => {
    if (phase !== 'hold') return;
    if (!preloadDone) return;
    setPhase('fade');
    const t = window.setTimeout(onBoot, transitionMs);
    return () => window.clearTimeout(t);
  }, [onBoot, phase, preloadDone]);

  useEffect(() => {
    if (phase !== 'fade') {
      setDoorPhase('hidden');
      return;
    }
    setDoorPhase('unlock');
    const t = window.setTimeout(() => setDoorPhase('open'), 220);
    return () => window.clearTimeout(t);
  }, [phase]);

  const rootStyle = useMemo(
    () =>
      ({
        ['--boot-duration' as any]: `${bootDurationMs}ms`,
        ['--boot-door-duration' as any]: `${transitionMs}ms`,
      }) as React.CSSProperties,
    [bootDurationMs],
  );

  const stage = progress < 0.22 ? 0 : progress < 0.48 ? 1 : progress < 0.74 ? 2 : 3;
  const doorClass =
    doorPhase === 'hidden' ? 'boot-door-hidden' : doorPhase === 'unlock' ? 'boot-door-unlock' : 'boot-door-open';

  return (
    <div
      style={rootStyle}
      data-stage={stage}
      className={`w-full h-screen bg-black overflow-hidden relative select-none ${phase === 'fade' ? 'opacity-0 transition-opacity duration-[720ms]' : 'opacity-100'}`}
    >
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,255,255,0.06)_0%,transparent_45%,rgba(0,0,0,0.95)_100%)]" />
      <div className="absolute inset-0 pointer-events-none boot-noise" />
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />
      </div>
      <div className="absolute inset-0 pointer-events-none boot-grid opacity-40" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-0 -top-24 w-full h-28 bg-cyan-500/20 blur-xl boot-sweep" />
        <div className="absolute left-0 top-0 w-full h-24 bg-gradient-to-b from-cyan-500/8 to-transparent boot-fade-in" />
      </div>

      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-none">
        <div className="flex items-start justify-between">
          <div className="boot-brand">
            <div className="text-cyan-300 font-black tracking-[0.35em] uppercase">{appName}</div>
            <div className="text-[10px] text-cyan-900/80 font-mono tracking-[0.25em]">{appVersion}</div>
          </div>
          <div className="boot-badge">
            <div className="boot-badge-dot" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[520px] max-w-[92vw] aspect-square">
          <div className="absolute inset-0 rounded-full border border-cyan-500/20 shadow-[0_0_60px_rgba(0,255,255,0.08)] boot-fade-in" />
          <div className="absolute inset-[28px] rounded-full border border-cyan-500/10 boot-fade-in-delayed" />
          <div className="absolute inset-[54px] rounded-full border border-orange-500/10 boot-fade-in-delayed-2" />

          <div className="absolute inset-[22px] rounded-full border-t border-cyan-400/30 boot-spin-slow" />
          <div className="absolute inset-[46px] rounded-full border-r border-orange-400/25 boot-spin-fast" />

          <div className="absolute left-1/2 top-1/2 w-[86%] h-[2px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent boot-flicker" />
          <div className="absolute left-1/2 top-1/2 w-[2px] h-[86%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-orange-400/22 to-transparent boot-flicker-delayed" />

          <div className="absolute left-1/2 bottom-[18%] -translate-x-1/2 w-[72%] h-2 bg-black/40 border border-white/5 rounded overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500/30 via-cyan-400 to-orange-400 boot-progress" />
          </div>

          <div className="absolute inset-0">
            <div className="absolute left-[12%] top-[18%] w-2 h-2 rounded-full bg-cyan-500/70 boot-pip" />
            <div className="absolute right-[14%] top-[28%] w-1.5 h-1.5 rounded-full bg-orange-500/60 boot-pip-delayed" />
            <div className="absolute left-[22%] bottom-[22%] w-1.5 h-1.5 rounded-full bg-cyan-500/50 boot-pip-delayed-2" />
            <div className="absolute right-[18%] bottom-[18%] w-2 h-2 rounded-full bg-orange-500/55 boot-pip-delayed-3" />
          </div>

          <div className="absolute inset-0">
            <div
              className="absolute left-1/2 top-[8%] -translate-x-1/2 w-[34%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
              style={{ opacity: stage >= 0 ? 0.85 : 0.2 }}
            />
            <div
              className="absolute right-[8%] top-1/2 -translate-y-1/2 w-[1px] h-[34%] bg-gradient-to-b from-transparent via-orange-400/25 to-transparent"
              style={{ opacity: stage >= 1 ? 0.85 : 0.15 }}
            />
            <div
              className="absolute left-1/2 bottom-[8%] -translate-x-1/2 w-[34%] h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
              style={{ opacity: stage >= 2 ? 0.85 : 0.12 }}
            />
            <div
              className="absolute left-[8%] top-1/2 -translate-y-1/2 w-[1px] h-[34%] bg-gradient-to-b from-transparent via-orange-400/25 to-transparent"
              style={{ opacity: stage >= 3 ? 0.85 : 0.12 }}
            />
          </div>

          {phase === 'hold' && (
            <div className="absolute inset-0">
              <div className="absolute inset-[110px] rounded-full border border-cyan-500/12 boot-idle-pulse" />
              <div className="absolute inset-0 bg-cyan-500/5 boot-idle-flicker" />
            </div>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute left-0 bottom-0 w-full h-24 bg-cyan-500/10 blur-2xl boot-engine-glow" />
      </div>

      <div className={`absolute inset-0 pointer-events-none boot-door ${doorClass}`}>
        <div className="boot-door-left" />
        <div className="boot-door-right" />
        <div className="boot-door-latch boot-door-latch-left" />
        <div className="boot-door-latch boot-door-latch-right" />
        <div className="boot-door-bolt boot-door-bolt-top" />
        <div className="boot-door-bolt boot-door-bolt-bottom" />
        <div className="boot-door-seam" />
      </div>
    </div>
  );
}
