import { defaultPatterns } from "./patterns";
import type { HapticInput, TriggerOptions, WebHapticsOptions } from "./types";

const TOGGLE_MIN = 16; // ms at intensity 1 (every frame)
const TOGGLE_MAX = 184; // range above min (0.5 intensity ≈ 100ms)
const MAX_PHASE_MS = 1000; // browser haptic window limit
const PWM_CYCLE = 20; // ms per intensity modulation cycle

function modulatePattern(pattern: number[], intensity: number): number[] {
  if (intensity >= 1) return pattern;
  if (intensity <= 0) return [];

  const onTime = Math.max(1, Math.round(PWM_CYCLE * intensity));
  const offTime = PWM_CYCLE - onTime;
  const result: number[] = [];

  for (let i = 0; i < pattern.length; i++) {
    const dur = pattern[i]!;

    if (i % 2 === 0) {
      let remaining = dur;
      while (remaining >= PWM_CYCLE) {
        result.push(onTime);
        result.push(offTime);
        remaining -= PWM_CYCLE;
      }
      if (remaining > 0) {
        const remOn = Math.max(1, Math.round(remaining * intensity));
        result.push(remOn);
        const remOff = remaining - remOn;
        if (remOff > 0) result.push(remOff);
      }
    } else {
      if (result.length > 0 && result.length % 2 === 0) {
        result[result.length - 1]! += dur;
      } else {
        result.push(dur);
      }
    }
  }

  return result;
}

let instanceCounter = 0;

export class WebHaptics {
  private hapticLabel: HTMLLabelElement | null = null;
  private domInitialized = false;
  private instanceId: number;
  private debug: boolean;
  private rafId: number | null = null;
  private patternResolve: (() => void) | null = null;
  private audioCtx: AudioContext | null = null;

  constructor(options?: WebHapticsOptions) {
    this.instanceId = ++instanceCounter;
    this.debug = options?.debug ?? false;
  }

  static isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    );
  }

  async trigger(
    input: HapticInput = [10],
    options?: TriggerOptions,
  ): Promise<void> {
    let pattern: number[];
    let defaultIntensity = 0.5;

    if (typeof input === "number") {
      pattern = [input];
    } else if (Array.isArray(input)) {
      pattern = input;
    } else {
      pattern = [...input.pattern];
      defaultIntensity = input.intensity;
    }

    const intensity = Math.max(
      0,
      Math.min(1, options?.intensity ?? defaultIntensity),
    );

    for (let i = 0; i < pattern.length; i++) {
      if (i % 2 === 0 && pattern[i]! > MAX_PHASE_MS) {
        pattern[i] = MAX_PHASE_MS;
      }
      if (!Number.isFinite(pattern[i]) || pattern[i]! < 0) {
        console.warn(
          `[web-haptics] Invalid value at index ${i}: ${pattern[i]}. Pattern values must be finite non-negative numbers.`,
        );
        return;
      }
    }

    if (WebHaptics.isSupported()) {
      navigator.vibrate(modulatePattern(pattern, intensity));
    }

    if (!WebHaptics.isSupported() || this.debug) {
      this.ensureDOM();
      if (!this.hapticLabel) return;

      if (this.debug) {
        await this.ensureAudio();
      }

      this.stopPattern();
      await this.runPattern(pattern, intensity);
    }
  }

  cancel(): void {
    this.stopPattern();
    if (WebHaptics.isSupported()) {
      navigator.vibrate(0);
    }
  }

  destroy(): void {
    this.stopPattern();
    if (this.hapticLabel) {
      this.hapticLabel.remove();
      this.hapticLabel = null;
      this.domInitialized = false;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private stopPattern(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.patternResolve?.();
    this.patternResolve = null;
  }

  private runPattern(pattern: number[], intensity: number): Promise<void> {
    return new Promise((resolve) => {
      this.patternResolve = resolve;

      const phases: number[] = [];
      let cumulative = 0;
      for (const p of pattern) {
        cumulative += p;
        phases.push(cumulative);
      }
      const totalDuration = cumulative;

      let startTime = 0;
      let lastToggleTime = 0;

      const loop = (time: number) => {
        if (startTime === 0) startTime = time;
        const elapsed = time - startTime;

        if (elapsed >= totalDuration) {
          this.rafId = null;
          this.patternResolve = null;
          resolve();
          return;
        }

        let phaseIndex = 0;
        for (let i = 0; i < phases.length; i++) {
          if (elapsed < phases[i]!) {
            phaseIndex = i;
            break;
          }
        }

        if (phaseIndex % 2 === 0) {
          const toggleInterval = TOGGLE_MIN + (1 - intensity) * TOGGLE_MAX;
          if (time - lastToggleTime >= toggleInterval) {
            this.hapticLabel?.click();
            if (this.debug && this.audioCtx) {
              this.playClick(intensity);
            }
            lastToggleTime = time;
          }
        }

        this.rafId = requestAnimationFrame(loop);
      };
      this.rafId = requestAnimationFrame(loop);
    });
  }

  private playClick(intensity: number): void {
    if (!this.audioCtx) return;

    const duration = 0.008 * 0.5;
    const buffer = this.audioCtx.createBuffer(
      1,
      this.audioCtx.sampleRate * duration,
      this.audioCtx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (50 * 0.5));
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 4000;
    filter.Q.value = 8;

    const gain = this.audioCtx.createGain();
    gain.gain.value = 0.5 * intensity;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start();
  }

  private async ensureAudio(): Promise<void> {
    if (!this.audioCtx && typeof AudioContext !== "undefined") {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx?.state === "suspended") {
      await this.audioCtx.resume();
    }
  }

  private ensureDOM(): void {
    if (this.domInitialized) return;
    if (typeof document === "undefined") return;

    const id = `web-haptics-${this.instanceId}`;

    const hapticLabel = document.createElement("label");
    hapticLabel.setAttribute("for", id);
    hapticLabel.textContent = "Haptic feedback";
    this.hapticLabel = hapticLabel;

    const hapticCheckbox = document.createElement("input");
    hapticCheckbox.type = "checkbox";
    hapticCheckbox.setAttribute("switch", "");
    hapticCheckbox.id = id;

    if (this.debug) {
      Object.assign(hapticLabel.style, {
        position: "fixed",
        bottom: "16px",
        right: "16px",
        zIndex: "2147483647",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "#fff",
        borderRadius: "8px",
        fontSize: "13px",
        fontFamily: "system-ui, sans-serif",
        cursor: "pointer",
        userSelect: "none",
      });
      Object.assign(hapticCheckbox.style, {
        all: "initial",
        appearance: "auto",
      });
    } else {
      hapticLabel.style.display = "none";
      hapticCheckbox.style.display = "none";
    }

    hapticLabel.appendChild(hapticCheckbox);
    document.body.appendChild(hapticLabel);

    this.domInitialized = true;
  }
}
