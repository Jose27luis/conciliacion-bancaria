import { Injectable } from "@nestjs/common";
import type { EstadoImportacion, Moneda, Prisma } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

const camposImportacion = {
  id: true,
  archivo: true,
  estado: true,
  datos: true,
  resumen: true,
  importados: true,
  creadoEn: true,
  creadoPor: { select: { nombre: true } },
} satisfies Prisma.ImportacionSelect;

export type ImportacionRegistro = Prisma.ImportacionGetPayload<{ select: typeof camposImportacion }>;

export type CuentaDestino = { id: string; nombre: string; moneda: Moneda; activa: boolean };

@Injectable()
export class ImportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  crear(datos: { archivo: string; datos: Prisma.InputJsonValue; resumen: Prisma.InputJsonValue; creadoPorId: string }): Promise<ImportacionRegistro> {
    return this.prisma.importacion.create({ data: datos, select: camposImportacion });
  }

  buscar(id: string): Promise<ImportacionRegistro | null> {
    return this.prisma.importacion.findUnique({ where: { id }, select: camposImportacion });
  }

  listar(): Promise<Omit<ImportacionRegistro, "datos">[]> {
    return this.prisma.importacion.findMany({
      select: { id: true, archivo: true, estado: true, resumen: true, importados: true, creadoEn: true, creadoPor: { select: { nombre: true } } },
      orderBy: { creadoEn: "desc" },
      take: 50,
    });
  }

  async cambiarEstado(tx: Transaccion, id: string, estado: EstadoImportacion, importados: number | null): Promise<boolean> {
    const resultado = await tx.importacion.updateMany({ where: { id, estado: "VALIDADA" }, data: { estado, importados } });
    return resultado.count === 1;
  }

  cuentasTesoreria(): Promise<CuentaDestino[]> {
    return this.prisma.cuentaTesoreria.findMany({ select: { id: true, nombre: true, moneda: true, activa: true } });
  }

  cuentasContables(codigos: string[]): Promise<{ codigo: string; activa: boolean; destinoDebeCodigo: string | null; destinoHaberCodigo: string | null }[]> {
    return this.prisma.cuentaContable.findMany({
      where: { codigo: { in: codigos } },
      select: { codigo: true, activa: true, destinoDebeCodigo: true, destinoHaberCodigo: true },
    });
  }

  async aplicarAmarre(tx: Transaccion, codigo: string, destinoDebeCodigo: string, destinoHaberCodigo: string): Promise<boolean> {
    const resultado = await tx.cuentaContable.updateMany({
      where: { codigo, destinoDebeCodigo: null, destinoHaberCodigo: null },
      data: { destinoDebeCodigo, destinoHaberCodigo },
    });
    return resultado.count === 1;
  }

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo);
  }

  transaccionLarga<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo, { maxWait: 15_000, timeout: 600_000 });
  }
}
