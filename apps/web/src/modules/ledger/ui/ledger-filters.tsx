import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FilterSelect, LiveSearch } from "@/shared/ui/live-search";
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

export function LedgerFilters({ cuentas, cuenta, anio, mes, q, estado, actual }: Props) {
  return (
    <div className="flex flex-wrap items-start gap-3" role="search">
      <FilterSelect
        id="filtro-periodo"
        etiqueta="Periodo"
        parametro="periodo"
        valorPorDefecto={`${actual.anio}-${actual.mes}`}
        opciones={opcionesDeMes(actual, { anio, mes })}
      />
      <FilterSelect
        id="filtro-cuenta"
        etiqueta="Cuenta"
        parametro="cuenta"
        opciones={[{ valor: "", etiqueta: "Todas las cuentas" }, ...cuentas.map((opcion) => ({ valor: opcion.id, etiqueta: opcion.nombre }))]}
      />
      <FilterSelect
        id="filtro-estado"
        etiqueta="Estado"
        parametro="estado"
        valorPorDefecto="REGISTRADO"
        opciones={[
          { valor: "REGISTRADO", etiqueta: "Registrados" },
          { valor: "ANULADO", etiqueta: "Anulados" },
          { valor: "TODOS", etiqueta: "Todos" },
        ]}
      />
      <LiveSearch id="filtro-texto" etiqueta="Buscar" ayuda="Voucher, RUC, razón social, analítico, detalle o CTA." className="w-full max-w-sm" />
      {q || cuenta || estado !== "REGISTRADO" ? (
        <Button asChild variant="ghost" className="mt-6">
          <Link href={`/ledger?periodo=${anio}-${mes}`}>Limpiar</Link>
        </Button>
      ) : null}
    </div>
  );
}
