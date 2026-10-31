import { Injectable } from "@nestjs/common";
import type { EntidadesQuery } from "@conciliacion/contracts";
import { Prisma, type TipoDocumentoEntidad } from "@prisma/client";
import { z } from "zod";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";
import { busquedaTolerante, soloDigitos } from "../../../shared/search/text-search";

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

const filaIdSchema = z.array(z.object({ id: z.string() }));
const conteoSchema = z.array(z.object({ total: z.number().int() }));

function ordenarPorIds<T extends { id: string }>(ids: string[], filas: T[]): T[] {
  const porId = new Map(filas.map((fila) => [fila.id, fila]));
  return ids.flatMap((id) => {
    const fila = porId.get(id);
    return fila ? [fila] : [];
  });
}

const camposListado ={ ...camposEntidad, _count: { select: { detalles: { where: { activo: true } } } } } satisfies Prisma.EntidadSelect;

@Injectable()
export class EntitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(consulta: string): Promise<EntidadRegistro[]> {
    const digitos = soloDigitos(consulta);
    if (digitos || !consulta.trim()) {
      return this.prisma.entidad.findMany({
        where: digitos ? { numeroDocumento: { startsWith: digitos } } : {},
        select: camposEntidad,
        orderBy: [{ usos: "desc" }, { razonSocial: "asc" }],
        take: LIMITE_BUSQUEDA,
      });
    }
    const ids = await this.idsPorTexto(consulta, LIMITE_BUSQUEDA, 0);
    return ordenarPorIds(ids, await this.prisma.entidad.findMany({ where: { id: { in: ids } }, select: camposEntidad }));
  }

  async listar(consulta: EntidadesQuery): Promise<{ items: (EntidadRegistro & { detallesActivos: number })[]; total: number }> {
    const texto = consulta.q?.trim() ?? "";
    const digitos = soloDigitos(texto);
    if (texto && !digitos) {
      const [ids, total] = await Promise.all([this.idsPorTexto(texto, consulta.porPagina, (consulta.pagina - 1) * consulta.porPagina), this.contarPorTexto(texto)]);
      const filas = ordenarPorIds(ids, await this.prisma.entidad.findMany({ where: { id: { in: ids } }, select: camposListado }));
      return { items: filas.map(({ _count, ...entidad }) => ({ ...entidad, detallesActivos: _count.detalles })), total };
    }
    const where: Prisma.EntidadWhereInput = digitos ? { numeroDocumento: { startsWith: digitos } } : {};
    const [filas, total] = await this.prisma.$transaction([
      this.prisma.entidad.findMany({
        where,
        select: camposListado,
        orderBy: [{ usos: "desc" }, { razonSocial: "asc" }],
        skip: (consulta.pagina - 1) * consulta.porPagina,
        take: consulta.porPagina,
      }),
      this.prisma.entidad.count({ where }),
    ]);
    return { items: filas.map(({ _count, ...entidad }) => ({ ...entidad, detallesActivos: _count.detalles })), total };
  }

  private async idsPorTexto(texto: string, limite: number, desde: number): Promise<string[]> {
    const { filtro, puntaje } = busquedaTolerante(Prisma.sql`razon_social`, texto);
    const filas: unknown = await this.prisma.$queryRaw`
      SELECT id::text AS id FROM entidades
      WHERE ${filtro}
      ORDER BY ${puntaje} DESC, usos DESC, razon_social ASC
      LIMIT ${limite} OFFSET ${desde}`;
    return filaIdSchema.parse(filas).map((fila) => fila.id);
  }

  private async contarPorTexto(texto: string): Promise<number> {
    const { filtro } = busquedaTolerante(Prisma.sql`razon_social`, texto);
    const filas: unknown = await this.prisma.$queryRaw`SELECT count(*)::int AS total FROM entidades WHERE ${filtro}`;
    return conteoSchema.parse(filas)[0]?.total ?? 0;
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
