import type { HapticPreset } from "./types";

export const defaultPatterns = {
  success: {
    pattern: [50, 50, 50],
    description: "A series of taps indicating success.",
    intensity: 0.5,
  },
  nudge: {
    pattern: [80, 100, 200],
    description: "A series of taps indicating a warning.",
    intensity: 0.5,
  },
  error: {
    pattern: [50, 50, 50, 50, 50],
    description: "A series of taps indicating an error.",
    intensity: 0.75,
  },
  long: {
    pattern: [1000],
    description: "A long vibration.",
    intensity: 1,
  },
} as const satisfies Record<string, HapticPreset>;
