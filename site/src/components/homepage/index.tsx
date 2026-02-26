import styles from "./styles.module.scss";

import { useState } from "react";

import { Footer } from "../footer";
import { CodeBlock } from "../codeblock";
import { InstallCommands } from "./install-cmd";
import { examples, populateExample } from "./usage";
import * as Logos from "./logos";
import { Demo } from "./demo";
import { Button } from "../button";

const frameworks = [
  {
    name: "React",
    entrypoint: "web-haptics/react",
    logo: <Logos.ReactLogo />,
    example: examples.react,
  },
  {
    name: "TypeScript",
    entrypoint: "web-haptics",
    logo: <Logos.TypeScriptLogo />,
    example: examples.vanilla,
  },
  {
    name: "Vue",
    entrypoint: "web-haptics/vue",
    logo: <Logos.VueLogo />,
    example: examples.vue,
  },
  {
    name: "Svelte",
    entrypoint: "web-haptics/svelte",
    logo: <Logos.SvelteLogo />,
    example: examples.svelte,
  },
];

export default function Home() {
  const [frameworkIndex, setFrameworkIndex] = useState(0);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>WebHaptics</h1>
          <p>Haptic feedback for the web.</p>
        </div>

        <Demo />

        <section>
          <h3>Install</h3>
          <InstallCommands />
        </section>

        <section>
          <h3>Usage</h3>

          <div className={styles.example}>
            <div className={styles.controls}>
              {frameworks.map((f, i) => (
                <Button
                  key={f.name}
                  disabled={frameworkIndex === i}
                  onClick={() => setFrameworkIndex(i)}
                  aria-label={`View example for ${f.name}`}
                >
                  <span className={styles.logo}>{f.logo}</span>
                  <span className={styles.name}>{f.name}</span>
                </Button>
              ))}
            </div>

            <CodeBlock
              code={`import { useWebHaptics } from '${frameworks[frameworkIndex % frameworks.length].entrypoint}';

${populateExample(frameworks[frameworkIndex % frameworks.length].example, "")}`}
            />
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
