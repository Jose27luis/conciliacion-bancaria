import { Badge } from "@/components/ui/badge";

export function StatusBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <Badge variant="outline" className="border-exito/40 text-exito">
      Activo
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inactivo
    </Badge>
  );
}
