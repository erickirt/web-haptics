import styles from "./styles.module.scss";

import { Demo } from "./demo";
import { useApp } from "../../context/app";
import { SoundIcon } from "./sound-icon";
import { Logo } from "../../components/logo";
import { Toggle, ToggleGroup } from "../../components/toggle";
import { SafariBar } from "./safari-bar";
import { useState } from "react";
import { InstallCommands } from "../installation";
import { Usage } from "../usage";
import { AnimatePresence, motion } from "motion/react";
import { useHaptics } from "../../hooks/useHaptics";

export default function MobileView({
  disabled,
  setShaking,
}: {
  disabled?: boolean;
  setShaking?: (shaking: boolean) => void;
}) {
  const { debug, setDebug } = useApp();
  const { trigger } = useHaptics();

  const [view, setView] = useState<"play" | "install">("play");

  return (
    <div className={styles.page}>
      <div className={styles.debug}>
        <button
          onClick={() => {
            trigger();
            setDebug(!debug);
          }}
        >
          <SoundIcon enabled={debug} />
        </button>
      </div>
      <div className={styles.container}>
        <div className={styles.header}>
          <Logo />
          <p>Haptic feedback for the mobile web</p>
        </div>

        {!disabled && (
          <div className={styles.toggleGroup}>
            <ToggleGroup>
              <Toggle onClick={() => setView("play")} active={view === "play"}>
                Play
              </Toggle>
              <Toggle
                onClick={() => setView("install")}
                active={view === "install"}
              >
                Install
              </Toggle>
            </ToggleGroup>
          </div>
        )}

        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={view}
            initial={{ x: view === "play" ? -8 : 8 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          >
            {view === "play" && <Demo setShaking={setShaking} />}
            {view === "install" && (
              <div className={styles.installation}>
                <section>
                  <h3>Install</h3>
                  <InstallCommands />
                </section>

                <section>
                  <h3>Usage</h3>
                  <Usage />
                </section>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {disabled && (
        <div className={styles.safariUI}>
          <SafariBar />
        </div>
      )}
    </div>
  );
}
