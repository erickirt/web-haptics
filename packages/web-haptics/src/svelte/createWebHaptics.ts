import { WebHaptics } from "../lib/web-haptics";
import type { HapticInput, WebHapticsOptions } from "../lib/web-haptics/types";

export function createWebHaptics(options?: WebHapticsOptions) {
  const instance = new WebHaptics(options);

  const trigger = (input?: HapticInput) => instance.trigger(input);
  const cancel = () => instance.cancel();
  const destroy = () => instance.destroy();
  const isSupported = WebHaptics.isSupported();

  return { trigger, cancel, destroy, isSupported };
}
