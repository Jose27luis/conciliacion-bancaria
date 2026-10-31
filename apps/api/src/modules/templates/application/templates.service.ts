import { Injectable } from "@nestjs/common";
import {
  ATAJO_MAXIMO,
  ATAJO_MINIMO,
  centavosATexto,
  montoACentavos,
  normalizarDocumento,
  type GuardarPlantillaEntrada,
  type Plantilla,
  type UsuarioSesion,
} from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { errores, esErrorDeUnicidad } from "../../../shared/http/api-error";
import type { Transaccion } from "../../../shared/prisma/prisma.service";
import { TemplatesRepository, type DatosPlantilla, type PlantillaRegistro } from "../infrastructure/templates.repository";

const ENTIDAD = "plantilla";

function aPlantilla(registro: PlantillaRegistro): Plantilla {
  return { ...registro, importe: registro.importe ? registro.importe.toFixed(2) : null };
}

function errorCampo(campo: string, mensaje: string): never {
  throw errores.validacion(mensaje, { [campo]: mensaje });
}

@Injectable()
export class TemplatesService {
  constructor(
    private readonly repositorio: TemplatesRepository,
    private readonly auditoria: AuditService,
  ) {}

  async listar(soloActivas: boolean): Promise<Plantilla[]> {
    return (await this.repositorio.listar(soloActivas)).map(aPlantilla);
  }

  crear(entrada: GuardarPlantillaEntrada, actor: UsuarioSesion): Promise<Plantilla> {
    return this.conAtajoUnico(entrada.atajo, () =>
      this.repositorio.transaccion(async (tx) => {
        const datos = await this.datos(tx, entrada, null);
        const creada = await this.repositorio.crear(tx, datos);
        await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: ENTIDAD, entidadId: creada.id, accion: "CREAR", despues: { ...datos } });
        return aPlantilla(creada);
      }),
    );
  }

  editar(id: string, entrada: GuardarPlantillaEntrada, actor: UsuarioSesion): Promise<Plantilla> {
    return this.conAtajoUnico(entrada.atajo, () =>
      this.repositorio.transaccion(async (tx) => {
        const actual = await this.existente(tx, id);
        if (!actual.activa) {
          throw errores.conflicto("La plantilla está desactivada. Actívala antes de editarla.");
        }
        const datos = await this.datos(tx, entrada, id);
        const editada = await this.repositorio.actualizar(tx, id, datos);
        await this.auditoria.registrar(tx, {
          usuarioId: actor.id,
          entidad: ENTIDAD,
          entidadId: id,
          accion: "EDITAR",
          antes: { ...aPlantilla(actual), entidad: actual.entidad.numeroDocumento },
          despues: { ...datos },
        });
        return aPlantilla(editada);
      }),
    );
  }

  cambiarActivacion(id: string, activa: boolean, actor: UsuarioSesion): Promise<Plantilla> {
    return this.repositorio.transaccion(async (tx) => {
      const actual = await this.existente(tx, id);
      let atajo: number | null = null;
      if (activa) {
        const ocupados = new Set((await this.repositorio.atajosOcupados(tx, id)).map((fila) => fila.atajo));
        const libre = Array.from({ length: ATAJO_MAXIMO - ATAJO_MINIMO + 1 }, (_valor, indice) => ATAJO_MINIMO + indice).find((numero) => !ocupados.has(numero));
        if (libre === undefined) {
          throw errores.conflicto(`Ya hay ${ATAJO_MAXIMO} plantillas activas. Desactiva una antes de activar esta.`);
        }
        atajo = actual.atajo !== null && !ocupados.has(actual.atajo) ? actual.atajo : libre;
      }
      const editada = await this.repositorio.actualizar(tx, id, { activa, atajo });
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: ENTIDAD, entidadId: id, accion: activa ? "ACTIVAR" : "DESACTIVAR", despues: { atajo } });
      return aPlantilla(editada);
    });
  }

  private async datos(tx: Transaccion, entrada: GuardarPlantillaEntrada, excepto: string | null): Promise<DatosPlantilla> {
    const ocupados = new Set((await this.repositorio.atajosOcupados(tx, excepto)).map((fila) => fila.atajo));
    if (ocupados.has(entrada.atajo)) {
      errorCampo("atajo", `Alt+${entrada.atajo} ya lo usa otra plantilla.`);
    }
    const entidad = await this.repositorio.entidadPorDocumento(tx, normalizarDocumento(entrada.documento));
    if (!entidad) {
      errorCampo("documento", "Ese documento no está registrado. Regístralo primero en una hoja.");
    }
    if (!(await this.repositorio.cuentaDeMovimientoActiva(tx, entrada.cuentaContableCodigo))) {
      errorCampo("cuentaContableCodigo", `La CTA ${entrada.cuentaContableCodigo} no es una cuenta de movimiento activa.`);
    }
    if (!(await this.repositorio.medioPagoActivo(tx, entrada.medioPagoCodigo))) {
      errorCampo("medioPagoCodigo", `COD ${entrada.medioPagoCodigo} no es un medio de pago activo.`);
    }
    const centavos = entrada.importe ? montoACentavos(entrada.importe) : 0;
    return {
      atajo: entrada.atajo,
      etiqueta: entrada.etiqueta.trim(),
      entidadId: entidad.id,
      detalle: entrada.detalle.trim().replace(/\s+/g, " "),
      cuentaContableCodigo: entrada.cuentaContableCodigo,
      medioPagoCodigo: entrada.medioPagoCodigo,
      analitico: entrada.analitico,
      tipo: entrada.tipo,
      importe: centavos > 0 ? centavosATexto(centavos) : null,
    };
  }

  private async existente(tx: Transaccion, id: string): Promise<PlantillaRegistro> {
    const plantilla = await this.repositorio.buscar(tx, id);
    if (!plantilla) {
      throw errores.noEncontrado("La plantilla no existe.");
    }
    return plantilla;
  }

  private async conAtajoUnico<T>(atajo: number, trabajo: () => Promise<T>): Promise<T> {
    try {
      return await trabajo();
    } catch (error: unknown) {
      if (esErrorDeUnicidad(error)) {
        throw errores.conflicto(`Alt+${atajo} ya lo usa otra plantilla.`, { atajo: `Alt+${atajo} ya lo usa otra plantilla.` });
      }
      throw error;
    }
  }
}
