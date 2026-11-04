import { Injectable } from "@nestjs/common";
import { normalizarDocumento, rucConDigitoValido, tipoDeDocumento, type ConsultaDocumento } from "@conciliacion/contracts";
import { errores } from "../../../shared/http/api-error";
import { PeruDevsClient } from "../infrastructure/perudevs.client";

const VIGENCIA_ENCONTRADO_MS = 1000 * 60 * 60 * 12;
const VIGENCIA_NO_ENCONTRADO_MS = 1000 * 60 * 30;
const MAXIMO_EN_MEMORIA = 2000;

type Guardado = { expira: number; consulta: ConsultaDocumento | null };

@Injectable()
export class DocumentLookupService {
  private readonly memoria = new Map<string, Guardado>();

  constructor(private readonly perudevs: PeruDevsClient) {}

  async consultar(documento: string): Promise<ConsultaDocumento> {
    const numero = normalizarDocumento(documento);
    const tipo = tipoDeDocumento(numero);
    if (tipo === "EXTRANJERO") {
      throw errores.validacion("Solo se consultan RUC de 11 dígitos o DNI de 8.", { documento: "Escribe un RUC de 11 dígitos o un DNI de 8." });
    }
    if (tipo === "RUC" && !rucConDigitoValido(numero)) {
      throw errores.validacion("El RUC no es válido: revisa los dígitos.", { documento: "El dígito verificador del RUC no coincide." });
    }

    const guardado = this.memoria.get(numero);
    if (guardado && guardado.expira > Date.now()) {
      return this.responder(guardado.consulta, tipo);
    }

    const resultado = await this.perudevs.consultar(tipo, numero);
    if (resultado.tipo === "noConfigurado") {
      throw errores.noDisponible("La consulta de RUC y DNI no está configurada. Escribe la razón social a mano.");
    }
    if (resultado.tipo === "fallo") {
      throw errores.noDisponible(`No se pudo consultar ${tipo === "RUC" ? "SUNAT" : "RENIEC"} en este momento. Escribe la razón social a mano.`);
    }
    const consulta = resultado.tipo === "encontrado" ? resultado.consulta : null;
    this.recordar(numero, consulta);
    return this.responder(consulta, tipo);
  }

  private responder(consulta: ConsultaDocumento | null, tipo: "RUC" | "DNI"): ConsultaDocumento {
    if (!consulta) {
      throw errores.noEncontrado(tipo === "RUC" ? "SUNAT no tiene registrado ese RUC." : "RENIEC no tiene registrado ese DNI.");
    }
    return consulta;
  }

  private recordar(numero: string, consulta: ConsultaDocumento | null): void {
    if (this.memoria.size >= MAXIMO_EN_MEMORIA) {
      const masAntiguo = this.memoria.keys().next();
      if (!masAntiguo.done) {
        this.memoria.delete(masAntiguo.value);
      }
    }
    this.memoria.set(numero, { expira: Date.now() + (consulta ? VIGENCIA_ENCONTRADO_MS : VIGENCIA_NO_ENCONTRADO_MS), consulta });
  }
}
