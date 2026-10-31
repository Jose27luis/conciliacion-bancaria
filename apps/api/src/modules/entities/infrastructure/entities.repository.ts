import { Injectable } from "@nestjs/common";
import type { Prisma, TipoDocumentoEntidad } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

const camposEntidad = { id: true, tipoDocumento: true, numeroDocumento: true, razonSocial: true, usos: true } satisfies Prisma.EntidadSelect;

export type EntidadRegistro = Prisma.EntidadGetPayload<{ select: typeof camposEntidad }>;

export type EntidadConDetallesRegistro = EntidadRegistro & {
  detalles: { detalle: string; cuentaContableCodigo: string; medioPagoCodigo: string; usos: number }[];
};

const LIMITE_BUSQUEDA = 8;
const LIMITE_DETALLES = 12;

@Injectable()
export class EntitiesRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscar(consulta: string): Promise<EntidadRegistro[]> {
    const soloDigitos = /^\d+$/.test(consulta);
    return this.prisma.entidad.findMany({
      where: soloDigitos ? { numeroDocumento: { startsWith: consulta } } : { razonSocial: { contains: consulta, mode: "insensitive" } },
      select: camposEntidad,
      orderBy: [{ usos: "desc" }, { razonSocial: "asc" }],
      take: LIMITE_BUSQUEDA,
    });
  }

  porDocumento(numeroDocumento: string): Promise<EntidadConDetallesRegistro | null> {
    return this.prisma.entidad.findUnique({
      where: { numeroDocumento },
      select: {
        ...camposEntidad,
        detalles: {
          select: { detalle: true, cuentaContableCodigo: true, medioPagoCodigo: true, usos: true },
          orderBy: [{ usos: "desc" }, { ultimoUso: "desc" }],
          take: LIMITE_DETALLES,
        },
      },
    });
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
}
