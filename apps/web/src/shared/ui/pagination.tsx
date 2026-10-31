import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  pagina: number;
  porPagina: number;
  total: number;
  enlace: (pagina: number) => string;
};

export function Pagination({ pagina, porPagina, total, enlace }: Props) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, pagina * porPagina);

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {desde}-{hasta} de {total}
      </span>
      <div className="flex items-center gap-2">
        {pagina > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={enlace(pagina - 1)}>
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </Link>
          </Button>
        ) : null}
        <span>
          Página {pagina} de {paginas}
        </span>
        {pagina < paginas ? (
          <Button asChild variant="outline" size="sm">
            <Link href={enlace(pagina + 1)}>
              Siguiente
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
      </div>
    </nav>
  );
}
