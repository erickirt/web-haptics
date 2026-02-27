import styles from "./styles.module.scss";

import React, { createContext, useContext, useRef, useCallback } from "react";
import { useAnimationFrame } from "motion/react";

type Particle = {
  x: number;
  y: number;
  xv: number;
  yv: number;
  s: number;
  a: number;
  el: HTMLDivElement;
  idle?: boolean;
};

type ParticlesContextValue = {
  create: (x: number, y: number, emojis: string[], duration?: number) => void;
};

const ParticlesContext = createContext<ParticlesContextValue | null>(null);

export const useParticles = () => {
  const ctx = useContext(ParticlesContext);
  if (!ctx) {
    throw new Error("useParticles must be used within a ParticlesProvider");
  }
  return ctx;
};

const MAX_PARTICLES = 250;

export const ParticlesProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particles = useRef<Particle[]>([]);

  useAnimationFrame(() => {
    if (particles.current) {
      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        p.a += p.xv * 0.5;
        p.y += p.yv *= 0.9;
        p.x += p.xv *= 0.98;
        p.s += (1 - p.s) * 0.3;
        p.yv += (-1.5 + p.yv) * 0.1;
        p.el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${p.s}) rotate(${p.a}deg)`;

        if (p.y < -100) {
          p.el.remove();
          p.idle = true;
        }
      }

      particles.current = particles.current.filter((p) => !p.idle);
    }
  });

  const spawnBurst = useCallback((x: number, y: number, emojis: string[]) => {
    const amount = 4;

    if (particles.current.length > MAX_PARTICLES) return;

    for (let i = 0; i < amount; i++) {
      const element = document.createElement("div");
      element.className = `${styles.particle}`;
      containerRef.current?.appendChild(element);
      element.style.fontSize = 20 + Math.ceil(Math.random() * 40) + "px";
      element.className += " icon-0" + Math.ceil(Math.random() * 5);
      element.innerHTML =
        emojis[Math.floor(Math.random() * emojis.length)] || "✨";

      particles.current.push({
        x: x - 10,
        y: y - 10,
        yv:
          (i === 0 ? 4 : i === 1 ? 8 : i === 2 ? 8 : 0) *
          (0.25 + Math.random() * 0.25),
        xv: Math.random() * 16 - 8,
        s: 0.2,
        a: 0,
        el: element,
      });
    }
  }, []);

  const create = useCallback(
    (
      x: number,
      y: number,
      emojis: string[] = ["✨", "🔥"],
      duration?: number,
    ) => {
      spawnBurst(x, y, emojis);

      if (duration && duration > 0) {
        const interval = 150;
        const count = Math.floor(duration / interval);
        for (let i = 1; i <= count; i++) {
          setTimeout(() => spawnBurst(x, y, emojis), i * interval);
        }
      }
    },
    [spawnBurst],
  );

  return (
    <ParticlesContext.Provider value={{ create }}>
      {children}
      <div ref={containerRef} className={styles.particles} />
    </ParticlesContext.Provider>
  );
};
