import { Injectable } from "@nestjs/common";
import type { CrearTipoComprobanteEntrada, MedioPago, TipoComprobante, UsuarioSesion } from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { errores, esErrorDeUnicidad } from "../../../shared/http/api-error";
import { MastersRepository } from "../infrastructure/masters.repository";

@Injectable()
export class CatalogsService {
  constructor(
    private readonly repositorio: MastersRepository,
    private readonly auditoria: AuditService,
  ) {}

  listarMediosPago(): Promise<MedioPago[]> {
    return this.repositorio.listarMediosPago();
  }

  cambiarActivacionMedioPago(codigo: string, activo: boolean, actor: UsuarioSesion): Promise<MedioPago> {
    return this.repositorio.transaccion(async (tx) => {
      const editado = await this.repositorio.cambiarActivacionMedioPago(tx, codigo, activo);
      if (!editado) {
        throw errores.noEncontrado(`El medio de pago ${codigo} no existe.`);
      }
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "medio_pago", entidadId: codigo, accion: activo ? "ACTIVAR" : "DESACTIVAR" });
      return editado;
    });
  }

  listarTiposComprobante(): Promise<TipoComprobante[]> {
    return this.repositorio.listarTiposComprobante();
  }

  async crearTipoComprobante(entrada: CrearTipoComprobanteEntrada, actor: UsuarioSesion): Promise<TipoComprobante> {
    try {
      return await this.repositorio.transaccion(async (tx) => {
        const creado = await this.repositorio.crearTipoComprobante(tx, entrada.codigo, entrada.descripcion);
        await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "tipo_comprobante", entidadId: creado.codigo, accion: "CREAR", despues: entrada });
        return creado;
      });
    } catch (error: unknown) {
      if (esErrorDeUnicidad(error)) {
        throw errores.conflicto(`El tipo de comprobante ${entrada.codigo} ya existe.`, { codigo: "Ese código ya existe." });
      }
      throw error;
    }
  }

  cambiarActivacionTipoComprobante(codigo: string, activo: boolean, actor: UsuarioSesion): Promise<TipoComprobante> {
    return this.repositorio.transaccion(async (tx) => {
      const editado = await this.repositorio.cambiarActivacionTipoComprobante(tx, codigo, activo);
      if (!editado) {
        throw errores.noEncontrado(`El tipo de comprobante ${codigo} no existe.`);
      }
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "tipo_comprobante", entidadId: codigo, accion: activo ? "ACTIVAR" : "DESACTIVAR" });
      return editado;
    });
  }
}
