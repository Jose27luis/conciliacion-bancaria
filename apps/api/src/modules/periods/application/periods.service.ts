import { Injectable } from "@nestjs/common";
import { MESES, type Periodo, type PeriodoAnual, type UsuarioSesion } from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { errores } from "../../../shared/http/api-error";
import type { Transaccion } from "../../../shared/prisma/prisma.service";
import { PeriodsRepository } from "../infrastructure/periods.repository";

export type NumerosReservados = { periodoId: string; numeros: number[] };

const ZONA_HORARIA = "America/Lima";

function nombre(anio: number, mes: number): string {
  return `${MESES[mes - 1] ?? mes} ${anio}`;
}

function mesActual(): { anio: number; mes: number } {
  const [anio = "0", mes = "0"] = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit" }).format(new Date()).split("-");
  return { anio: Number(anio), mes: Number(mes) };
}

@Injectable()
export class PeriodsService {
  constructor(
    private readonly repositorio: PeriodsRepository,
    private readonly auditoria: AuditService,
  ) {}

  async vista(anio: number, mes: number): Promise<Periodo> {
    const periodo = await this.repositorio.buscar(anio, mes);
    return periodo
      ? { anio, mes, estado: periodo.estado, proximoNumero: periodo.ultimoNumero + 1 }
      : { anio, mes, estado: "ABIERTO", proximoNumero: 1 };
  }

  async delAnio(anio: number): Promise<PeriodoAnual[]> {
    const [periodos, conteos] = await Promise.all([this.repositorio.delAnio(anio), this.repositorio.conteosDelAnio(anio)]);
    return Array.from({ length: 12 }, (_valor, indice) => {
      const mes = indice + 1;
      const periodo = periodos.find((actual) => actual.mes === mes);
      const contar = (estado: "REGISTRADO" | "ANULADO"): number => conteos.find((conteo) => conteo.mes === mes && conteo.estado === estado)?.cantidad ?? 0;
      return {
        anio,
        mes,
        estado: periodo?.estado ?? "ABIERTO",
        vouchers: contar("REGISTRADO"),
        anulados: contar("ANULADO"),
        cerradoEn: periodo?.cerradoEn?.toISOString() ?? null,
        cerradoPorNombre: periodo?.cerradoPor?.nombre ?? null,
      };
    });
  }

  async detalle(anio: number, mes: number): Promise<PeriodoAnual> {
    const periodos = await this.delAnio(anio);
    const periodo = periodos[mes - 1];
    if (!periodo) {
      throw errores.validacion("El mes debe estar entre 1 y 12.");
    }
    return periodo;
  }

  async cerrar(anio: number, mes: number, actor: UsuarioSesion): Promise<PeriodoAnual> {
    const actual = mesActual();
    if (anio * 12 + mes > actual.anio * 12 + actual.mes) {
      throw errores.validacion(`${nombre(anio, mes)} aún no empieza; no se puede cerrar.`);
    }
    await this.repositorio.transaccion(async (tx) => {
      const periodo = await this.repositorio.obtenerOCrear(tx, anio, mes);
      await this.repositorio.bloquear(tx, periodo.id);
      const vigente = await this.repositorio.obtenerOCrear(tx, anio, mes);
      if (vigente.estado === "CERRADO") {
        throw errores.conflicto(`${nombre(anio, mes)} ya está cerrado.`);
      }
      await this.repositorio.cerrar(tx, periodo.id, actor.id);
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "periodo", entidadId: `${anio}-${mes}`, accion: "CERRAR" });
    });
    return this.detalle(anio, mes);
  }

  async reabrir(anio: number, mes: number, motivo: string, actor: UsuarioSesion): Promise<PeriodoAnual> {
    await this.repositorio.transaccion(async (tx) => {
      const periodo = await this.repositorio.obtenerOCrear(tx, anio, mes);
      await this.repositorio.bloquear(tx, periodo.id);
      const vigente = await this.repositorio.obtenerOCrear(tx, anio, mes);
      if (vigente.estado !== "CERRADO") {
        throw errores.conflicto(`${nombre(anio, mes)} no está cerrado.`);
      }
      await this.repositorio.reabrir(tx, periodo.id);
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: "periodo", entidadId: `${anio}-${mes}`, accion: "REABRIR", despues: { motivo } });
    });
    return this.detalle(anio, mes);
  }

  async periodoAbierto(tx: Transaccion, anio: number, mes: number): Promise<string> {
    const creado = await this.repositorio.obtenerOCrear(tx, anio, mes);
    await this.repositorio.bloquear(tx, creado.id);
    const periodo = await this.repositorio.obtenerOCrear(tx, anio, mes);
    if (periodo.estado === "CERRADO") {
      throw errores.conflicto(`${nombre(anio, mes)} está cerrado. No se puede registrar en ese mes.`);
    }
    return periodo.id;
  }

  elevarCorrelativo(tx: Transaccion, periodoId: string, minimo: number): Promise<void> {
    return this.repositorio.elevarCorrelativo(tx, periodoId, minimo);
  }

  async numerosUsados(anio: number, mes: number): Promise<Map<number, string>> {
    const usados = await this.repositorio.numerosUsados(anio, mes);
    return new Map(usados.map((voucher) => [voucher.numero, voucher.cuentaTesoreria.nombre]));
  }

  async reservarNumeros(tx: Transaccion, anio: number, mes: number, cantidad: number): Promise<NumerosReservados> {
    const periodo = await this.repositorio.obtenerOCrear(tx, anio, mes);
    const actualizado = await this.repositorio.incrementarCorrelativo(tx, periodo.id, cantidad);
    if (actualizado.estado === "CERRADO") {
      throw errores.conflicto(`${nombre(anio, mes)} está cerrado. No se puede registrar en ese mes.`);
    }
    const primero = actualizado.ultimoNumero - cantidad + 1;
    return { periodoId: periodo.id, numeros: Array.from({ length: cantidad }, (_valor, indice) => primero + indice) };
  }
}
