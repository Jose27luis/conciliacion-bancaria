import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { opcionesDeMes } from "./month-options";

type Props = {
  cuentas: { id: string; nombre: string }[];
  cuenta: string | undefined;
  anio: number;
  mes: number;
  q: string | undefined;
  estado: "REGISTRADO" | "ANULADO" | "TODOS";
  actual: { anio: number; mes: number };
};

const SELECTOR = "h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground [color-scheme:dark]";

export function LedgerFilters({ cuentas, cuenta, anio, mes, q, estado, actual }: Props) {
  return (
    <form className="flex flex-wrap items-end gap-3" role="search">
      <div className="grid gap-1.5">
        <Label htmlFor="filtro-periodo">Periodo</Label>
        <select id="filtro-periodo" name="periodo" defaultValue={`${anio}-${mes}`} className={SELECTOR}>
          {opcionesDeMes(actual, { anio, mes }).map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="filtro-cuenta">Cuenta</Label>
        <select id="filtro-cuenta" name="cuenta" defaultValue={cuenta ?? ""} className={SELECTOR}>
          <option value="">Todas las cuentas</option>
          {cuentas.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>
              {opcion.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="filtro-estado">Estado</Label>
        <select id="filtro-estado" name="estado" defaultValue={estado} className={SELECTOR}>
          <option value="REGISTRADO">Registrados</option>
          <option value="ANULADO">Anulados</option>
          <option value="TODOS">Todos</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="filtro-texto">Buscar</Label>
        <Input id="filtro-texto" name="q" defaultValue={q} className="w-64" />
      </div>
      <Button type="submit" variant="secondary">
        <Search className="size-4" aria-hidden="true" />
        Filtrar
      </Button>
      {q || cuenta || estado !== "REGISTRADO" ? (
        <Button asChild variant="ghost">
          <Link href={`/ledger?periodo=${anio}-${mes}`}>Limpiar</Link>
        </Button>
      ) : null}
    </form>
  );
}
