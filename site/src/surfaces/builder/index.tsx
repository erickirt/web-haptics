import { useReducer, useRef, useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { defaultPatterns } from "web-haptics";
import type { HapticPreset } from "web-haptics";

import styles from "./styles.module.scss";
import { useHaptics } from "../../hooks/useHaptics";
import { CodeBlock } from "../../components/codeblock";
import { Button } from "../../components/button";

// --- Types ---

interface Tap {
  id: string;
  position: number;
  duration: number;
}

interface BuilderState {
  taps: Tap[];
  selectedId: string | null;
  intensity: number;
}

type BuilderAction =
  | { type: "ADD_TAP"; position: number }
  | { type: "SELECT_TAP"; id: string | null }
  | { type: "MOVE_TAP"; id: string; position: number }
  | { type: "SET_DURATION"; id: string; duration: number }
  | { type: "RESIZE_LEFT"; id: string; position: number }
  | { type: "REMOVE_TAP"; id: string }
  | { type: "SET_INTENSITY"; intensity: number }
  | { type: "LOAD_PRESET"; taps: Tap[]; intensity: number };

// --- Helpers ---

let nextId = 100;
const genId = () => String(nextId++);
const snap = (v: number) => Math.round(v / 10) * 10;

function getNeighborBounds(
  taps: Tap[],
  id: string,
): { minPos: number; maxEnd: number } {
  const sorted = [...taps].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex((t) => t.id === id);
  const prev = idx > 0 ? sorted[idx - 1] : null;
  const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
  return {
    minPos: prev ? prev.position + prev.duration : 0,
    maxEnd: next ? next.position : 1000,
  };
}

function canFitTap(taps: Tap[], position: number, duration: number): boolean {
  for (const tap of taps) {
    const tapEnd = tap.position + tap.duration;
    const newEnd = position + duration;
    if (position < tapEnd && newEnd > tap.position) return false;
  }
  return position >= 0 && position + duration <= 1000;
}

function tapsToPattern(taps: Tap[]): number[] {
  if (taps.length === 0) return [];
  const sorted = [...taps].sort((a, b) => a.position - b.position);
  const pattern: number[] = [];
  let cursor = 0;

  for (const tap of sorted) {
    const gap = tap.position - cursor;
    if (gap > 0) {
      if (pattern.length === 0) pattern.push(0);
      pattern.push(gap);
    }
    pattern.push(tap.duration);
    cursor = tap.position + tap.duration;
  }
  return pattern;
}

function patternToTaps(pattern: number[]): Tap[] {
  const taps: Tap[] = [];
  let cursor = 0;
  for (let i = 0; i < pattern.length; i++) {
    const dur = pattern[i];
    if (i % 2 === 0) {
      if (dur > 0) taps.push({ id: genId(), position: cursor, duration: dur });
      cursor += dur;
    } else {
      cursor += dur;
    }
  }
  return taps;
}

// --- Reducer ---

const DEFAULT_DURATION = 50;

const initialState: BuilderState = {
  taps: patternToTaps(defaultPatterns.success.pattern),
  selectedId: null,
  intensity: defaultPatterns.success.intensity,
};

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "ADD_TAP": {
      const snapped = snap(
        Math.max(0, Math.min(1000 - DEFAULT_DURATION, action.position)),
      );
      if (!canFitTap(state.taps, snapped, DEFAULT_DURATION)) return state;
      const newTap: Tap = {
        id: genId(),
        position: snapped,
        duration: DEFAULT_DURATION,
      };
      return {
        ...state,
        taps: [...state.taps, newTap],
        selectedId: newTap.id,
      };
    }

    case "SELECT_TAP":
      return { ...state, selectedId: action.id };

    case "MOVE_TAP": {
      const tap = state.taps.find((t) => t.id === action.id);
      if (!tap) return state;
      const bounds = getNeighborBounds(state.taps, action.id);
      const clamped = snap(
        Math.max(bounds.minPos, Math.min(bounds.maxEnd - tap.duration, action.position)),
      );
      return {
        ...state,
        taps: state.taps.map((t) =>
          t.id === action.id ? { ...t, position: clamped } : t,
        ),
      };
    }

    case "SET_DURATION": {
      const tap = state.taps.find((t) => t.id === action.id);
      if (!tap) return state;
      const bounds = getNeighborBounds(state.taps, action.id);
      const maxDur = bounds.maxEnd - tap.position;
      const dur = Math.max(10, Math.min(maxDur, action.duration));
      return {
        ...state,
        taps: state.taps.map((t) =>
          t.id === action.id ? { ...t, duration: dur } : t,
        ),
      };
    }

    case "RESIZE_LEFT": {
      const tap = state.taps.find((t) => t.id === action.id);
      if (!tap) return state;
      const bounds = getNeighborBounds(state.taps, action.id);
      const newPos = snap(Math.max(bounds.minPos, Math.min(tap.position + tap.duration - 10, action.position)));
      const newDur = tap.position + tap.duration - newPos;
      return {
        ...state,
        taps: state.taps.map((t) =>
          t.id === action.id ? { ...t, position: newPos, duration: newDur } : t,
        ),
      };
    }

    case "REMOVE_TAP":
      return {
        ...state,
        taps: state.taps.filter((t) => t.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      };

    case "SET_INTENSITY":
      return {
        ...state,
        intensity: Math.max(0, Math.min(1, action.intensity)),
      };

    case "LOAD_PRESET":
      return { taps: action.taps, selectedId: null, intensity: action.intensity };

    default:
      return state;
  }
}

// --- Constants ---

const GRIDLINES = Array.from({ length: 19 }, (_, i) => (i + 1) * 50); // 50, 100, ... 950
const LABELS = Array.from({ length: 11 }, (_, i) => i * 100);
const presets = Object.entries(defaultPatterns) as [string, HapticPreset][];

// --- Trash icon ---

const TrashIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4h10M6.5 4V3a1 1 0 011-1h1a1 1 0 011 1v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4" />
  </svg>
);

// --- Component ---

export const HapticBuilder = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { trigger } = useHaptics();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [activeTapIds, setActiveTapIds] = useState<Set<string>>(new Set());
  const timeoutsRef = useRef<number[]>([]);

  const pattern = tapsToPattern(state.taps);
  const selected = state.taps.find((t) => t.id === state.selectedId);

  const totalDuration = state.taps.length
    ? Math.max(...state.taps.map((t) => t.position + t.duration))
    : 0;

  const activePreset = presets.find(
    ([, p]) =>
      p.pattern.length === pattern.length &&
      p.pattern.every((v, i) => v === pattern[i]) &&
      p.intensity === state.intensity,
  )?.[0];

  // Click empty timeline to add
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return;
      const position = ((e.clientX - rect.left) / rect.width) * 1000;
      dispatch({ type: "ADD_TAP", position });
      trigger();
    },
    [trigger],
  );

  // Drag circle to move
  const handleDragStart = useCallback(
    (e: React.PointerEvent, tapId: string) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: "SELECT_TAP", id: tapId });

      const container = timelineRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Offset between cursor and tap position so dragging doesn't snap
      const cursorMs = ((e.clientX - rect.left) / rect.width) * 1000;
      const tap = state.taps.find((t) => t.id === tapId);
      const offsetMs = tap ? cursorMs - tap.position : 0;

      const onMove = (me: PointerEvent) => {
        const position = ((me.clientX - rect.left) / rect.width) * 1000 - offsetMs;
        dispatch({ type: "MOVE_TAP", id: tapId, position });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [state.taps],
  );

  // Drag resize handle
  const handleResizeStart = useCallback(
    (e: React.PointerEvent, tapId: string) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: "SELECT_TAP", id: tapId });

      const container = timelineRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const onMove = (me: PointerEvent) => {
        const tap = state.taps.find((t) => t.id === tapId);
        if (!tap) return;
        const msAtCursor = ((me.clientX - rect.left) / rect.width) * 1000;
        const newDuration = snap(Math.max(10, msAtCursor - tap.position));
        dispatch({ type: "SET_DURATION", id: tapId, duration: newDuration });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [state.taps],
  );

  // Drag left resize handle
  const handleResizeLeftStart = useCallback(
    (e: React.PointerEvent, tapId: string) => {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: "SELECT_TAP", id: tapId });

      const container = timelineRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const onMove = (me: PointerEvent) => {
        const msAtCursor = ((me.clientX - rect.left) / rect.width) * 1000;
        dispatch({ type: "RESIZE_LEFT", id: tapId, position: msAtCursor });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  // Custom intensity slider drag
  const handleSliderDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const track = e.currentTarget as HTMLElement;
      const rect = track.getBoundingClientRect();

      const update = (clientX: number) => {
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        dispatch({
          type: "SET_INTENSITY",
          intensity: Math.round(ratio * 100) / 100,
        });
      };

      update(e.clientX);

      const onMove = (me: PointerEvent) => update(me.clientX);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  // Playback
  const handlePlay = useCallback(() => {
    if (state.taps.length === 0) return;

    const pat = tapsToPattern(state.taps);
    trigger(pat, { intensity: state.intensity });
    setPlaying(true);

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    for (const tap of state.taps) {
      timeoutsRef.current.push(
        window.setTimeout(
          () => setActiveTapIds((prev) => new Set(prev).add(tap.id)),
          tap.position,
        ),
      );
      timeoutsRef.current.push(
        window.setTimeout(() => {
          setActiveTapIds((prev) => {
            const next = new Set(prev);
            next.delete(tap.id);
            return next;
          });
        }, tap.position + tap.duration),
      );
    }

    const end = Math.max(...state.taps.map((t) => t.position + t.duration));
    timeoutsRef.current.push(
      window.setTimeout(() => {
        setPlaying(false);
        setActiveTapIds(new Set());
      }, end),
    );
  }, [state.taps, state.intensity, trigger]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        state.selectedId
      ) {
        e.preventDefault();
        dispatch({ type: "REMOVE_TAP", id: state.selectedId });
        trigger();
      }
      if (e.key === " " && state.taps.length > 0) {
        e.preventDefault();
        handlePlay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.selectedId, state.taps.length, trigger, handlePlay]);

  useEffect(() => {
    return () => timeoutsRef.current.forEach(clearTimeout);
  }, []);

  const code = pattern.length
    ? `trigger([${pattern.join(", ")}], { intensity: ${state.intensity} })`
    : `trigger([], { intensity: ${state.intensity} })`;

  return (
    <div className={styles.builder}>
      {/* Presets */}
      <div className={styles.presets}>
        {presets.map(([name, preset]) => (
          <Button
            key={name}
            data-active={activePreset === name}
            style={{
              opacity: activePreset === name ? 1 : 0.5,
            }}
            onClick={() => {
              if (activePreset === name) return;
              trigger();
              dispatch({
                type: "LOAD_PRESET",
                taps: patternToTaps(preset.pattern),
                intensity: preset.intensity,
              });
            }}
          >
            {name}
          </Button>
        ))}
      </div>

      {/* Timeline */}
      <div className={styles.timelineContainer}>
        <div
          className={styles.timeline}
          ref={timelineRef}
          onClick={handleTimelineClick}
        >
          {/* Gridlines */}
          {GRIDLINES.map((ms) => (
            <div
              key={ms}
              className={styles.gridline}
              data-minor={ms % 100 !== 0}
              style={{ left: `${(ms / 1000) * 100}%` }}
            />
          ))}

          {/* Tap regions with resize handles */}
          {state.taps.map((tap) => {
            // Intensity drives vertical height: 3px at 0 → full at 1
            const inset = `min(calc(50% - 1.5px), ${(1 - state.intensity) * 50}%)`;
            return (
            <div
              key={`region-${tap.id}`}
              className={styles.tapRegion}
              data-selected={tap.id === state.selectedId}
              style={{
                left: `${(tap.position / 1000) * 100}%`,
                width: `${(tap.duration / 1000) * 100}%`,
                top: inset,
                bottom: inset,
              }}
              onPointerDown={(e) => handleDragStart(e, tap.id)}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "SELECT_TAP", id: tap.id });
              }}
            >
              <div
                className={styles.resizeHandleLeft}
                onPointerDown={(e) => handleResizeLeftStart(e, tap.id)}
              />
              <div
                className={styles.resizeHandle}
                onPointerDown={(e) => handleResizeStart(e, tap.id)}
              />
            </div>
            );
          })}

          {/* Tap circles */}
          <AnimatePresence>
            {state.taps.map((tap) => (
              <motion.div
                key={tap.id}
                className={styles.tapCircle}
                data-selected={tap.id === state.selectedId}
                style={{
                  left: `${(tap.position / 1000) * 100}%`,
                  top: "50%",
                  x: "-50%",
                  y: "-50%",
                }}
                initial={{ scale: 0 }}
                animate={{ scale: activeTapIds.has(tap.id) ? 1.4 : 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 25,
                  scale: activeTapIds.has(tap.id)
                    ? { type: "spring", stiffness: 600, damping: 15 }
                    : undefined,
                }}
                onPointerDown={(e) => handleDragStart(e, tap.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch({ type: "SELECT_TAP", id: tap.id });
                }}
              />
            ))}
          </AnimatePresence>

          {/* Floating controls above selected tap */}
          <AnimatePresence>
            {selected && (
              <motion.div
                key="floating"
                className={styles.floatingControls}
                style={{
                  left: `${(selected.position / 1000) * 100}%`,
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                <div className={styles.floatingDuration}>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={10}
                    value={selected.duration}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_DURATION",
                        id: selected.id,
                        duration: parseInt(e.target.value) || 10,
                      })
                    }
                  />
                  <span>ms</span>
                </div>
                <button
                  className={styles.floatingDelete}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "REMOVE_TAP", id: selected.id });
                    trigger();
                  }}
                >
                  <TrashIcon />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Playhead */}
          {playing && totalDuration > 0 && (
            <motion.div
              key="playhead"
              className={styles.playhead}
              initial={{ left: 0 }}
              animate={{ left: `${(totalDuration / 1000) * 100}%` }}
              transition={{ duration: totalDuration / 1000, ease: "linear" }}
            />
          )}

          {/* Empty state */}
          {state.taps.length === 0 && (
            <div className={styles.emptyState}>Click to add a tap</div>
          )}
        </div>

        {/* Labels */}
        <div className={styles.timelineLabels}>
          {LABELS.map((ms) => (
            <span key={ms}>{ms}</span>
          ))}
        </div>
      </div>

      {/* Intensity */}
      <div className={styles.intensityRow}>
        <label>Intensity</label>
        <div
          className={styles.sliderTrack}
          onPointerDown={handleSliderDrag}
        >
          <div
            className={styles.sliderFill}
            style={{ width: `${state.intensity * 100}%` }}
          />
          <div
            className={styles.sliderThumb}
            style={{ left: `${state.intensity * 100}%` }}
          />
        </div>
        <span className={styles.intensityValue}>
          {state.intensity.toFixed(2)}
        </span>
      </div>

      {/* Code output */}
      <CodeBlock code={code} />

      {/* Play + total */}
      <div className={styles.bottomRow}>
        <Button wide onClick={handlePlay} disabled={state.taps.length === 0}>
          Play
        </Button>
        {totalDuration > 0 && (
          <span className={styles.totalDuration}>{totalDuration}ms</span>
        )}
      </div>
    </div>
  );
};
