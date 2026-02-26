import styles from "./styles.module.scss";

import { useWebHaptics } from "web-haptics/react";
import { defaultPatterns } from "web-haptics";

export const Demo = () => {
  const { trigger } = useWebHaptics({ debug: true });

  return (
    <div className={styles.demo}>
      <div className={styles.buttons}>
        {Object.entries(defaultPatterns).map(([name, pattern]) => (
          <button key={name} onClick={() => trigger(pattern)}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};
