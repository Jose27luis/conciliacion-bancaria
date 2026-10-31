import "server-only";
import { ErrorDeApi } from "../api/server-client";
import { exito, fallo, type EstadoFormulario } from "./form-state";

export async function ejecutarAccion(trabajo: () => Promise<void>, mensajeExito: string): Promise<EstadoFormulario> {
  try {
    await trabajo();
    return exito(mensajeExito);
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      return fallo(error.cuerpo);
    }
    throw error;
  }
}
