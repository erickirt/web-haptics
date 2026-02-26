let styleInjected = false;

export class HapticDebugger {
  private el: HTMLDivElement | null = null;
  private audioCtx: AudioContext | null = null;

  async run(pattern: number[]): Promise<void> {
    this.ensureDOM();
    if (!this.el) return;

    if (!this.audioCtx && typeof AudioContext !== "undefined") {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx?.state === "suspended") {
      await this.audioCtx.resume();
    }

    let oscillator: OscillatorNode | null = null;
    let gain: GainNode | null = null;

    for (let i = 0; i < pattern.length; i++) {
      if (i % 2 === 0) {
        this.el.classList.add("web-haptics-shaking");

        if (this.audioCtx) {
          oscillator = this.audioCtx.createOscillator();
          gain = this.audioCtx.createGain();
          oscillator.type = "triangle";
          oscillator.frequency.value = 200;
          gain.gain.value = 1;
          oscillator.connect(gain);
          gain.connect(this.audioCtx.destination);
          oscillator.start();
        }
      } else {
        this.el.classList.remove("web-haptics-shaking");
        oscillator?.stop();
        oscillator = null;
        gain = null;
      }
      await new Promise((resolve) => setTimeout(resolve, pattern[i]));
    }

    this.el.classList.remove("web-haptics-shaking");
    oscillator?.stop();
  }

  destroy(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }

  private ensureDOM(): void {
    if (this.el) return;
    if (typeof document === "undefined") return;

    if (!styleInjected) {
      const style = document.createElement("style");
      style.textContent = `
        @keyframes web-haptics-shake {
          0%, 100% { transform: translateX(0); }
          10% { transform: translateX(-2px); }
          20% { transform: translateX(2px); }
          30% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          50% { transform: translateX(-2px); }
          60% { transform: translateX(2px); }
          70% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
          90% { transform: translateX(-1px); }
        }
        .web-haptics-shaking {
          animation: web-haptics-shake 0.1s linear infinite;
        }
      `;
      document.head.appendChild(style);
      styleInjected = true;
    }

    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;bottom:16px;right:16px;background:rgba(0,0,0,0.85);color:#fff;border-radius:99px;padding:8px 14px;font-size:13px;font-family:system-ui,sans-serif;z-index:999999;pointer-events:none;user-select:none;";
    el.textContent = "\u{1F4F3} Haptic";
    document.body.appendChild(el);
    this.el = el;
  }
}
