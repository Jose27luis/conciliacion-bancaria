"use server";

import {
  crearTipoComprobanteSchema,
  cuentaContableSchema,
  cuentaTesoreriaSchema,
  guardarCuentaTesoreriaSchema,
  importacionPlanRechazoSchema,
  importacionPlanResultadoSchema,
  medioPagoSchema,
  tipoComprobanteSchema,
} from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { api, ErrorDeApi } from "@/shared/api/server-client";
import { archivo, exito, fallo, falloDeZod, texto, textoOpcional, type EstadoFormulario } from "@/shared/lib/form-state";
import { ejecutarAccion } from "@/shared/lib/run-action";

const RUTAS = {
  plan: "/masters/chart-of-accounts",
  mediosPago: "/masters/payment-methods",
  tiposComprobante: "/masters/voucher-types",
  tesoreria: "/settings/treasury-accounts",
};

export type EstadoImportacion = EstadoFormulario & { filas?: { fila: number; mensaje: string }[] };

export async function importarPlanContable(_estado: EstadoImportacion, datos: FormData): Promise<EstadoImportacion> {
  const adjunto = archivo(datos, "archivo");
  if (!adjunto) {
    return { estado: "error", mensaje: "Adjunta el archivo del plan contable.", errores: { archivo: "Adjunta el archivo .xlsx." } };
  }
  const envio = new FormData();
  envio.set("archivo", adjunto.contenido, adjunto.nombre);
  try {
    const resultado = await api("/chart-of-accounts/import", importacionPlanResultadoSchema, { metodo: "POST", formulario: envio });
    revalidatePath(RUTAS.plan);
    return exito(
      `Plan contable importado: ${resultado.leidas} cuentas leídas, ${resultado.creadas} nuevas, ${resultado.actualizadas} actualizadas y ${resultado.sinCambios} sin cambios.`,
    );
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      const rechazo = importacionPlanRechazoSchema.safeParse(error.crudo);
      return rechazo.success ? { ...fallo(error.cuerpo), filas: rechazo.data.filas } : fallo(error.cuerpo);
    }
    throw error;
  }
}

export async function cambiarActivacionCuentaContable(codigo: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const activo = texto(datos, "activo") === "true";
  return ejecutarAccion(async () => {
    await api(`/chart-of-accounts/${codigo}/activation`, cuentaContableSchema, { metodo: "PATCH", json: { activo } });
    revalidatePath(RUTAS.plan);
  }, activo ? `Cuenta ${codigo} activada.` : `Cuenta ${codigo} desactivada.`);
}

export async function cambiarActivacionMedioPago(codigo: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const activo = texto(datos, "activo") === "true";
  return ejecutarAccion(async () => {
    await api(`/payment-methods/${codigo}/activation`, medioPagoSchema, { metodo: "PATCH", json: { activo } });
    revalidatePath(RUTAS.mediosPago);
  }, activo ? `Medio de pago ${codigo} activado.` : `Medio de pago ${codigo} desactivado.`);
}

export async function crearTipoComprobante(_estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = crearTipoComprobanteSchema.safeParse({ codigo: texto(datos, "codigo"), descripcion: texto(datos, "descripcion") });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api("/voucher-types", tipoComprobanteSchema, { metodo: "POST", json: entrada.data });
    revalidatePath(RUTAS.tiposComprobante);
  }, `Tipo de comprobante ${entrada.data.codigo} creado.`);
}

export async function cambiarActivacionTipoComprobante(codigo: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const activo = texto(datos, "activo") === "true";
  return ejecutarAccion(async () => {
    await api(`/voucher-types/${codigo}/activation`, tipoComprobanteSchema, { metodo: "PATCH", json: { activo } });
    revalidatePath(RUTAS.tiposComprobante);
  }, activo ? `Tipo ${codigo} activado.` : `Tipo ${codigo} desactivado.`);
}

function entradaCuentaTesoreria(datos: FormData) {
  return guardarCuentaTesoreriaSchema.safeParse({
    nombre: texto(datos, "nombre"),
    tipo: texto(datos, "tipo"),
    banco: textoOpcional(datos, "banco"),
    numeroCuenta: textoOpcional(datos, "numeroCuenta"),
    moneda: texto(datos, "moneda"),
    cuentaContableCodigo: texto(datos, "cuentaContableCodigo"),
    orden: Number(texto(datos, "orden") || "0"),
  });
}

export async function guardarCuentaTesoreria(id: string | null, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = entradaCuentaTesoreria(datos);
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(id ? `/treasury-accounts/${id}` : "/treasury-accounts", cuentaTesoreriaSchema, { metodo: id ? "PUT" : "POST", json: entrada.data });
    revalidatePath(RUTAS.tesoreria);
  }, id ? "Cuenta actualizada." : "Cuenta creada.");
}

export async function cambiarActivacionCuentaTesoreria(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const activo = texto(datos, "activo") === "true";
  return ejecutarAccion(async () => {
    await api(`/treasury-accounts/${id}/activation`, cuentaTesoreriaSchema, { metodo: "PATCH", json: { activo } });
    revalidatePath(RUTAS.tesoreria);
  }, activo ? "Cuenta activada." : "Cuenta desactivada.");
}
