import { Injectable } from "@nestjs/common";
import type { CuentasContablesQuery } from "@conciliacion/contracts";
import type { Prisma } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";
import type { CuentaJerarquica } from "../domain/chart-of-accounts-plan";

const camposCuentaContable = {
  codigo: true,
  denominacion: true,
  padreCodigo: true,
  nivel: true,
  deMovimiento: true,
  tipo: true,
  clase: true,
  analitica: true,
  centroCosto: true,
  moneda: true,
  destinoDebeCodigo: true,
  destinoHaberCodigo: true,
  activa: true,
} satisfies Prisma.CuentaContableSelect;

export type CuentaContableRegistro = Prisma.CuentaContableGetPayload<{ select: typeof camposCuentaContable }>;

const camposCuentaTesoreria = {
  id: true,
  nombre: true,
  tipo: true,
  banco: true,
  numeroCuenta: true,
  moneda: true,
  cuentaContableCodigo: true,
  orden: true,
  activa: true,
  cuentaContable: { select: { denominacion: true } },
} satisfies Prisma.CuentaTesoreriaSelect;

export type CuentaTesoreriaRegistro = Prisma.CuentaTesoreriaGetPayload<{ select: typeof camposCuentaTesoreria }>;

export type ElementoCatalogo = { codigo: string; descripcion: string; activo: boolean };

export type DatosCuentaTesoreria = {
  nombre: string;
  tipo: "BANCO" | "CAJA";
  banco: string | null;
  numeroCuenta: string | null;
  moneda: "PEN" | "USD";
  cuentaContableCodigo: string;
  orden: number;
};

const TIEMPO_IMPORTACION_MS = 120_000;

function filtroCuentas(consulta: CuentasContablesQuery): Prisma.CuentaContableWhereInput {
  const condiciones: Prisma.CuentaContableWhereInput[] = [];
  if (consulta.q) {
    condiciones.push(
      /^\d+$/.test(consulta.q)
        ? { codigo: { startsWith: consulta.q } }
        : { denominacion: { contains: consulta.q, mode: "insensitive" } },
    );
  }
  if (consulta.prefijo) {
    condiciones.push({ codigo: { startsWith: consulta.prefijo } });
  }
  if (consulta.movimiento !== undefined) {
    condiciones.push({ deMovimiento: consulta.movimiento });
  }
  if (consulta.activa !== undefined) {
    condiciones.push({ activa: consulta.activa });
  }
  return { AND: condiciones };
}

@Injectable()
export class MastersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listarCuentasContables(consulta: CuentasContablesQuery): Promise<{ items: CuentaContableRegistro[]; total: number }> {
    const where = filtroCuentas(consulta);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.cuentaContable.findMany({
        where,
        select: camposCuentaContable,
        orderBy: { codigo: "asc" },
        skip: (consulta.pagina - 1) * consulta.porPagina,
        take: consulta.porPagina,
      }),
      this.prisma.cuentaContable.count({ where }),
    ]);
    return { items, total };
  }

  cuentasDeMovimientoActivas(): Promise<{ codigo: string; denominacion: string }[]> {
    return this.prisma.cuentaContable.findMany({
      where: { deMovimiento: true, activa: true },
      select: { codigo: true, denominacion: true },
      orderBy: { codigo: "asc" },
    });
  }

  buscarCuentaContable(db: Transaccion | PrismaService, codigo: string): Promise<CuentaContableRegistro | null> {
    return db.cuentaContable.findUnique({ where: { codigo }, select: camposCuentaContable });
  }

  todasLasCuentasContables(tx: Transaccion): Promise<CuentaContableRegistro[]> {
    return tx.cuentaContable.findMany({ select: camposCuentaContable });
  }

  async crearCuentasContables(tx: Transaccion, cuentas: CuentaJerarquica[]): Promise<void> {
    const ordenadas = [...cuentas].sort((a, b) => a.codigo.length - b.codigo.length || a.codigo.localeCompare(b.codigo));
    await tx.cuentaContable.createMany({ data: ordenadas });
  }

  async actualizarCuentaContable(tx: Transaccion, codigo: string, datos: Prisma.CuentaContableUncheckedUpdateInput): Promise<void> {
    await tx.cuentaContable.update({ where: { codigo }, data: datos });
  }

  cambiarActivacionCuentaContable(tx: Transaccion, codigo: string, activa: boolean): Promise<CuentaContableRegistro> {
    return tx.cuentaContable.update({ where: { codigo }, data: { activa }, select: camposCuentaContable });
  }

  cuentasTesoreriaSinMovimiento(tx: Transaccion): Promise<{ nombre: string; cuentaContableCodigo: string }[]> {
    return tx.cuentaTesoreria.findMany({
      where: { cuentaContable: { deMovimiento: false } },
      select: { nombre: true, cuentaContableCodigo: true },
    });
  }

  listarMediosPago(): Promise<ElementoCatalogo[]> {
    return this.prisma.medioPago.findMany({ orderBy: { codigo: "asc" } });
  }

  async cambiarActivacionMedioPago(tx: Transaccion, codigo: string, activo: boolean): Promise<ElementoCatalogo | null> {
    const existe = await tx.medioPago.findUnique({ where: { codigo }, select: { codigo: true } });
    return existe ? tx.medioPago.update({ where: { codigo }, data: { activo } }) : null;
  }

  listarTiposComprobante(): Promise<ElementoCatalogo[]> {
    return this.prisma.tipoComprobante.findMany({ orderBy: { codigo: "asc" } });
  }

  crearTipoComprobante(tx: Transaccion, codigo: string, descripcion: string): Promise<ElementoCatalogo> {
    return tx.tipoComprobante.create({ data: { codigo, descripcion } });
  }

  async cambiarActivacionTipoComprobante(tx: Transaccion, codigo: string, activo: boolean): Promise<ElementoCatalogo | null> {
    const existe = await tx.tipoComprobante.findUnique({ where: { codigo }, select: { codigo: true } });
    return existe ? tx.tipoComprobante.update({ where: { codigo }, data: { activo } }) : null;
  }

  listarCuentasTesoreria(soloActivas: boolean): Promise<CuentaTesoreriaRegistro[]> {
    return this.prisma.cuentaTesoreria.findMany({
      where: soloActivas ? { activa: true } : {},
      select: camposCuentaTesoreria,
      orderBy: [{ activa: "desc" }, { orden: "asc" }, { nombre: "asc" }],
    });
  }

  buscarCuentaTesoreria(tx: Transaccion, id: string): Promise<CuentaTesoreriaRegistro | null> {
    return tx.cuentaTesoreria.findUnique({ where: { id }, select: camposCuentaTesoreria });
  }

  crearCuentaTesoreria(tx: Transaccion, datos: DatosCuentaTesoreria): Promise<CuentaTesoreriaRegistro> {
    return tx.cuentaTesoreria.create({ data: datos, select: camposCuentaTesoreria });
  }

  actualizarCuentaTesoreria(tx: Transaccion, id: string, datos: Prisma.CuentaTesoreriaUncheckedUpdateInput): Promise<CuentaTesoreriaRegistro> {
    return tx.cuentaTesoreria.update({ where: { id }, data: datos, select: camposCuentaTesoreria });
  }

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo);
  }

  transaccionLarga<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo, { maxWait: 15_000, timeout: TIEMPO_IMPORTACION_MS });
  }
}
