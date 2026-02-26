import { onMounted, onUnmounted } from "vue";
import { WebHaptics } from "../lib/web-haptics";
import type { HapticInput, WebHapticsOptions } from "../lib/web-haptics/types";

export function useWebHaptics(options?: WebHapticsOptions) {
  let instance: WebHaptics | null = null;

  onMounted(() => {
    instance = new WebHaptics(options);
  });

  onUnmounted(() => {
    instance?.destroy();
    instance = null;
  });

  const trigger = (input?: HapticInput) => instance?.trigger(input);
  const cancel = () => instance?.cancel();
  const isSupported = WebHaptics.isSupported();

  return { trigger, cancel, isSupported };
}
