import { Injectable } from "@nestjs/common";
import { MESES, type Periodo } from "@conciliacion/contracts";
import { errores } from "../../../shared/http/api-error";
import type { Transaccion } from "../../../shared/prisma/prisma.service";
import { PeriodsRepository } from "../infrastructure/periods.repository";

export type NumerosReservados = { periodoId: string; numeros: number[] };

@Injectable()
export class PeriodsService {
  constructor(private readonly repositorio: PeriodsRepository) {}

  async vista(anio: number, mes: number): Promise<Periodo> {
    const periodo = await this.repositorio.buscar(anio, mes);
    return periodo
      ? { anio, mes, estado: periodo.estado, proximoNumero: periodo.ultimoNumero + 1 }
      : { anio, mes, estado: "ABIERTO", proximoNumero: 1 };
  }

  async reservarNumeros(tx: Transaccion, anio: number, mes: number, cantidad: number): Promise<NumerosReservados> {
    const periodo = await this.repositorio.obtenerOCrear(tx, anio, mes);
    if (periodo.estado === "CERRADO") {
      throw errores.conflicto(`${MESES[mes - 1] ?? mes} ${anio} está cerrado. No se puede registrar en ese mes.`);
    }
    const actualizado = await this.repositorio.incrementarCorrelativo(tx, periodo.id, cantidad);
    const primero = actualizado.ultimoNumero - cantidad + 1;
    return { periodoId: periodo.id, numeros: Array.from({ length: cantidad }, (_valor, indice) => primero + indice) };
  }
}
