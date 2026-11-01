"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Entidad, EntidadConHistorial, Hoja, OpcionCuentaContable, Voucher } from "@conciliacion/contracts";
import { MESES, puedeModificarVoucher, type Rol } from "@conciliacion/contracts/enums";
import {
  centavosATexto,
  formatoVoucher,
  montoACentavos,
  normalizarDocumento,
  normalizarMonto,
  normalizarTexto,
  puntajeCoincidencia,
  SIN_COMPROBANTE,
  tieneErrores,
  validarVoucher,
  type Problema,
} from "@conciliacion/contracts/rules";
import { Loader2, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { avisosDeLote, buscarEntidades, editarVoucher, entidadPorDocumento, registrarLote } from "../actions";
import {
  aEntrada,
  borradorDesdeVoucher,
  borradorVacio,
  esCampoDeLinea,
  estaVacio,
  guardarBorradores,
  leerBorradoresGuardados,
  lineaVacia,
  type BorradorEdicion,
  type CampoCabecera,
  type CampoDeLinea,
  type CampoHoja,
  type Foco,
} from "./draft-model";
import { DraftRows, type CalendarioHoja, type EstadoBorrador } from "./draft-rows";
import { PeriodPicker } from "./period-picker";
import { RegisteredRows } from "./registered-rows";
import { CELDA, GRILLA } from "./sheet-styles";
import { SidePanels, type ObservacionHoja } from "./side-panels";
import type { Sugerencia } from "./suggestion-bar";

type Catalogo = { codigo: string; descripcion: string };

export type PlantillaHoja = {
  atajo: number;
  etiqueta: string;
  documento: string;
  razonSocial: string;
  detalle: string;
  cuentaContableCodigo: string;
  medioPagoCodigo: string;
  analitico: string;
  tipo: "EGRESO" | "INGRESO";
  importe: string | null;
};
type CuentaPestana = { id: string; nombre: string; detalle: string };

type Props = {
  hoja: Hoja;
  cuentas: CuentaPestana[];
  opcionesCuentas: OpcionCuentaContable[];
  medios: Catalogo[];
  tipos: Catalogo[];
  hoy: string;
  puedeRegistrar: boolean;
  usuario: { id: string; rol: Rol };
  editarId: string | null;
  plantillas: PlantillaHoja[];
};

const MAXIMO_SUGERENCIAS = 8;

function ordenarPorCoincidencia<T>(elementos: readonly T[], texto: (elemento: T) => string, consulta: string): T[] {
  if (!consulta.trim()) {
    return [...elementos];
  }
  return elementos
    .map((elemento, posicion) => ({ elemento, posicion, puntaje: puntajeCoincidencia(texto(elemento), consulta) }))
    .filter((candidato) => candidato.puntaje > 0)
    .sort((a, b) => b.puntaje - a.puntaje || a.posicion - b.posicion)
    .map((candidato) => candidato.elemento);
}

function dinero(centavos: number): string {
  return (centavos / 100).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaInicial(hoy: string, anio: number, mes: number, previa: string | undefined): string {
  if (previa) {
    return previa;
  }
  const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
  return hoy.startsWith(prefijo) ? hoy : `${prefijo}-01`;
}

export function QuickEntry({ hoja, cuentas, opcionesCuentas, medios, tipos, hoy, puedeRegistrar, usuario, editarId, plantillas }: Props) {
  const router = useRouter();
  const { cuenta, periodo } = hoja;
  const enSoles = cuenta.moneda === "PEN";
  const claveAlmacen = `conciliacion:borradores:${cuenta.id}`;

  const [borradores, setBorradores] = useState<BorradorEdicion[]>([]);
  const [cargado, setCargado] = useState(false);
  const [almacenDisponible, setAlmacenDisponible] = useState(true);
  const [foco, setFoco] = useState<Foco | null>(null);
  const [entidades, setEntidades] = useState<Record<string, EntidadConHistorial | null>>({});
  const [busqueda, setBusqueda] = useState<{ consulta: string; resultados: Entidad[] }>({ consulta: "", resultados: [] });
  const [avisosServidor, setAvisosServidor] = useState<Record<string, string[]>>({});
  const [verificacionFallida, setVerificacionFallida] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string[]>>({});
  const [registrando, setRegistrando] = useState(false);
  const [focoPendiente, setFocoPendiente] = useState<Foco | null>(null);
  const consultando = useRef(new Set<string>());

  const ultimoRegistrado = hoja.vouchers[hoja.vouchers.length - 1];
  const calendario = useMemo<CalendarioHoja>(() => {
    const mes = String(periodo.mes).padStart(2, "0");
    const ultimoDia = new Date(Date.UTC(periodo.anio, periodo.mes, 0)).getUTCDate();
    const marcas: Record<string, number> = {};
    for (const voucher of hoja.vouchers) {
      if (voucher.estado === "REGISTRADO") {
        marcas[voucher.fechaOperacion] = (marcas[voucher.fechaOperacion] ?? 0) + 1;
      }
    }
    return { hoy, desde: `${periodo.anio}-${mes}-01`, hasta: `${periodo.anio}-${mes}-${ultimoDia}`, marcas };
  }, [hoja.vouchers, hoy, periodo.anio, periodo.mes]);
  const tipoCambioInicial = enSoles ? "" : ultimoRegistrado?.tipoCambio ?? "";

  useEffect(() => {
    const guardados = leerBorradoresGuardados(claveAlmacen);
    setBorradores(guardados.length > 0 ? guardados : puedeRegistrar ? [borradorVacio(fechaInicial(hoy, periodo.anio, periodo.mes, undefined), tipoCambioInicial)] : []);
    setCargado(true);
  }, [claveAlmacen, hoy, periodo.anio, periodo.mes, puedeRegistrar, tipoCambioInicial]);

  useEffect(() => {
    if (cargado) {
      setAlmacenDisponible(guardarBorradores(claveAlmacen, borradores));
    }
  }, [borradores, cargado, claveAlmacen]);

  useEffect(() => {
    if (!focoPendiente) {
      return;
    }
    const selector = `input[data-borrador="${focoPendiente.borradorId}"][data-campo="${focoPendiente.campo}"][data-linea="${focoPendiente.linea}"]`;
    const elemento = document.querySelector<HTMLInputElement>(selector);
    if (elemento) {
      elemento.focus();
      setFocoPendiente(null);
    }
  }, [focoPendiente, borradores]);

  const contexto = useMemo(
    () => ({
      cuentasContables: new Set(opcionesCuentas.map((opcion) => opcion.codigo)),
      mediosPago: new Set(medios.map((medio) => medio.codigo)),
      tiposComprobante: new Set(tipos.map((tipo) => tipo.codigo)),
    }),
    [opcionesCuentas, medios, tipos],
  );

  const problemas = useMemo(() => {
    const resultado: Record<string, Problema[]> = {};
    for (const borrador of borradores) {
      if (estaVacio(borrador)) {
        resultado[borrador.id] = [];
        continue;
      }
      const documento = normalizarDocumento(borrador.documento);
      const propios = validarVoucher(aEntrada(borrador, cuenta.moneda), {
        moneda: cuenta.moneda,
        periodo: { anio: periodo.anio, mes: periodo.mes },
        ...contexto,
        entidadConocida: Boolean(entidades[documento]),
      });
      for (const mensaje of avisosServidor[borrador.id] ?? []) {
        propios.push({ nivel: "aviso", campo: "analitico", linea: null, mensaje });
      }
      for (const mensaje of erroresServidor[borrador.id] ?? []) {
        propios.push({ nivel: "error", campo: "documento", linea: null, mensaje });
      }
      resultado[borrador.id] = propios;
    }
    return resultado;
  }, [borradores, contexto, cuenta.moneda, entidades, periodo.anio, periodo.mes, avisosServidor, erroresServidor]);

  const vacios = useMemo(() => new Set(borradores.filter(estaVacio).map((borrador) => borrador.id)), [borradores]);

  const estadoDe = useCallback(
    (id: string): EstadoBorrador => {
      if (vacios.has(id)) {
        return "vacio";
      }
      const lista = problemas[id] ?? [];
      return tieneErrores(lista) ? "error" : lista.length > 0 ? "aviso" : "ok";
    },
    [problemas, vacios],
  );

  const editables = useMemo(
    () =>
      new Set(
        hoja.vouchers
          .filter((voucher) => puedeRegistrar && periodo.estado === "ABIERTO" && voucher.estado === "REGISTRADO" && puedeModificarVoucher(usuario.rol, usuario.id, voucher.creadoPorId))
          .map((voucher) => voucher.id),
      ),
    [hoja.vouchers, periodo.estado, puedeRegistrar, usuario.id, usuario.rol],
  );

  const enEdicion = useMemo(() => new Set(borradores.flatMap((borrador) => (borrador.voucherId ? [borrador.voucherId] : []))), [borradores]);

  const iniciarEdicion = useCallback(
    (voucher: Voucher) => {
      const existente = borradores.find((borrador) => borrador.voucherId === voucher.id);
      if (existente) {
        setFocoPendiente({ borradorId: existente.id, campo: "detalle", linea: 0 });
        return;
      }
      const borrador = borradorDesdeVoucher(voucher);
      const documento = normalizarDocumento(voucher.entidad.numeroDocumento);
      setEntidades((previas) => (previas[documento] ? previas : { ...previas, [documento]: { ...voucher.entidad, detalles: [] } }));
      entidadPorDocumento(documento)
        .then((entidad) => {
          if (entidad) {
            setEntidades((previas) => ({ ...previas, [documento]: entidad }));
          }
        })
        .catch(() => toast.error(`No se pudo cargar el historial de ${voucher.entidad.razonSocial}.`));
      setBorradores((actuales) => [borrador, ...actuales.filter((actual) => !estaVacio(actual))]);
      setFocoPendiente({ borradorId: borrador.id, campo: "detalle", linea: 0 });
    },
    [borradores],
  );

  const edicionSolicitada = useRef(false);
  useEffect(() => {
    if (!cargado || !editarId || edicionSolicitada.current) {
      return;
    }
    edicionSolicitada.current = true;
    const voucher = hoja.vouchers.find((actual) => actual.id === editarId);
    if (voucher && editables.has(voucher.id)) {
      iniciarEdicion(voucher);
    } else {
      toast.error("Ese voucher no se puede editar: está anulado, en un mes cerrado o lo registró otra persona.");
    }
    router.replace(`/quick-entry?cuenta=${cuenta.id}&anio=${periodo.anio}&mes=${periodo.mes}`, { scroll: false });
  }, [cargado, editarId, editables, hoja.vouchers, iniciarEdicion, router, cuenta.id, periodo.anio, periodo.mes]);

  const documentosPendientes = useMemo(
    () => [...new Set(borradores.map((borrador) => normalizarDocumento(borrador.documento)).filter((documento) => documento.length >= 8))],
    [borradores],
  );

  useEffect(() => {
    const faltantes = documentosPendientes.filter((documento) => !(documento in entidades) && !consultando.current.has(documento));
    if (faltantes.length === 0) {
      return;
    }
    const temporizador = window.setTimeout(() => {
      for (const documento of faltantes) {
        consultando.current.add(documento);
        entidadPorDocumento(documento)
          .then((entidad) => {
            setEntidades((previas) => ({ ...previas, [documento]: entidad }));
            if (entidad) {
              setBorradores((actuales) =>
                actuales.map((borrador) => {
                  if (normalizarDocumento(borrador.documento) !== documento) {
                    return borrador;
                  }
                  const unico = entidad.detalles.length === 1 ? entidad.detalles[0] : undefined;
                  const [primera, ...resto] = borrador.lineas;
                  const completar = unico && primera && !primera.detalle;
                  return {
                    ...borrador,
                    razonSocial: entidad.razonSocial,
                    medioPagoCodigo: completar && !borrador.medioPagoCodigo ? unico.medioPagoCodigo : borrador.medioPagoCodigo,
                    lineas: completar ? [{ ...primera, detalle: unico.detalle, cuentaContableCodigo: unico.cuentaContableCodigo }, ...resto] : borrador.lineas,
                  };
                }),
              );
            }
          })
          .catch(() => {
            toast.error(`No se pudo consultar el documento ${documento}. Revisa tu conexión.`);
          })
          .finally(() => {
            consultando.current.delete(documento);
          });
      }
    }, 300);
    return () => window.clearTimeout(temporizador);
  }, [documentosPendientes, entidades]);

  const borradorEnfocado = foco ? borradores.find((borrador) => borrador.id === foco.borradorId) : undefined;
  const consultaBusqueda =
    foco && borradorEnfocado && (foco.campo === "documento" || foco.campo === "razonSocial") && !entidades[normalizarDocumento(borradorEnfocado.documento)]
      ? (foco.campo === "documento" ? borradorEnfocado.documento : borradorEnfocado.razonSocial).trim()
      : "";

  useEffect(() => {
    if (consultaBusqueda.length < 2) {
      setBusqueda({ consulta: "", resultados: [] });
      return;
    }
    const temporizador = window.setTimeout(() => {
      buscarEntidades(consultaBusqueda)
        .then((resultados) => setBusqueda({ consulta: consultaBusqueda, resultados }))
        .catch(() => setBusqueda({ consulta: consultaBusqueda, resultados: [] }));
    }, 250);
    return () => window.clearTimeout(temporizador);
  }, [consultaBusqueda]);

  useEffect(() => {
    const conDatos = borradores.filter((borrador) => !estaVacio(borrador));
    if (!cargado || conDatos.length === 0 || !puedeRegistrar) {
      setAvisosServidor({});
      return;
    }
    const temporizador = window.setTimeout(() => {
      const lote = { cuentaTesoreriaId: cuenta.id, anio: periodo.anio, mes: periodo.mes, vouchers: conDatos.map((borrador) => aEntrada(borrador, cuenta.moneda)) };
      avisosDeLote(lote)
        .then((avisos) => {
          const porBorrador: Record<string, string[]> = {};
          for (const aviso of avisos) {
            const borrador = conDatos[aviso.indice];
            if (borrador) {
              porBorrador[borrador.id] = [...(porBorrador[borrador.id] ?? []), aviso.mensaje];
            }
          }
          setAvisosServidor(porBorrador);
          setVerificacionFallida(false);
        })
        .catch(() => setVerificacionFallida(true));
    }, 700);
    return () => window.clearTimeout(temporizador);
  }, [borradores, cargado, cuenta.id, cuenta.moneda, periodo.anio, periodo.mes, puedeRegistrar]);

  const actualizar = useCallback((id: string, cambio: (borrador: BorradorEdicion) => BorradorEdicion) => {
    setBorradores((actuales) => actuales.map((borrador) => (borrador.id === id ? cambio(borrador) : borrador)));
    setErroresServidor((previos) => {
      if (!(id in previos)) {
        return previos;
      }
      return Object.fromEntries(Object.entries(previos).filter(([clave]) => clave !== id));
    });
  }, []);

  const cambiarCabecera = (id: string, campo: CampoCabecera, valor: string) => {
    actualizar(id, (borrador) => {
      const siguiente = { ...borrador, [campo]: campo === "analitico" ? valor.toUpperCase() : valor };
      if (campo === "documento") {
        const conocido = entidades[normalizarDocumento(valor)];
        siguiente.razonSocial = conocido ? conocido.razonSocial : entidades[normalizarDocumento(borrador.documento)] ? "" : borrador.razonSocial;
      }
      return siguiente;
    });
  };

  const cambiarLinea = (id: string, indice: number, campo: CampoDeLinea, valor: string) => {
    actualizar(id, (borrador) => {
      const entidad = entidades[normalizarDocumento(borrador.documento)];
      let medioPagoCodigo = borrador.medioPagoCodigo;
      const lineas = borrador.lineas.map((linea, posicion) => {
        if (posicion !== indice) {
          return linea;
        }
        const siguiente = { ...linea, [campo]: valor };
        if (campo === "detalle" && entidad) {
          const coincidencia = entidad.detalles.find((detalle) => normalizarTexto(detalle.detalle) === normalizarTexto(valor));
          if (coincidencia) {
            siguiente.cuentaContableCodigo = coincidencia.cuentaContableCodigo;
            medioPagoCodigo = medioPagoCodigo || coincidencia.medioPagoCodigo;
          }
        }
        return siguiente;
      });
      return { ...borrador, lineas, medioPagoCodigo };
    });
  };

  const normalizarImporte = (id: string, indice: number, campo: "ingreso" | "egreso") => {
    actualizar(id, (borrador) => ({
      ...borrador,
      lineas: borrador.lineas.map((linea, posicion) => {
        if (posicion !== indice) {
          return linea;
        }
        const texto = normalizarMonto(linea[campo]);
        return /^\d{1,12}(\.\d{1,2})?$/.test(texto) ? { ...linea, [campo]: centavosATexto(montoACentavos(texto)) } : linea;
      }),
    }));
  };

  const agregarBorrador = (despuesDe: string | null, base?: Partial<BorradorEdicion>, campoFoco: CampoHoja = "documento") => {
    const conDatos = borradores.filter((borrador) => !estaVacio(borrador));
    const previo = despuesDe ? borradores.find((borrador) => borrador.id === despuesDe) : conDatos[conDatos.length - 1];
    const nuevo = {
      ...borradorVacio(fechaInicial(hoy, periodo.anio, periodo.mes, previo?.fechaOperacion), previo?.tipoCambio ?? tipoCambioInicial),
      ...base,
    };
    setBorradores((actuales) => {
      const utiles = despuesDe ? actuales : actuales.filter((borrador) => !estaVacio(borrador) || borrador.voucherId);
      const posicion = despuesDe ? utiles.findIndex((borrador) => borrador.id === despuesDe) : utiles.length - 1;
      return [...utiles.slice(0, posicion + 1), nuevo, ...utiles.slice(posicion + 1)];
    });
    setFocoPendiente({ borradorId: nuevo.id, campo: campoFoco, linea: 0 });
  };

  const usarPlantilla = (plantilla: PlantillaHoja) => {
    const conPrefijo = plantilla.analitico !== SIN_COMPROBANTE && plantilla.analitico.endsWith("-");
    agregarBorrador(
      null,
      {
        documento: plantilla.documento,
        razonSocial: plantilla.razonSocial,
        analitico: plantilla.analitico,
        medioPagoCodigo: plantilla.medioPagoCodigo,
        lineas: [
          {
            ...lineaVacia(),
            detalle: plantilla.detalle,
            cuentaContableCodigo: plantilla.cuentaContableCodigo,
            ingreso: plantilla.tipo === "INGRESO" ? plantilla.importe ?? "" : "",
            egreso: plantilla.tipo === "EGRESO" ? plantilla.importe ?? "" : "",
          },
        ],
      },
      conPrefijo ? "analitico" : plantilla.importe ? "fechaOperacion" : plantilla.tipo === "INGRESO" ? "ingreso" : "egreso",
    );
  };

  const duplicarAnterior = () => {
    const ultimo = borradores[borradores.length - 1];
    if (ultimo) {
      agregarBorrador(ultimo.id, {
        documento: ultimo.documento,
        razonSocial: ultimo.razonSocial,
        medioPagoCodigo: ultimo.medioPagoCodigo,
        lineas: ultimo.lineas.map((linea) => ({ ...lineaVacia(), detalle: linea.detalle, ingreso: linea.ingreso, egreso: linea.egreso, cuentaContableCodigo: linea.cuentaContableCodigo })),
      });
    } else if (ultimoRegistrado) {
      agregarBorrador(null, {
        documento: ultimoRegistrado.entidad.numeroDocumento,
        razonSocial: ultimoRegistrado.entidad.razonSocial,
        medioPagoCodigo: ultimoRegistrado.medioPagoCodigo,
      });
    } else {
      agregarBorrador(null);
    }
  };

  const agregarLinea = (id: string) => {
    const borrador = borradores.find((actual) => actual.id === id);
    if (!borrador) {
      return;
    }
    const nueva = lineaVacia();
    actualizar(id, (actual) => ({ ...actual, lineas: [...actual.lineas, nueva] }));
    setFocoPendiente({ borradorId: id, campo: "detalle", linea: borrador.lineas.length });
  };

  const quitarLinea = (id: string, indice: number) => {
    actualizar(id, (borrador) => ({ ...borrador, lineas: borrador.lineas.filter((_linea, posicion) => posicion !== indice) }));
  };

  const quitarBorrador = (id: string) => {
    setBorradores((actuales) => actuales.filter((borrador) => borrador.id !== id));
    if (foco?.borradorId === id) {
      setFoco(null);
    }
  };

  const valorDe = (borrador: BorradorEdicion, campo: CampoHoja, linea: number): string => {
    if (esCampoDeLinea(campo)) {
      return borrador.lineas[linea]?.[campo] ?? borrador.lineas[borrador.lineas.length - 1]?.[campo] ?? "";
    }
    return borrador[campo];
  };

  const copiarDeArriba = (id: string, campo: CampoHoja, linea: number) => {
    const posicion = borradores.findIndex((borrador) => borrador.id === id);
    const actual = borradores[posicion];
    if (!actual) {
      return;
    }
    let valor: string | undefined;
    if (esCampoDeLinea(campo) && linea > 0) {
      valor = actual.lineas[linea - 1]?.[campo];
    } else if (posicion > 0) {
      const anterior = borradores[posicion - 1];
      valor = anterior ? valorDe(anterior, campo, linea) : undefined;
    } else if (ultimoRegistrado) {
      const ultimaLinea = ultimoRegistrado.lineas[ultimoRegistrado.lineas.length - 1];
      const desdeRegistrado: Record<CampoHoja, string | undefined> = {
        nroOperacion: ultimoRegistrado.nroOperacion ?? "",
        fechaOperacion: ultimoRegistrado.fechaOperacion,
        analitico: ultimoRegistrado.analitico,
        documento: ultimoRegistrado.entidad.numeroDocumento,
        razonSocial: ultimoRegistrado.entidad.razonSocial,
        medioPagoCodigo: ultimoRegistrado.medioPagoCodigo,
        tipoCambio: ultimoRegistrado.tipoCambio,
        detalle: ultimaLinea?.detalle,
        ingreso: ultimaLinea && Number(ultimaLinea.ingreso) > 0 ? ultimaLinea.ingreso : "",
        egreso: ultimaLinea && Number(ultimaLinea.egreso) > 0 ? ultimaLinea.egreso : "",
        cuentaContableCodigo: ultimaLinea?.cuentaContableCodigo,
      };
      valor = desdeRegistrado[campo];
    }
    if (valor === undefined) {
      return;
    }
    if (esCampoDeLinea(campo)) {
      cambiarLinea(id, linea, campo, valor);
    } else {
      cambiarCabecera(id, campo, valor);
    }
  };

  const registrar = async () => {
    if (registrando) {
      return;
    }
    const listos = borradores.filter((borrador) => estadoDe(borrador.id) === "ok" || estadoDe(borrador.id) === "aviso");
    if (listos.length === 0) {
      toast.error("No hay filas listas. Corrige las filas marcadas en rojo.");
      return;
    }
    const nuevos = listos.filter((borrador) => !borrador.voucherId);
    const editados = listos.filter((borrador) => borrador.voucherId);
    setRegistrando(true);
    try {
      const hechos = new Set<string>();
      const registrados: string[] = [];
      const guardados: string[] = [];
      const fallas: Record<string, string[]> = {};
      let mensajeError: string | null = null;

      if (nuevos.length > 0) {
        const resultado = await registrarLote({
          cuentaTesoreriaId: cuenta.id,
          anio: periodo.anio,
          mes: periodo.mes,
          vouchers: nuevos.map((borrador) => aEntrada(borrador, cuenta.moneda)),
        });
        if (resultado.estado === "ok") {
          nuevos.forEach((borrador) => hechos.add(borrador.id));
          registrados.push(...resultado.codigos);
        } else {
          for (const [clave, mensaje] of Object.entries(resultado.errores)) {
            const indice = /^vouchers\.(\d+)\./.exec(clave)?.[1];
            const borrador = indice === undefined ? undefined : nuevos[Number(indice)];
            if (borrador) {
              fallas[borrador.id] = [...(fallas[borrador.id] ?? []), mensaje];
            }
          }
          mensajeError = resultado.mensaje;
        }
      }

      for (const borrador of editados) {
        if (!borrador.voucherId) {
          continue;
        }
        const resultado = await editarVoucher(borrador.voucherId, aEntrada(borrador, cuenta.moneda));
        if (resultado.estado === "ok") {
          hechos.add(borrador.id);
          guardados.push(...resultado.codigos);
        } else {
          const mensajes = Object.values(resultado.errores);
          fallas[borrador.id] = mensajes.length > 0 ? mensajes : [resultado.mensaje];
          mensajeError ??= resultado.mensaje;
        }
      }

      if (hechos.size > 0) {
        setBorradores((actuales) => {
          const quedan = actuales.filter((borrador) => !hechos.has(borrador.id));
          const ultimo = nuevos[nuevos.length - 1];
          return quedan.length > 0 ? quedan : [borradorVacio(fechaInicial(hoy, periodo.anio, periodo.mes, ultimo?.fechaOperacion), ultimo?.tipoCambio ?? tipoCambioInicial)];
        });
        setEntidades({});
        const partes: string[] = [];
        if (registrados.length === 1) {
          partes.push(`Voucher ${registrados[0] ?? ""} registrado`);
        } else if (registrados.length > 1) {
          partes.push(`${registrados.length} vouchers registrados: ${registrados[0] ?? ""} a ${registrados[registrados.length - 1] ?? ""}`);
        }
        if (guardados.length > 0) {
          partes.push(`${guardados.length === 1 ? "Cambios guardados en" : "Cambios guardados en los vouchers"} ${guardados.join(", ")}`);
        }
        toast.success(`${partes.join(". ")}.`);
        router.refresh();
      }
      setErroresServidor(fallas);
      if (mensajeError) {
        toast.error(mensajeError);
      }
    } catch {
      toast.error("No se pudo registrar. Revisa tu conexión e inténtalo de nuevo; las filas siguen en la hoja.");
    } finally {
      setRegistrando(false);
    }
  };

  const teclearHoja = (evento: globalThis.KeyboardEvent) => {
    if (!puedeRegistrar) {
      return;
    }
    if (evento.ctrlKey && evento.key === "Enter") {
      evento.preventDefault();
      void registrar();
    } else if (evento.altKey && (evento.key === "n" || evento.key === "N")) {
      evento.preventDefault();
      agregarBorrador(null);
    } else if (evento.altKey && (evento.key === "d" || evento.key === "D")) {
      evento.preventDefault();
      duplicarAnterior();
    } else if (evento.altKey && /^[1-9]$/.test(evento.key)) {
      const plantilla = plantillas.find((actual) => actual.atajo === Number(evento.key));
      if (plantilla) {
        evento.preventDefault();
        usarPlantilla(plantilla);
      }
    }
  };

  const teclearHojaActual = useRef(teclearHoja);
  teclearHojaActual.current = teclearHoja;
  useEffect(() => {
    const escuchar = (evento: globalThis.KeyboardEvent) => teclearHojaActual.current(evento);
    window.addEventListener("keydown", escuchar);
    return () => window.removeEventListener("keydown", escuchar);
  }, []);

  const teclearCampo = (borrador: BorradorEdicion, evento: KeyboardEvent<HTMLInputElement>, campo: CampoHoja, linea: number) => {
    if (evento.key === "Enter" && !evento.ctrlKey && campo === "medioPagoCodigo") {
      evento.preventDefault();
      agregarBorrador(borrador.id);
    } else if (evento.key === "F4") {
      evento.preventDefault();
      copiarDeArriba(borrador.id, campo, linea);
    } else if (evento.altKey && (evento.key === "l" || evento.key === "L")) {
      evento.preventDefault();
      agregarLinea(borrador.id);
    }
  };

  const sugerenciasPara = (borrador: BorradorEdicion): { titulo: string; lista: Sugerencia[] } | null => {
    if (!foco || foco.borradorId !== borrador.id) {
      return null;
    }
    const entidad = entidades[normalizarDocumento(borrador.documento)] ?? null;
    const linea = borrador.lineas[foco.linea];

    if ((foco.campo === "documento" || foco.campo === "razonSocial") && !entidad) {
      const lista = busqueda.resultados.map((resultado) => ({
        clave: resultado.id,
        principal: resultado.numeroDocumento,
        secundario: resultado.razonSocial,
        nota: `${resultado.usos} ${resultado.usos === 1 ? "uso" : "usos"}`,
        aplicar: () => actualizar(borrador.id, (actual) => ({ ...actual, documento: resultado.numeroDocumento, razonSocial: resultado.razonSocial })),
      }));
      return { titulo: "Proveedores que ya existen", lista };
    }
    if (foco.campo === "detalle" && entidad && linea) {
      const consulta = normalizarTexto(linea.detalle);
      const lista = ordenarPorCoincidencia(entidad.detalles, (detalle) => detalle.detalle, linea.detalle)
        .filter((detalle) => normalizarTexto(detalle.detalle) !== consulta)
        .slice(0, MAXIMO_SUGERENCIAS)
        .map((detalle) => ({
          clave: detalle.detalle,
          principal: detalle.detalle,
          secundario: "",
          nota: `CTA ${detalle.cuentaContableCodigo} · COD ${detalle.medioPagoCodigo}`,
          aplicar: () =>
            actualizar(borrador.id, (actual) => ({
              ...actual,
              medioPagoCodigo: actual.medioPagoCodigo || detalle.medioPagoCodigo,
              lineas: actual.lineas.map((item, posicion) => (posicion === foco.linea ? { ...item, detalle: detalle.detalle, cuentaContableCodigo: detalle.cuentaContableCodigo } : item)),
            })),
        }));
      return { titulo: "Detalles usados con este proveedor", lista };
    }
    if (foco.campo === "cuentaContableCodigo" && linea && !contexto.cuentasContables.has(linea.cuentaContableCodigo.trim())) {
      const consulta = linea.cuentaContableCodigo.trim();
      const lista = (/^\d+$/.test(consulta) ? opcionesCuentas.filter((opcion) => opcion.codigo.startsWith(consulta)) : ordenarPorCoincidencia(opcionesCuentas, (opcion) => opcion.denominacion, consulta))
        .slice(0, MAXIMO_SUGERENCIAS)
        .map((opcion) => ({
          clave: opcion.codigo,
          principal: opcion.codigo,
          secundario: opcion.denominacion,
          nota: "",
          aplicar: () => cambiarLinea(borrador.id, foco.linea, "cuentaContableCodigo", opcion.codigo),
        }));
      return { titulo: "Plan contable", lista };
    }
    if (foco.campo === "medioPagoCodigo" && !contexto.mediosPago.has(borrador.medioPagoCodigo.trim())) {
      const consulta = borrador.medioPagoCodigo.trim();
      const lista = (/^\d+$/.test(consulta) ? medios.filter((medio) => medio.codigo.startsWith(consulta)) : ordenarPorCoincidencia(medios, (medio) => medio.descripcion, consulta))
        .slice(0, 12)
        .map((medio) => ({ clave: medio.codigo, principal: medio.codigo, secundario: medio.descripcion, nota: "", aplicar: () => cambiarCabecera(borrador.id, "medioPagoCodigo", medio.codigo) }));
      return { titulo: "Medio de pago (SUNAT)", lista };
    }
    if (foco.campo === "analitico" && borrador.analitico.trim().length <= 3 && borrador.analitico.trim() !== SIN_COMPROBANTE) {
      const lista = [
        { clave: SIN_COMPROBANTE, principal: SIN_COMPROBANTE, secundario: "Sin comprobante", nota: "", aplicar: () => cambiarCabecera(borrador.id, "analitico", SIN_COMPROBANTE) },
        ...tipos.map((tipo) => ({ clave: tipo.codigo, principal: `${tipo.codigo}-`, secundario: tipo.descripcion, nota: "", aplicar: () => cambiarCabecera(borrador.id, "analitico", `${tipo.codigo}-`) })),
      ];
      return { titulo: "Formato del analítico", lista };
    }
    return null;
  };

  const lineasRegistradas = hoja.vouchers.filter((voucher) => !enEdicion.has(voucher.id)).reduce((total, voucher) => total + voucher.lineas.length, 0);
  const totalesRegistrados = hoja.vouchers
    .filter((voucher) => voucher.estado === "REGISTRADO")
    .flatMap((voucher) => voucher.lineas)
    .reduce((acumulado, linea) => ({ ingreso: acumulado.ingreso + montoACentavos(linea.ingreso), egreso: acumulado.egreso + montoACentavos(linea.egreso) }), { ingreso: 0, egreso: 0 });
  const totalesBorrador = borradores
    .flatMap((borrador) => borrador.lineas)
    .reduce((acumulado, linea) => ({ ingreso: acumulado.ingreso + montoACentavos(linea.ingreso), egreso: acumulado.egreso + montoACentavos(linea.egreso) }), { ingreso: 0, egreso: 0 });

  const prefijoPeriodo = `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}`;
  let siguienteNumero = periodo.proximoNumero;
  let filaActual = lineasRegistradas + 1;
  const filas = borradores.map((borrador) => {
    const delPeriodo = !borrador.voucherId && borrador.fechaOperacion.startsWith(prefijoPeriodo);
    const codigo = delPeriodo ? formatoVoucher(periodo.mes, siguienteNumero) : "auto";
    if (delPeriodo) {
      siguienteNumero += 1;
    }
    const filaInicial = filaActual;
    filaActual += borrador.lineas.length;
    return { borrador, codigo, filaInicial };
  });

  const conteo = { vacio: 0, ok: 0, aviso: 0, error: 0 };
  const observaciones: ObservacionHoja[] = [];
  for (const { borrador, filaInicial } of filas) {
    conteo[estadoDe(borrador.id)] += 1;
    (problemas[borrador.id] ?? []).forEach((problema, indice) => {
      observaciones.push({ clave: `${borrador.id}-${indice}`, fila: filaInicial + (problema.linea ?? 0), nivel: problema.nivel, mensaje: problema.mensaje });
    });
  }
  const listos = conteo.ok + conteo.aviso;
  const ediciones = borradores.filter((borrador) => borrador.voucherId && (estadoDe(borrador.id) === "ok" || estadoDe(borrador.id) === "aviso")).length;
  const nuevosListos = listos - ediciones;
  const textoBotonRegistro =
    ediciones === 0
      ? `Registrar ${listos} ${listos === 1 ? "fila lista" : "filas listas"}`
      : nuevosListos === 0
        ? `Guardar ${ediciones === 1 ? "cambios" : `${ediciones} vouchers editados`}`
        : `Registrar ${nuevosListos} y guardar ${ediciones}`;
  const simbolo = enSoles ? "S/" : "US$";
  const documentoEnfocado = borradorEnfocado ? normalizarDocumento(borradorEnfocado.documento) : "";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Registro de bancos</p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">Registro rápido</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Escribe como en tu Excel. El sistema completa, valida y avisa de duplicados en la misma fila.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <PeriodPicker cuentaId={cuenta.id} anio={periodo.anio} mes={periodo.mes} actual={{ anio: Number(hoy.slice(0, 4)), mes: Number(hoy.slice(5, 7)) }} />
          <div className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Próximo voucher
            <span className="flex h-10 items-center rounded-md border border-dashed border-input px-3 text-sm font-semibold normal-case tracking-normal text-sistema tabular-nums">
              {formatoVoucher(periodo.mes, periodo.proximoNumero)}
            </span>
          </div>
          {puedeRegistrar ? (
            <Button onClick={() => void registrar()} disabled={registrando || listos === 0 || periodo.estado === "CERRADO"} className="h-10">
              {registrando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {textoBotonRegistro}
              <kbd className="ml-1 rounded bg-primary-foreground/15 px-1.5 py-0.5 text-[10px]">Ctrl+Enter</kbd>
            </Button>
          ) : null}
        </div>
      </header>

      <nav aria-label="Cuentas" className="flex flex-wrap gap-2" role="tablist">
        {cuentas.map((pestana) => {
          const activa = pestana.id === cuenta.id;
          return (
            <Link
              key={pestana.id}
              role="tab"
              aria-selected={activa}
              href={`/quick-entry?cuenta=${pestana.id}&anio=${periodo.anio}&mes=${periodo.mes}`}
              className={cn(
                "flex min-h-[52px] flex-col justify-center rounded-lg border px-3.5 text-left transition-colors",
                activa ? "border-primary bg-accent text-white shadow-[inset_0_-2px_0_hsl(var(--primary))]" : "border-border bg-card text-muted-foreground hover:border-input",
              )}
            >
              <b className="text-xs font-semibold">{pestana.nombre}</b>
              <span className="text-[10px] text-muted-foreground">{pestana.detalle}</span>
            </Link>
          );
        })}
      </nav>

      {periodo.estado === "CERRADO" ? (
        <p className="rounded-lg border border-[#ffda79]/40 bg-[#272414] px-4 py-3 text-sm text-[#ffda79]">
          {MESES[periodo.mes - 1]} {periodo.anio} está cerrado: puedes verlo, pero no registrar movimientos en ese mes.
        </p>
      ) : null}

      {puedeRegistrar ? (
        <section aria-label="Atajos" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Atajos</span>
          {plantillas.map((plantilla) => (
            <Button key={plantilla.atajo} variant="outline" size="sm" onClick={() => usarPlantilla(plantilla)} title={`${plantilla.razonSocial} · ${plantilla.detalle}`}>
              <kbd className="rounded border border-input bg-background px-1 text-[10px] text-primary">Alt+{plantilla.atajo}</kbd>
              {plantilla.etiqueta}
            </Button>
          ))}
          <span className="flex-1" />
          <Button variant="outline" size="sm" onClick={duplicarAnterior}>
            <Copy className="size-3.5" aria-hidden="true" />
            Duplicar fila anterior
            <kbd className="text-[10px] text-primary">Alt+D</kbd>
          </Button>
          <Button variant="outline" size="sm" onClick={() => agregarBorrador(null)} className="border-primary/60 text-primary">
            <Plus className="size-3.5" aria-hidden="true" />
            Fila nueva
            <kbd className="text-[10px]">Alt+N</kbd>
          </Button>
          {!almacenDisponible ? <span className="text-xs text-[#ffda79]">Este navegador no permite guardar las filas en edición; no recargues la página antes de registrar.</span> : null}
          {verificacionFallida ? <span className="text-xs text-[#ffda79]">No se pudo verificar duplicados con el servidor.</span> : null}
        </section>
      ) : null}

      <section aria-label="Hoja de captura" className="overflow-hidden rounded-xl border border-border bg-[#0a1c30]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[#0e2944] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              {cuenta.nombre} · {MESES[periodo.mes - 1]} {periodo.anio}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Las columnas son las mismas de tu Excel. Celeste = lo llena el sistema.</p>
          </div>
          {puedeRegistrar ? (
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>
                <b className="text-exito">{conteo.ok}</b> listas
              </span>
              <span>
                <b className="text-[#ffda79]">{conteo.aviso}</b> por revisar
              </span>
              <span>
                <b className="text-destructive">{conteo.error}</b> con error
              </span>
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <div className={cn(GRILLA, "border-b border-input bg-[#123150]")}>
            {[
              ["#", ""],
              ["Nº/Cheque/Op.", ""],
              ["N# Voucher", "auto"],
              ["Fecha operación", ""],
              ["Analítico", "tipo-serie-nº"],
              ["RUC / DNI", ""],
              ["Razón social", "auto desde RUC"],
              ["Detalle", "sugerido por proveedor"],
              ["T.C", enSoles ? "auto" : "digitado"],
              ["Ingreso", simbolo],
              ["Egreso", simbolo],
              ["CTA", "plan"],
              ["COD", "medio"],
              ["", ""],
            ].map(([titulo, nota], indice) => (
              <div key={indice} className="flex h-12 min-w-0 flex-col justify-center gap-0.5 border-r border-border/70 px-2">
                <span className="truncate text-[10px] font-bold uppercase tracking-wide text-primary">{titulo}</span>
                {nota ? <span className="truncate text-[9px] font-semibold text-sistema">{nota}</span> : null}
              </div>
            ))}
          </div>

          <RegisteredRows vouchers={hoja.vouchers} enEdicion={enEdicion} editables={editables} alEditar={iniciarEdicion} />

          {filas.map(({ borrador, codigo, filaInicial }) => (
            <DraftRows
              key={borrador.id}
              borrador={borrador}
              filaInicial={filaInicial}
              codigoProvisional={codigo}
              enSoles={enSoles}
              problemas={problemas[borrador.id] ?? []}
              estado={estadoDe(borrador.id)}
              entidadConocida={Boolean(entidades[normalizarDocumento(borrador.documento)])}
              foco={foco}
              sugerencias={sugerenciasPara(borrador)}
              calendario={calendario}
              alCambiarCabecera={(campo, valor) => cambiarCabecera(borrador.id, campo, valor)}
              alCambiarLinea={(linea, campo, valor) => cambiarLinea(borrador.id, linea, campo, valor)}
              alNormalizarMonto={(linea, campo) => normalizarImporte(borrador.id, linea, campo)}
              alEnfocar={(campo, linea) => setFoco({ borradorId: borrador.id, campo, linea })}
              alTeclear={(evento, campo, linea) => teclearCampo(borrador, evento, campo, linea)}
              alAgregarLinea={() => agregarLinea(borrador.id)}
              alQuitarLinea={(linea) => quitarLinea(borrador.id, linea)}
              alQuitar={() => quitarBorrador(borrador.id)}
            />
          ))}

          {hoja.vouchers.length === 0 && borradores.length === 0 ? (
            <p className="min-w-[1420px] px-4 py-6 text-sm text-muted-foreground">No hay movimientos registrados en este mes.</p>
          ) : null}

          <div className={cn(GRILLA, "border-t border-input bg-[#0e2944]")}>
            <div className={CELDA} />
            <div className={cn(CELDA, "col-span-8 font-semibold text-muted-foreground")}>
              Registrado en {cuenta.nombre} · {MESES[periodo.mes - 1]} {periodo.anio} · {hoja.vouchers.length} vouchers
            </div>
            <div className={cn(CELDA, "justify-end font-bold tabular-nums text-exito")}>{dinero(totalesRegistrados.ingreso)}</div>
            <div className={cn(CELDA, "justify-end font-bold tabular-nums text-destructive")}>{dinero(totalesRegistrados.egreso)}</div>
            <div className={cn(CELDA, "col-span-3 text-muted-foreground")}>
              Neto <b className="ml-1.5 tabular-nums text-white">{simbolo} {dinero(totalesRegistrados.ingreso - totalesRegistrados.egreso)}</b>
            </div>
          </div>
          {borradores.length > 0 ? (
            <div className={cn(GRILLA, "bg-[#0a1c30]")}>
              <div className={CELDA} />
              <div className={cn(CELDA, "col-span-8 text-muted-foreground")}>En edición, aún sin registrar</div>
              <div className={cn(CELDA, "justify-end tabular-nums text-exito/80")}>{dinero(totalesBorrador.ingreso)}</div>
              <div className={cn(CELDA, "justify-end tabular-nums text-destructive/80")}>{dinero(totalesBorrador.egreso)}</div>
              <div className={cn(CELDA, "col-span-3")} />
            </div>
          ) : null}
        </div>
        {puedeRegistrar ? (
          <button
            type="button"
            onClick={() => agregarBorrador(null)}
            className="flex min-h-11 w-full items-center gap-2.5 border-t border-dashed border-input px-4 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-white"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Agregar fila
            <span className="text-[11px]">
              <kbd className="rounded border border-input bg-background px-1.5 py-0.5 text-[10px] font-semibold text-primary">Enter</kbd> en la columna COD crea la siguiente
            </span>
          </button>
        ) : null}
      </section>

      {puedeRegistrar ? <SidePanels observaciones={observaciones} entidad={borradorEnfocado ? entidades[documentoEnfocado] ?? null : null} documentoEnfocado={documentoEnfocado} /> : null}
    </div>
  );
}
