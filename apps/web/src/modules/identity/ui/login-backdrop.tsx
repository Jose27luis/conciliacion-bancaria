"use client";

import { motion } from "framer-motion";

const RESPLANDORES = [
  { clase: "left-[-10%] top-[-15%] size-[38rem] bg-primary/20", x: [0, 60, -20, 0], y: [0, 40, 80, 0], duracion: 26 },
  { clase: "bottom-[-20%] right-[-10%] size-[42rem] bg-sistema/15", x: [0, -70, 20, 0], y: [0, -50, -10, 0], duracion: 32 },
  { clase: "left-[35%] top-[40%] size-[24rem] bg-secondary/40", x: [0, 40, -40, 0], y: [0, -30, 30, 0], duracion: 22 },
];

export function LoginBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.35)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />
      {RESPLANDORES.map((resplandor) => (
        <motion.div
          key={resplandor.clase}
          className={`absolute rounded-full blur-3xl ${resplandor.clase}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, x: resplandor.x, y: resplandor.y }}
          transition={{
            opacity: { duration: 1.4 },
            scale: { duration: 1.4 },
            x: { duration: resplandor.duracion, repeat: Infinity, ease: "easeInOut" },
            y: { duration: resplandor.duracion, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
    </div>
  );
}
