import { Injectable } from "@nestjs/common";
import type { EntidadesQuery } from "@conciliacion/contracts";
import type { Prisma, TipoDocumentoEntidad } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

const camposEntidad = { id: true, tipoDocumento: true, numeroDocumento: true, razonSocial: true, usos: true } satisfies Prisma.EntidadSelect;

export type EntidadRegistro = Prisma.EntidadGetPayload<{ select: typeof camposEntidad }>;

export type EntidadConDetallesRegistro = EntidadRegistro & {
  detalles: { detalle: string; cuentaContableCodigo: string; medioPagoCodigo: string; usos: number }[];
};

const camposDetalleMaestro = {
  id: true,
  detalle: true,
  cuentaContableCodigo: true,
  medioPagoCodigo: true,
  usos: true,
  activo: true,
  ultimoUso: true,
  cuentaContable: { select: { denominacion: true } },
} satisfies Prisma.DetalleFrecuenteSelect;

export type DetalleMaestroRegistro = Prisma.DetalleFrecuenteGetPayload<{ select: typeof camposDetalleMaestro }>;

export type EntidadMaestroRegistro = EntidadRegistro & { detalles: DetalleMaestroRegistro[] };

const LIMITE_BUSQUEDA = 8;
const LIMITE_DETALLES = 12;

function filtroEntidades(consulta: string | undefined): Prisma.EntidadWhereInput {
  const texto = consulta?.trim();
  if (!texto) {
    return {};
  }
  const digitos = texto.replace(/[\s.-]/g, "");
  return /^\d+$/.test(digitos) ? { numeroDocumento: { startsWith: digitos } } : { razonSocial: { contains: texto, mode: "insensitive" } };
}

@Injectable()
export class EntitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscar(consulta: string): Promise<EntidadRegistro[]> {
    return this.prisma.entidad.findMany({
      where: filtroEntidades(consulta),
      select: camposEntidad,
      orderBy: [{ usos: "desc" }, { razonSocial: "asc" }],
      take: LIMITE_BUSQUEDA,
    });
  }

  async listar(consulta: EntidadesQuery): Promise<{ items: (EntidadRegistro & { detallesActivos: number })[]; total: number }> {
    const where = filtroEntidades(consulta.q);
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.entidad.findMany({
        where,
        select: { ...camposEntidad, _count: { select: { detalles: { where: { activo: true } } } } },
        orderBy: [{ usos: "desc" }, { razonSocial: "asc" }],
        skip: (consulta.pagina - 1) * consulta.porPagina,
        take: consulta.porPagina,
      }),
      this.prisma.entidad.count({ where }),
    ]);
    return { items: filas.map(({ _count, ...entidad }) => ({ ...entidad, detallesActivos: _count.detalles })), total };
  }

  porDocumento(numeroDocumento: string): Promise<EntidadConDetallesRegistro | null> {
    return this.prisma.entidad.findUnique({
      where: { numeroDocumento },
      select: {
        ...camposEntidad,
        detalles: {
          where: { activo: true },
          select: { detalle: true, cuentaContableCodigo: true, medioPagoCodigo: true, usos: true },
          orderBy: [{ usos: "desc" }, { ultimoUso: "desc" }],
          take: LIMITE_DETALLES,
        },
      },
    });
  }

  maestro(db: Transaccion | PrismaService, id: string): Promise<EntidadMaestroRegistro | null> {
    return db.entidad.findUnique({
      where: { id },
      select: { ...camposEntidad, detalles: { select: camposDetalleMaestro, orderBy: [{ activo: "desc" }, { usos: "desc" }, { detalle: "asc" }] } },
    });
  }

  detalle(tx: Transaccion, entidadId: string, detalleId: string): Promise<DetalleMaestroRegistro | null> {
    return tx.detalleFrecuente.findFirst({ where: { id: detalleId, entidadId }, select: camposDetalleMaestro });
  }

  async cuentaDeMovimientoActiva(tx: Transaccion, codigo: string): Promise<boolean> {
    return (await tx.cuentaContable.count({ where: { codigo, deMovimiento: true, activa: true } })) > 0;
  }

  async medioPagoActivo(tx: Transaccion, codigo: string): Promise<boolean> {
    return (await tx.medioPago.count({ where: { codigo, activo: true } })) > 0;
  }

  async actualizarRazonSocial(tx: Transaccion, id: string, razonSocial: string): Promise<void> {
    await tx.entidad.update({ where: { id }, data: { razonSocial } });
  }

  async actualizarDetalle(tx: Transaccion, id: string, datos: Prisma.DetalleFrecuenteUncheckedUpdateInput): Promise<void> {
    await tx.detalleFrecuente.update({ where: { id }, data: datos });
  }

  documentosExistentes(tx: Transaccion | PrismaService, numeros: string[]): Promise<{ numeroDocumento: string }[]> {
    return tx.entidad.findMany({ where: { numeroDocumento: { in: numeros } }, select: { numeroDocumento: true } });
  }

  async usarEntidad(
    tx: Transaccion,
    datos: { numeroDocumento: string; tipoDocumento: TipoDocumentoEntidad; razonSocial: string },
  ): Promise<EntidadRegistro> {
    return tx.entidad.upsert({
      where: { numeroDocumento: datos.numeroDocumento },
      create: { ...datos, usos: 1 },
      update: { usos: { increment: 1 } },
      select: camposEntidad,
    });
  }

  async aprenderDetalle(
    tx: Transaccion,
    datos: { entidadId: string; detalle: string; detalleNormalizado: string; cuentaContableCodigo: string; medioPagoCodigo: string },
  ): Promise<void> {
    await tx.detalleFrecuente.upsert({
      where: { entidadId_detalleNormalizado: { entidadId: datos.entidadId, detalleNormalizado: datos.detalleNormalizado } },
      create: { ...datos, usos: 1 },
      update: {
        detalle: datos.detalle,
        cuentaContableCodigo: datos.cuentaContableCodigo,
        medioPagoCodigo: datos.medioPagoCodigo,
        usos: { increment: 1 },
        ultimoUso: new Date(),
      },
    });
  }

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo);
  }
}
