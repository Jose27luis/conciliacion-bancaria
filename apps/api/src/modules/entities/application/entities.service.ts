import { Injectable } from "@nestjs/common";
import {
  normalizarDocumento,
  normalizarTexto,
  tipoDeDocumento,
  type EditarDetalleEntrada,
  type EditarEntidadEntrada,
  type Entidad,
  type EntidadConHistorial,
  type EntidadesQuery,
  type EntidadMaestro,
  type EntidadResumen,
  type Pagina,
  type UsuarioSesion,
} from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { errores, esErrorDeUnicidad } from "../../../shared/http/api-error";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";
import { EntitiesRepository, type EntidadMaestroRegistro } from "../infrastructure/entities.repository";

function aMaestro(registro: EntidadMaestroRegistro): EntidadMaestro {
  return {
    ...registro,
    detalles: registro.detalles.map(({ cuentaContable, ultimoUso, ...detalle }) => ({
      ...detalle,
      cuentaContableDenominacion: cuentaContable.denominacion,
      ultimoUso: ultimoUso.toISOString(),
    })),
  };
}

function limpiar(texto: string): string {
  return texto.trim().replace(/\s+/g, " ");
}

@Injectable()
export class EntitiesService {
  constructor(
    private readonly repositorio: EntitiesRepository,
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditService,
  ) {}

  buscar(consulta: string): Promise<Entidad[]> {
    return this.repositorio.buscar(consulta.trim());
  }

  async listar(consulta: EntidadesQuery): Promise<Pagina<EntidadResumen>> {
    const { items, total } = await this.repositorio.listar(consulta);
    return { items, total, pagina: consulta.pagina, porPagina: consulta.porPagina };
  }

  async porDocumento(documento: string): Promise<EntidadConHistorial> {
    const entidad = await this.repositorio.porDocumento(normalizarDocumento(documento));
    if (!entidad) {
      throw errores.noEncontrado("Ese documento aún no está registrado.");
    }
    return entidad;
  }

  async maestro(id: string): Promise<EntidadMaestro> {
    const entidad = await this.repositorio.maestro(this.prisma, id);
    if (!entidad) {
      throw errores.noEncontrado("El proveedor no existe.");
    }
    return aMaestro(entidad);
  }

  editar(id: string, entrada: EditarEntidadEntrada, actor: UsuarioSesion): Promise<EntidadMaestro> {
    return this.repositorio.transaccion(async (tx) => {
      const actual = await this.existente(tx, id);
      const razonSocial = limpiar(entrada.razonSocial);
      await this.repositorio.actualizarRazonSocial(tx, id, razonSocial);
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "entidad",
        entidadId: id,
        accion: "EDITAR",
        antes: { razonSocial: actual.razonSocial },
        despues: { razonSocial },
      });
      return aMaestro(await this.existente(tx, id));
    });
  }

  async editarDetalle(entidadId: string, detalleId: string, entrada: EditarDetalleEntrada, actor: UsuarioSesion): Promise<EntidadMaestro> {
    try {
      return await this.repositorio.transaccion(async (tx) => {
        const actual = await this.detalleExistente(tx, entidadId, detalleId);
        if (!(await this.repositorio.cuentaDeMovimientoActiva(tx, entrada.cuentaContableCodigo))) {
          const mensaje = `La CTA ${entrada.cuentaContableCodigo} no es una cuenta de movimiento activa.`;
          throw errores.validacion(mensaje, { cuentaContableCodigo: mensaje });
        }
        if (!(await this.repositorio.medioPagoActivo(tx, entrada.medioPagoCodigo))) {
          const mensaje = `COD ${entrada.medioPagoCodigo} no es un medio de pago activo.`;
          throw errores.validacion(mensaje, { medioPagoCodigo: mensaje });
        }
        const detalle = limpiar(entrada.detalle);
        await this.repositorio.actualizarDetalle(tx, detalleId, {
          detalle,
          detalleNormalizado: normalizarTexto(detalle),
          cuentaContableCodigo: entrada.cuentaContableCodigo,
          medioPagoCodigo: entrada.medioPagoCodigo,
        });
        await this.auditoria.registrar(tx, {
          usuarioId: actor.id,
          entidad: "detalle_frecuente",
          entidadId: detalleId,
          accion: "EDITAR",
          antes: { detalle: actual.detalle, cuenta: actual.cuentaContableCodigo, medioPago: actual.medioPagoCodigo },
          despues: { detalle, cuenta: entrada.cuentaContableCodigo, medioPago: entrada.medioPagoCodigo },
        });
        return aMaestro(await this.existente(tx, entidadId));
      });
    } catch (error: unknown) {
      if (esErrorDeUnicidad(error)) {
        throw errores.conflicto("Este proveedor ya tiene un detalle con ese texto. Desactiva uno de los dos.", { detalle: "Ya existe ese detalle." });
      }
      throw error;
    }
  }

  cambiarActivacionDetalle(entidadId: string, detalleId: string, activo: boolean, actor: UsuarioSesion): Promise<EntidadMaestro> {
    return this.repositorio.transaccion(async (tx) => {
      await this.detalleExistente(tx, entidadId, detalleId);
      await this.repositorio.actualizarDetalle(tx, detalleId, { activo });
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "detalle_frecuente", entidadId: detalleId, accion: activo ? "ACTIVAR" : "DESACTIVAR" });
      return aMaestro(await this.existente(tx, entidadId));
    });
  }

  async documentosConocidos(documentos: string[]): Promise<Set<string>> {
    const existentes = await this.repositorio.documentosExistentes(this.prisma, documentos.map(normalizarDocumento));
    return new Set(existentes.map((entidad) => entidad.numeroDocumento));
  }

  usar(tx: Transaccion, documento: string, razonSocial: string): Promise<Entidad> {
    const numeroDocumento = normalizarDocumento(documento);
    return this.repositorio.usarEntidad(tx, {
      numeroDocumento,
      tipoDocumento: tipoDeDocumento(numeroDocumento),
      razonSocial: limpiar(razonSocial),
    });
  }

  aprender(tx: Transaccion, entidadId: string, detalle: string, cuentaContableCodigo: string, medioPagoCodigo: string): Promise<void> {
    const limpio = limpiar(detalle);
    return this.repositorio.aprenderDetalle(tx, {
      entidadId,
      detalle: limpio,
      detalleNormalizado: normalizarTexto(limpio),
      cuentaContableCodigo,
      medioPagoCodigo,
    });
  }

  private async existente(tx: Transaccion, id: string): Promise<EntidadMaestroRegistro> {
    const entidad = await this.repositorio.maestro(tx, id);
    if (!entidad) {
      throw errores.noEncontrado("El proveedor no existe.");
    }
    return entidad;
  }

  private async detalleExistente(tx: Transaccion, entidadId: string, detalleId: string): Promise<{ detalle: string; cuentaContableCodigo: string; medioPagoCodigo: string }> {
    const detalle = await this.repositorio.detalle(tx, entidadId, detalleId);
    if (!detalle) {
      throw errores.noEncontrado("El detalle no existe para este proveedor.");
    }
    return detalle;
  }
}
