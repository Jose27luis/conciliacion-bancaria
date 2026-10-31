"use server";

import {
  avisosLoteSchema,
  entidadConHistorialSchema,
  entidadSchema,
  loteRegistradoSchema,
  loteVouchersSchema,
  type AvisoLote,
  type Entidad,
  type EntidadConHistorial,
  type LoteVouchersEntrada,
} from "@conciliacion/contracts";
import { revalidatePath } from "next/cache";
import { api, ErrorDeApi } from "@/shared/api/server-client";

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

export async function avisosDeLote(lote: LoteVouchersEntrada): Promise<AvisoLote[]> {
  const entrada = loteVouchersSchema.safeParse(lote);
  if (!entrada.success) {
    return [];
  }
  const respuesta = await api("/ledger/vouchers/warnings", avisosLoteSchema, { metodo: "POST", json: entrada.data });
  return respuesta.avisos;
}

export async function registrarLote(lote: LoteVouchersEntrada): Promise<ResultadoRegistro> {
  const entrada = loteVouchersSchema.safeParse(lote);
  if (!entrada.success) {
    return { estado: "error", mensaje: "Los datos de la hoja no son válidos. Recarga la página e inténtalo de nuevo.", errores: {} };
  }
  try {
    const resultado = await api("/ledger/vouchers", loteRegistradoSchema, { metodo: "POST", json: entrada.data });
    revalidatePath("/quick-entry");
    return { estado: "ok", codigos: resultado.vouchers.map((voucher) => voucher.codigo) };
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      return { estado: "error", mensaje: error.cuerpo.mensaje, errores: error.cuerpo.errores ?? {} };
    }
    throw error;
  }
}
