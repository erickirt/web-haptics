import { HapticPattern } from "./types";

export const defaultPatterns = {
  lightTap: [50] as HapticPattern,
  success: [50, 50, 50, 50, 50] as HapticPattern,
  warning: [50, 50, 50] as HapticPattern,
  error: [50, 50, 50, 50, 50] as HapticPattern,
  impactMedium: [1000] as HapticPattern,
} as const;
