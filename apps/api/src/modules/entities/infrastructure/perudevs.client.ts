import { Injectable, Logger } from "@nestjs/common";
import type { ConsultaDocumento } from "@conciliacion/contracts";
import { z } from "zod";
import { AppConfigService } from "../../../shared/config/app-config.service";

const ESPERA_MAXIMA_MS = 8000;

const respuestaRucSchema = z.object({
  estado: z.boolean(),
  resultado: z
    .object({
      razon_social: z.string().nullish(),
      estado: z.string().nullish(),
      condicion: z.string().nullish(),
      direccion: z.string().nullish(),
    })
    .nullish(),
});

const respuestaDniSchema = z.object({
  estado: z.boolean(),
  resultado: z
    .object({
      nombre_completo: z.string().nullish(),
      nombres: z.string().nullish(),
      apellido_paterno: z.string().nullish(),
      apellido_materno: z.string().nullish(),
    })
    .nullish(),
});

export type ResultadoPeruDevs = { tipo: "encontrado"; consulta: ConsultaDocumento } | { tipo: "noEncontrado" } | { tipo: "noConfigurado" } | { tipo: "fallo" };

function limpio(texto: string | null | undefined): string | null {
  const valor = texto?.trim().replace(/\s+/g, " ");
  return valor ? valor : null;
}

@Injectable()
export class PeruDevsClient {
  private readonly logger = new Logger(PeruDevsClient.name);

  constructor(private readonly config: AppConfigService) {}

  get configurado(): boolean {
    return Boolean(this.config.perudevsUrl && this.config.perudevsToken);
  }

  async consultar(tipo: "RUC" | "DNI", numero: string): Promise<ResultadoPeruDevs> {
    const base = this.config.perudevsUrl;
    const token = this.config.perudevsToken;
    if (!base || !token) {
      return { tipo: "noConfigurado" };
    }
    const url = new URL(tipo === "RUC" ? "/api/v1/ruc" : "/api/v1/dni/complete", base);
    url.searchParams.set("document", numero);
    url.searchParams.set("key", token);
    try {
      const respuesta = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) });
      if (respuesta.status === 404) {
        return { tipo: "noEncontrado" };
      }
      if (!respuesta.ok) {
        this.logger.warn(`PeruDevs respondió ${respuesta.status} al consultar un ${tipo}`);
        return { tipo: "fallo" };
      }
      const cuerpo: unknown = await respuesta.json();
      return tipo === "RUC" ? this.leerRuc(numero, cuerpo) : this.leerDni(numero, cuerpo);
    } catch (error: unknown) {
      this.logger.warn(`No se pudo consultar PeruDevs (${tipo}): ${error instanceof Error ? error.name : "error desconocido"}`);
      return { tipo: "fallo" };
    }
  }

  private leerRuc(numero: string, cuerpo: unknown): ResultadoPeruDevs {
    const leido = respuestaRucSchema.safeParse(cuerpo);
    if (!leido.success) {
      this.logger.warn("PeruDevs devolvió una respuesta de RUC con un formato inesperado");
      return { tipo: "fallo" };
    }
    const razonSocial = limpio(leido.data.resultado?.razon_social);
    if (!leido.data.estado || !razonSocial) {
      return { tipo: "noEncontrado" };
    }
    return {
      tipo: "encontrado",
      consulta: {
        tipoDocumento: "RUC",
        numeroDocumento: numero,
        razonSocial,
        estado: limpio(leido.data.resultado?.estado),
        condicion: limpio(leido.data.resultado?.condicion),
        direccion: limpio(leido.data.resultado?.direccion),
        fuente: "SUNAT",
      },
    };
  }

  private leerDni(numero: string, cuerpo: unknown): ResultadoPeruDevs {
    const leido = respuestaDniSchema.safeParse(cuerpo);
    if (!leido.success) {
      this.logger.warn("PeruDevs devolvió una respuesta de DNI con un formato inesperado");
      return { tipo: "fallo" };
    }
    const resultado = leido.data.resultado;
    const armado = [resultado?.nombres, resultado?.apellido_paterno, resultado?.apellido_materno].map(limpio).filter((parte): parte is string => parte !== null).join(" ");
    const nombre = limpio(resultado?.nombre_completo) ?? limpio(armado);
    if (!leido.data.estado || !nombre) {
      return { tipo: "noEncontrado" };
    }
    return {
      tipo: "encontrado",
      consulta: { tipoDocumento: "DNI", numeroDocumento: numero, razonSocial: nombre, estado: null, condicion: null, direccion: null, fuente: "RENIEC" },
    };
  }
}
