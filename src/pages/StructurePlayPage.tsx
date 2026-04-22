import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStructure, type Structure } from "../api";

type WakeLockSentinel = { released: boolean; release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function StructurePlayPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [structure, setStructure] = useState<Structure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [levelIndex, setLevelIndex] = useState(0);
  // Anchor-based timer: survives mobile sleep / tab blur because elapsed
  // is always derived from `Date.now() - startedAt`, never from a ticking
  // counter that the browser might throttle.
  const [durationMs, setDurationMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number>(0);
  const [, setTick] = useState(0);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    getStructure(Number(id))
      .then((s) => {
        if (!alive) return;
        setStructure(s);
        const firstDur = (s.result.levels[0]?.duration_minutes ?? 0) * 60_000;
        setDurationMs(firstDur);
        setPausedRemainingMs(firstDur);
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const isRunning = startedAt !== null;
  const levels = structure?.result.levels ?? [];
  const level = levels[levelIndex];

  const remainingMs = isRunning
    ? Math.max(0, durationMs - (Date.now() - startedAt!))
    : pausedRemainingMs;

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const goToLevel = useCallback(
    (newIndex: number) => {
      if (!structure) return;
      const clamped = Math.max(
        0,
        Math.min(newIndex, structure.result.levels.length - 1),
      );
      const dur = (structure.result.levels[clamped]?.duration_minutes ?? 0) *
        60_000;
      setLevelIndex(clamped);
      setDurationMs(dur);
      setPausedRemainingMs(dur);
      setStartedAt(null);
    },
    [structure],
  );

  useEffect(() => {
    if (!isRunning || !structure) return;
    if (remainingMs > 0) return;
    try {
      beep();
    } catch {
      /* noop */
    }
    if (levelIndex < structure.result.levels.length - 1) {
      const next = levelIndex + 1;
      const dur = (structure.result.levels[next]?.duration_minutes ?? 0) *
        60_000;
      setLevelIndex(next);
      setDurationMs(dur);
      setStartedAt(Date.now());
    } else {
      setStartedAt(null);
      setPausedRemainingMs(0);
    }
  }, [remainingMs, isRunning, structure, levelIndex]);

  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    let cancelled = false;

    async function acquire() {
      if (!nav.wakeLock) return;
      try {
        const sentinel = await nav.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        /* user gesture may be required */
      }
    }

    async function release() {
      const s = wakeLockRef.current;
      wakeLockRef.current = null;
      if (s && !s.released) {
        try {
          await s.release();
        } catch {
          /* noop */
        }
      }
    }

    if (isRunning) {
      acquire();
    } else {
      release();
    }

    const onVis = () => {
      if (document.visibilityState === "visible" && isRunning) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      release();
    };
  }, [isRunning]);

  const play = useCallback(() => {
    if (isRunning) return;
    setStartedAt(Date.now() - (durationMs - pausedRemainingMs));
  }, [isRunning, durationMs, pausedRemainingMs]);

  const pause = useCallback(() => {
    if (!isRunning) return;
    setPausedRemainingMs(remainingMs);
    setStartedAt(null);
  }, [isRunning, remainingMs]);

  const resetLevel = useCallback(() => {
    setPausedRemainingMs(durationMs);
    setStartedAt(null);
  }, [durationMs]);

  const onSeek = useCallback(
    (newRemainingMs: number) => {
      const clamped = Math.max(0, Math.min(newRemainingMs, durationMs));
      if (isRunning) {
        setStartedAt(Date.now() - (durationMs - clamped));
      } else {
        setPausedRemainingMs(clamped);
      }
    },
    [isRunning, durationMs],
  );

  const nextLevel = useMemo(
    () => levels[levelIndex + 1],
    [levels, levelIndex],
  );

  if (loading) {
    return <div className="loading">Chargement…</div>;
  }
  if (error || !structure || !level) {
    return (
      <div className="alert">
        {error ?? "Structure introuvable"}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate("/structures")}
        >
          Retour
        </button>
      </div>
    );
  }

  const progressPct = durationMs === 0
    ? 0
    : Math.min(100, ((durationMs - remainingMs) / durationMs) * 100);

  return (
    <section className="play">
      <div className="play__topbar">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate("/structures")}
        >
          ← Retour
        </button>
        <div className="play__level-label">
          Niveau {level.level}
          {level.is_break ? " · PAUSE" : ""}
        </div>
        <div className="play__counter">
          {levelIndex + 1} / {levels.length}
        </div>
      </div>

      <div
        className={"play__clock" +
          (level.is_break ? " play__clock--break" : "")}
      >
        {formatMs(remainingMs)}
      </div>

      <div className="play__progress">
        <div
          className="play__progress-bar"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="play__blinds">
        {level.is_break ? (
          <div className="play__break">Pause</div>
        ) : (
          <>
            <div className="play__blind">
              <span className="play__blind-label">SB</span>
              <span className="play__blind-value">
                {level.small_blind.toLocaleString()}
              </span>
            </div>
            <div className="play__blind">
              <span className="play__blind-label">BB</span>
              <span className="play__blind-value">
                {level.big_blind.toLocaleString()}
              </span>
            </div>
            {level.ante > 0 && (
              <div className="play__blind">
                <span className="play__blind-label">Ante</span>
                <span className="play__blind-value">
                  {level.ante.toLocaleString()}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {nextLevel && (
        <div className="play__next">
          Suivant : Niv. {nextLevel.level} ·{" "}
          {nextLevel.is_break
            ? "Pause"
            : `${nextLevel.small_blind.toLocaleString()}/${nextLevel.big_blind.toLocaleString()}${
              nextLevel.ante > 0 ? ` (ante ${nextLevel.ante})` : ""
            }`}
        </div>
      )}

      <input
        type="range"
        className="play__slider"
        min={0}
        max={durationMs}
        step={1000}
        value={remainingMs}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Temps restant du niveau"
      />

      <div className="play__controls">
        <button
          type="button"
          className="btn"
          onClick={() => goToLevel(levelIndex - 1)}
          disabled={levelIndex === 0}
        >
          ◀ Niveau
        </button>
        {isRunning ? (
          <button
            type="button"
            className="btn btn--primary play__main-btn"
            onClick={pause}
          >
            ‖ Pause
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primary play__main-btn"
            onClick={play}
          >
            ▶ Play
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => goToLevel(levelIndex + 1)}
          disabled={levelIndex >= levels.length - 1}
        >
          Niveau ▶
        </button>
      </div>

      <div className="play__controls play__controls--secondary">
        <button type="button" className="btn btn--ghost" onClick={resetLevel}>
          ↺ Reset niveau
        </button>
      </div>
    </section>
  );
}

let audioCtx: AudioContext | null = null;
function beep() {
  if (!audioCtx) {
    const Ctx = (window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext);
    if (!Ctx) return;
    audioCtx = new Ctx();
  }
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.4, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  osc.start(now);
  osc.stop(now + 0.65);
}
