"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { Reorder, useDragControls } from "framer-motion";
import type { BorradorEdicion } from "./draft-model";

export type ArrastreFila = { iniciar: (evento: PointerEvent<HTMLElement>) => void; arrastrando: boolean };

type Props = { borrador: BorradorEdicion; children: (arrastre: ArrastreFila) => ReactNode };

export function SortableRow({ borrador, children }: Props) {
  const controles = useDragControls();
  const [arrastrando, setArrastrando] = useState(false);
  return (
    <Reorder.Item
      as="div"
      value={borrador}
      dragListener={false}
      dragControls={controles}
      layout="position"
      onDragStart={() => setArrastrando(true)}
      onDragEnd={() => setArrastrando(false)}
      whileDrag={{ scale: 1.004, boxShadow: "0 22px 45px -14px rgba(0, 0, 0, 0.8), 0 0 0 1px hsl(var(--primary) / 0.55)", zIndex: 30 }}
      transition={{ type: "spring", stiffness: 520, damping: 38 }}
      className="relative"
    >
      {children({ iniciar: (evento) => controles.start(evento), arrastrando })}
    </Reorder.Item>
  );
}
