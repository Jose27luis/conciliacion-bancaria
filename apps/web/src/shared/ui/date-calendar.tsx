"use client";

import { useEffect, useLayoutEffect, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { MESES } from "@conciliacion/contracts/enums";
import { cn } from "@/lib/utils";

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const ANCHO_PANEL = 296;
const SEPARACION = 6;
const RESORTE = { type: "spring", stiffness: 420, damping: 32 } as const;

type Mes = { anio: number; mes: number };

export type DateCalendarProps = {
  ancla: HTMLElement;
  valor: string;
  hoy: string;
  desde?: string;
  hasta?: string;
  marcas?: Record<string, number>;
  etiquetaRango?: string;
  alElegir: (fecha: string) => void;
  alCerrar: (devolverFoco: boolean) => void;
};

function dosDigitos(numero: number): string {
  return String(numero).padStart(2, "0");
}

function fechaIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${dosDigitos(mes)}-${dosDigitos(dia)}`;
}

function leerFecha(texto: string): { anio: number; mes: number; dia: number } | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) {
    return null;
  }
  return { anio: Number(partes[1]), mes: Number(partes[2]), dia: Number(partes[3]) };
}

function diasDelMes(anio: number, mes: number): number {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function desplazarDias(fecha: string, dias: number): string {
  const actual = leerFecha(fecha);
  if (!actual) {
    return fecha;
  }
  const destino = new Date(Date.UTC(actual.anio, actual.mes - 1, actual.dia + dias));
  return fechaIso(destino.getUTCFullYear(), destino.getUTCMonth() + 1, destino.getUTCDate());
}

function desplazarMes({ anio, mes }: Mes, pasos: number): Mes {
  const total = anio * 12 + (mes - 1) + pasos;
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 };
}

function compararMes(a: Mes, b: Mes): number {
  return a.anio * 12 + a.mes - (b.anio * 12 + b.mes);
}

function mesDe(fecha: string | undefined): Mes | null {
  const leida = fecha ? leerFecha(fecha) : null;
  return leida ? { anio: leida.anio, mes: leida.mes } : null;
}

function dentro(fecha: string, desde: string | undefined, hasta: string | undefined): boolean {
  return (!desde || fecha >= desde) && (!hasta || fecha <= hasta);
}

function textoMarcas(cantidad: number): string {
  return cantidad === 1 ? "1 voucher registrado" : `${cantidad} vouchers registrados`;
}

function usePosicionPanel(ancla: HTMLElement, panel: HTMLDivElement | null): { arriba: number; izquierda: number; haciaArriba: boolean } {
  const [posicion, setPosicion] = useState({ arriba: 0, izquierda: 0, haciaArriba: false });
  useLayoutEffect(() => {
    const calcular = (): void => {
      const caja = ancla.getBoundingClientRect();
      const alto = panel?.offsetHeight ?? 360;
      const haciaArriba = caja.bottom + SEPARACION + alto > window.innerHeight && caja.top - SEPARACION - alto > 0;
      const izquierda = Math.min(Math.max(8, caja.left), window.innerWidth - ANCHO_PANEL - 8);
      setPosicion({ arriba: haciaArriba ? caja.top - SEPARACION - alto : caja.bottom + SEPARACION, izquierda, haciaArriba });
    };
    calcular();
    const alDesplazar = (evento: Event): void => {
      if (!(evento.target instanceof Node && panel?.contains(evento.target))) {
        calcular();
      }
    };
    window.addEventListener("scroll", alDesplazar, true);
    window.addEventListener("resize", calcular);
    return () => {
      window.removeEventListener("scroll", alDesplazar, true);
      window.removeEventListener("resize", calcular);
    };
  }, [ancla, panel]);
  return posicion;
}

export function DateCalendar({ ancla, valor, hoy, desde, hasta, marcas = {}, etiquetaRango, alElegir, alCerrar }: DateCalendarProps) {
  const inicial = leerFecha(valor) && dentro(valor, desde, hasta) ? valor : dentro(hoy, desde, hasta) ? hoy : desde ?? hoy;
  const [enfocado, setEnfocado] = useState(inicial);
  const [visible, setVisible] = useState<Mes>(mesDe(inicial) ?? { anio: new Date().getFullYear(), mes: new Date().getMonth() + 1 });
  const [direccion, setDireccion] = useState(0);
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const posicion = usePosicionPanel(ancla, panel);

  const minimo = mesDe(desde);
  const maximo = mesDe(hasta);
  const puedeAnterior = !minimo || compararMes(visible, minimo) > 0;
  const puedeSiguiente = !maximo || compararMes(visible, maximo) < 0;

  useEffect(() => {
    panel?.querySelector<HTMLButtonElement>(`[data-fecha="${enfocado}"]`)?.focus({ preventScroll: true });
  }, [enfocado, visible, panel]);

  useEffect(() => {
    const alPresionar = (evento: MouseEvent): void => {
      const objetivo = evento.target;
      if (objetivo instanceof Node && !panel?.contains(objetivo) && !ancla.contains(objetivo)) {
        alCerrar(false);
      }
    };
    document.addEventListener("mousedown", alPresionar);
    return () => document.removeEventListener("mousedown", alPresionar);
  }, [ancla, panel, alCerrar]);

  const irAMes = (destino: Mes): void => {
    setDireccion(compararMes(destino, visible) > 0 ? 1 : -1);
    setVisible(destino);
  };

  const enfocarFecha = (fecha: string): void => {
    if (!dentro(fecha, desde, hasta)) {
      return;
    }
    const mes = mesDe(fecha);
    if (mes && compararMes(mes, visible) !== 0) {
      irAMes(mes);
    }
    setEnfocado(fecha);
  };

  const cambiarMes = (pasos: number): void => {
    const destino = desplazarMes(visible, pasos);
    irAMes(destino);
    const leida = leerFecha(enfocado);
    const dia = Math.min(leida?.dia ?? 1, diasDelMes(destino.anio, destino.mes));
    const candidata = fechaIso(destino.anio, destino.mes, dia);
    setEnfocado(dentro(candidata, desde, hasta) ? candidata : desde && candidata < desde ? desde : hasta ?? candidata);
  };

  const teclear = (evento: KeyboardEvent<HTMLDivElement>): void => {
    const leida = leerFecha(enfocado);
    const diaSemana = leida ? (new Date(Date.UTC(leida.anio, leida.mes - 1, leida.dia)).getUTCDay() + 6) % 7 : 0;
    const acciones: Record<string, () => void> = {
      ArrowLeft: () => enfocarFecha(desplazarDias(enfocado, -1)),
      ArrowRight: () => enfocarFecha(desplazarDias(enfocado, 1)),
      ArrowUp: () => enfocarFecha(desplazarDias(enfocado, -7)),
      ArrowDown: () => enfocarFecha(desplazarDias(enfocado, 7)),
      Home: () => enfocarFecha(desplazarDias(enfocado, -diaSemana)),
      End: () => enfocarFecha(desplazarDias(enfocado, 6 - diaSemana)),
      PageUp: () => puedeAnterior && cambiarMes(-1),
      PageDown: () => puedeSiguiente && cambiarMes(1),
      Enter: () => alElegir(enfocado),
      " ": () => alElegir(enfocado),
      Escape: () => alCerrar(true),
    };
    const accion = acciones[evento.key];
    if (accion) {
      evento.preventDefault();
      evento.stopPropagation();
      accion();
    }
  };

  const primerDia = (new Date(Date.UTC(visible.anio, visible.mes - 1, 1)).getUTCDay() + 6) % 7;
  const totalDias = diasDelMes(visible.anio, visible.mes);
  const celdas: (string | null)[] = [
    ...Array.from({ length: primerDia }, () => null),
    ...Array.from({ length: totalDias }, (_, indice) => fechaIso(visible.anio, visible.mes, indice + 1)),
  ];
  const hoyDisponible = dentro(hoy, desde, hasta);
  const totalMes = Object.entries(marcas)
    .filter(([fecha]) => fecha.startsWith(`${visible.anio}-${dosDigitos(visible.mes)}`))
    .reduce((suma, [, cantidad]) => suma + cantidad, 0);

  return createPortal(
    <motion.div
      ref={setPanel}
      role="dialog"
      aria-label="Elegir fecha"
      initial={{ opacity: 0, scale: 0.96, y: posicion.haciaArriba ? 6 : -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
      style={{ top: posicion.arriba, left: posicion.izquierda, width: ANCHO_PANEL, transformOrigin: posicion.haciaArriba ? "bottom left" : "top left" }}
      className="fixed z-[60] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl shadow-black/60 backdrop-blur-md"
      onKeyDown={teclear}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -left-10 size-32 rounded-full bg-sistema/10 blur-3xl" />

      <div className="relative flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <AnimatePresence mode="popLayout" initial={false} custom={direccion}>
            <motion.p
              key={`${visible.anio}-${visible.mes}`}
              custom={direccion}
              initial={{ opacity: 0, y: direccion >= 0 ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direccion >= 0 ? -10 : 10 }}
              transition={{ duration: 0.18 }}
              className="text-base font-semibold text-white"
              aria-live="polite"
            >
              {MESES[visible.mes - 1]} <span className="font-normal text-muted-foreground">{visible.anio}</span>
            </motion.p>
          </AnimatePresence>
          {etiquetaRango ? <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{etiquetaRango}</p> : null}
        </div>
        <div className="flex gap-1">
          {[
            { pasos: -1, habilitado: puedeAnterior, Icono: ChevronLeft, etiqueta: "Mes anterior" },
            { pasos: 1, habilitado: puedeSiguiente, Icono: ChevronRight, etiqueta: "Mes siguiente" },
          ].map(({ pasos, habilitado, Icono, etiqueta }) => (
            <motion.button
              key={etiqueta}
              type="button"
              tabIndex={-1}
              disabled={!habilitado}
              onClick={() => cambiarMes(pasos)}
              aria-label={etiqueta}
              whileHover={habilitado ? { scale: 1.1 } : undefined}
              whileTap={habilitado ? { scale: 0.9 } : undefined}
              className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground"
            >
              <Icono className="size-4" aria-hidden="true" />
            </motion.button>
          ))}
        </div>
      </div>

      <div className="relative grid grid-cols-7 px-3 pb-1">
        {DIAS_SEMANA.map((dia, indice) => (
          <span key={dia} className={cn("py-1 text-center text-[10px] font-bold uppercase tracking-wider", indice >= 5 ? "text-sistema/80" : "text-muted-foreground")}>
            {dia}
          </span>
        ))}
      </div>

      <div className="relative overflow-hidden px-3 pb-3">
        <AnimatePresence mode="popLayout" initial={false} custom={direccion}>
          <motion.div
            key={`${visible.anio}-${visible.mes}`}
            role="grid"
            aria-label={`${MESES[visible.mes - 1]} ${visible.anio}`}
            initial={{ opacity: 0, x: direccion >= 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direccion >= 0 ? -40 : 40 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-7 gap-1"
          >
            {celdas.map((fecha, indice) => {
              if (!fecha) {
                return <span key={`vacio-${indice}`} aria-hidden="true" />;
              }
              const dia = Number(fecha.slice(8));
              const habilitado = dentro(fecha, desde, hasta);
              const elegido = fecha === valor;
              const esHoy = fecha === hoy;
              const cantidad = marcas[fecha] ?? 0;
              const finDeSemana = indice % 7 >= 5;
              return (
                <motion.button
                  key={fecha}
                  type="button"
                  data-fecha={fecha}
                  tabIndex={fecha === enfocado ? 0 : -1}
                  disabled={!habilitado}
                  aria-selected={elegido}
                  aria-current={esHoy ? "date" : undefined}
                  aria-label={`${dia} de ${MESES[visible.mes - 1]} de ${visible.anio}${cantidad > 0 ? `, ${textoMarcas(cantidad)}` : ""}${habilitado ? "" : ", fuera del periodo"}`}
                  title={cantidad > 0 ? textoMarcas(cantidad) : habilitado ? undefined : "Fuera del periodo de la hoja"}
                  onClick={() => alElegir(fecha)}
                  onFocus={() => setEnfocado(fecha)}
                  whileHover={habilitado && !elegido ? { y: -2 } : undefined}
                  whileTap={habilitado ? { scale: 0.9 } : undefined}
                  className={cn(
                    "relative flex h-9 flex-col items-center justify-center rounded-lg text-sm tabular-nums outline-none transition-colors",
                    habilitado ? "text-foreground hover:bg-muted" : "cursor-not-allowed text-muted-foreground/30",
                    habilitado && finDeSemana && !elegido && "text-sistema/90",
                    fecha === enfocado && !elegido && "ring-1 ring-primary/70",
                    esHoy && !elegido && "font-bold text-primary",
                  )}
                >
                  {elegido ? (
                    <motion.span
                      layoutId="calendario-elegido"
                      aria-hidden="true"
                      className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-[#f5c04a] shadow-[0_0_16px_hsl(var(--primary)/0.45)]"
                      transition={RESORTE}
                    />
                  ) : null}
                  {esHoy && !elegido ? <span aria-hidden="true" className="absolute inset-0.5 rounded-md border border-dashed border-primary/60" /> : null}
                  <span className={cn("relative leading-none", elegido && "font-bold text-primary-foreground")}>{dia}</span>
                  {cantidad > 0 ? (
                    <span aria-hidden="true" className="relative mt-1 flex gap-0.5">
                      {Array.from({ length: Math.min(cantidad, 3) }, (_, punto) => (
                        <span key={punto} className={cn("size-1 rounded-full", elegido ? "bg-primary-foreground/70" : "bg-exito")} />
                      ))}
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative flex items-center justify-between gap-2 border-t border-border/70 bg-background/40 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-exito" />
          {totalMes > 0 ? textoMarcas(totalMes) : "Sin vouchers este mes"}
        </span>
        <motion.button
          type="button"
          tabIndex={-1}
          disabled={!hoyDisponible}
          onClick={() => alElegir(hoy)}
          whileHover={hoyDisponible ? { scale: 1.04 } : undefined}
          whileTap={hoyDisponible ? { scale: 0.96 } : undefined}
          title={hoyDisponible ? undefined : "Hoy está fuera del periodo de la hoja"}
          className="flex items-center gap-1.5 rounded-md border border-primary/50 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary"
        >
          <CalendarCheck className="size-3.5" aria-hidden="true" />
          Hoy
        </motion.button>
      </div>
    </motion.div>,
    document.body,
  );
}
