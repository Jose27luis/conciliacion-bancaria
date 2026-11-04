"use server";

import {
  anularVoucherSchema,
  avisosLoteSchema,
  consultaDocumentoSchema,
  entidadConHistorialSchema,
  entidadSchema,
  loteRegistradoSchema,
  loteVouchersSchema,
  uuidSchema,
  voucherEntradaSchema,
  voucherSchema,
  type AvisoLote,
  type ConsultaDocumento,
  type Entidad,
  type EntidadConHistorial,
  type LoteVouchersEntrada,
  type VoucherEntrada,
} from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { api, ErrorDeApi } from "@/shared/api/server-client";
import { falloDeZod, texto, type EstadoFormulario } from "@/shared/lib/form-state";
import { ejecutarAccion } from "@/shared/lib/run-action";

export type ResultadoConsultaDocumento = { estado: "encontrado"; consulta: ConsultaDocumento } | { estado: "sinDatos"; mensaje: string };

export type ResultadoRegistro =
  | { estado: "ok"; codigos: string[] }
  | { estado: "error"; mensaje: string; errores: Record<string, string> };

export async function buscarEntidades(consulta: string): Promise<Entidad[]> {
  const limpia = consulta.trim();
  if (limpia.length < 2) {
    return [];
  }
  return api("/entities/search", entidadSchema.array(), { consulta: { q: limpia.slice(0, 120) } });
}

export async function entidadPorDocumento(documento: string): Promise<EntidadConHistorial | null> {
  const limpio = documento.trim();
  if (!limpio) {
    return null;
  }
  try {
    return await api(`/entities/document/${encodeURIComponent(limpio)}`, entidadConHistorialSchema);
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi && error.estado === 404) {
      return null;
    }
    throw error;
  }
}

export async function consultarDocumento(documento: string): Promise<ResultadoConsultaDocumento> {
  const limpio = documento.replace(/[\s.-]/g, "");
  if (!/^\d{8}$|^\d{11}$/.test(limpio)) {
    return { estado: "sinDatos", mensaje: "Solo se consultan RUC de 11 dígitos o DNI de 8." };
  }
  try {
    return { estado: "encontrado", consulta: await api(`/entities/lookup/${limpio}`, consultaDocumentoSchema) };
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi && (error.estado < 500 || error.estado === 503)) {
      return { estado: "sinDatos", mensaje: error.cuerpo.mensaje };
    }
    return { estado: "sinDatos", mensaje: "No se pudo consultar el documento. Escribe la razón social a mano." };
  }
}

export async function avisosDeLote(lote: LoteVouchersEntrada): Promise<AvisoLote[]> {
  const entrada = loteVouchersSchema.safeParse(lote);
  if (!entrada.success) {
    return [];
  }
  const respuesta = await api("/ledger/vouchers/warnings", avisosLoteSchema, { metodo: "POST", json: entrada.data });
  return respuesta.avisos;
}

export async function editarVoucher(id: string, entrada: VoucherEntrada): Promise<ResultadoRegistro> {
  const datos = voucherEntradaSchema.safeParse(entrada);
  if (!datos.success || !uuidSchema.safeParse(id).success) {
    return { estado: "error", mensaje: "Los datos del voucher no son válidos. Recarga la página e inténtalo de nuevo.", errores: {} };
  }
  try {
    const voucher = await api(`/ledger/vouchers/${id}`, voucherSchema, { metodo: "PUT", json: datos.data });
    revalidatePath("/quick-entry");
    revalidatePath("/ledger");
    return { estado: "ok", codigos: [voucher.codigo] };
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      return { estado: "error", mensaje: error.cuerpo.mensaje, errores: error.cuerpo.errores ?? {} };
    }
    throw error;
  }
}

export async function anularVoucher(id: string, _estado: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const entrada = anularVoucherSchema.safeParse({ motivo: texto(datos, "motivo") });
  if (!entrada.success) {
    return falloDeZod(entrada.error);
  }
  return ejecutarAccion(async () => {
    await api(`/ledger/vouchers/${id}/void`, voucherSchema, { metodo: "POST", json: entrada.data });
    revalidatePath("/ledger");
    revalidatePath("/quick-entry");
  }, "Voucher anulado.");
}

export async function registrarLote(lote: LoteVouchersEntrada): Promise<ResultadoRegistro> {
  const entrada = loteVouchersSchema.safeParse(lote);
  if (!entrada.success) {
    return { estado: "error", mensaje: "Los datos de la hoja no son válidos. Recarga la página e inténtalo de nuevo.", errores: {} };
  }
  try {
    const resultado = await api("/ledger/vouchers", loteRegistradoSchema, { metodo: "POST", json: entrada.data });
    revalidatePath("/quick-entry");
    revalidatePath("/ledger");
    return { estado: "ok", codigos: resultado.vouchers.map((voucher) => voucher.codigo) };
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      return { estado: "error", mensaje: error.cuerpo.mensaje, errores: error.cuerpo.errores ?? {} };
    }
    throw error;
  }
}
