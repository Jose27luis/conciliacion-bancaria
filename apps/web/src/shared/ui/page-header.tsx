import type { ReactNode } from "react";

type Props = {
  seccion: string;
  titulo: string;
  descripcion: string;
  acciones?: ReactNode;
};

export function PageHeader({ seccion, titulo, descripcion, acciones }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-primary">{seccion}</p>
        <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">{titulo}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </header>
  );
}
