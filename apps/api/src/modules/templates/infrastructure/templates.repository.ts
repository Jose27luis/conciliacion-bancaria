import { Injectable } from "@nestjs/common";
import type { Prisma, TipoMovimiento } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

const camposPlantilla = {
  id: true,
  atajo: true,
  etiqueta: true,
  detalle: true,
  cuentaContableCodigo: true,
  medioPagoCodigo: true,
  analitico: true,
  tipo: true,
  importe: true,
  activa: true,
  entidad: { select: { id: true, numeroDocumento: true, razonSocial: true } },
} satisfies Prisma.PlantillaSelect;

export type PlantillaRegistro = Prisma.PlantillaGetPayload<{ select: typeof camposPlantilla }>;

export type DatosPlantilla = {
  atajo: number;
  etiqueta: string;
  entidadId: string;
  detalle: string;
  cuentaContableCodigo: string;
  medioPagoCodigo: string;
  analitico: string;
  tipo: TipoMovimiento;
  importe: string | null;
};

@Injectable()
export class TemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listar(soloActivas: boolean): Promise<PlantillaRegistro[]> {
    return this.prisma.plantilla.findMany({
      where: soloActivas ? { activa: true } : {},
      select: camposPlantilla,
      orderBy: [{ activa: "desc" }, { atajo: "asc" }, { etiqueta: "asc" }],
    });
  }

  buscar(tx: Transaccion, id: string): Promise<PlantillaRegistro | null> {
    return tx.plantilla.findUnique({ where: { id }, select: camposPlantilla });
  }

  atajosOcupados(tx: Transaccion, excepto: string | null): Promise<{ atajo: number | null }[]> {
    return tx.plantilla.findMany({ where: { atajo: { not: null }, ...(excepto ? { id: { not: excepto } } : {}) }, select: { atajo: true } });
  }

  entidadPorDocumento(tx: Transaccion, numeroDocumento: string): Promise<{ id: string } | null> {
    return tx.entidad.findUnique({ where: { numeroDocumento }, select: { id: true } });
  }

  async cuentaDeMovimientoActiva(tx: Transaccion, codigo: string): Promise<boolean> {
    return (await tx.cuentaContable.count({ where: { codigo, deMovimiento: true, activa: true } })) > 0;
  }

  async medioPagoActivo(tx: Transaccion, codigo: string): Promise<boolean> {
    return (await tx.medioPago.count({ where: { codigo, activo: true } })) > 0;
  }

  crear(tx: Transaccion, datos: DatosPlantilla): Promise<PlantillaRegistro> {
    return tx.plantilla.create({ data: datos, select: camposPlantilla });
  }

  actualizar(tx: Transaccion, id: string, datos: Omit<Partial<DatosPlantilla>, "atajo"> & { activa?: boolean; atajo?: number | null }): Promise<PlantillaRegistro> {
    return tx.plantilla.update({ where: { id }, data: datos, select: camposPlantilla });
  }

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo);
  }
}
