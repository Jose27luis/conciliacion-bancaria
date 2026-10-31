"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type Props = Omit<ComponentProps<typeof Button>, "type"> & { textoEnviando?: string };

export function SubmitButton({ children, textoEnviando, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {pending && textoEnviando ? textoEnviando : children}
    </Button>
  );
}
