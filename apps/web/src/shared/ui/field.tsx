import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  className?: string;
  children: ReactNode;
};

export function Field({ id, etiqueta, error, ayuda, className, children }: Props) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {ayuda && !error ? <p className="text-xs text-muted-foreground">{ayuda}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
