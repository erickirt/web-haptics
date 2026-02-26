"use client";

import { useRef, useEffect, useCallback } from "react";
import { WebHaptics } from "../lib/web-haptics";
import type { HapticInput, WebHapticsOptions } from "../lib/web-haptics/types";

export function useWebHaptics(options?: WebHapticsOptions) {
  const instanceRef = useRef<WebHaptics | null>(null);

  useEffect(() => {
    instanceRef.current = new WebHaptics(options);
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  const trigger = useCallback(
    (input?: HapticInput) => instanceRef.current?.trigger(input),
    [],
  );

  const cancel = useCallback(() => instanceRef.current?.cancel(), []);

  const isSupported = WebHaptics.isSupported();

  return { trigger, cancel, isSupported };
}
