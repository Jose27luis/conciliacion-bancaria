import { Injectable } from "@nestjs/common";
import type { CuentaTesoreria, GuardarCuentaTesoreriaEntrada, UsuarioSesion } from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { errores, esErrorDeUnicidad } from "../../../shared/http/api-error";
import type { Transaccion } from "../../../shared/prisma/prisma.service";
import { MastersRepository, type CuentaTesoreriaRegistro, type DatosCuentaTesoreria } from "../infrastructure/masters.repository";

const PREFIJO_EFECTIVO_Y_EQUIVALENTES = "10";
const ENTIDAD = "cuenta_tesoreria";

function aCuentaTesoreria(registro: CuentaTesoreriaRegistro): CuentaTesoreria {
  const { cuentaContable, ...resto } = registro;
  return { ...resto, cuentaContableDenominacion: cuentaContable.denominacion };
}

function datos(entrada: GuardarCuentaTesoreriaEntrada): DatosCuentaTesoreria {
  return {
    nombre: entrada.nombre.toUpperCase(),
    tipo: entrada.tipo,
    banco: entrada.tipo === "BANCO" ? entrada.banco : null,
    numeroCuenta: entrada.tipo === "BANCO" ? entrada.numeroCuenta : null,
    moneda: entrada.moneda,
    cuentaContableCodigo: entrada.cuentaContableCodigo,
    orden: entrada.orden,
  };
}

@Injectable()
export class TreasuryAccountsService {
  constructor(
    private readonly repositorio: MastersRepository,
    private readonly auditoria: AuditService,
  ) {}

  async listar(soloActivas: boolean): Promise<CuentaTesoreria[]> {
    return (await this.repositorio.listarCuentasTesoreria(soloActivas)).map(aCuentaTesoreria);
  }

  crear(entrada: GuardarCuentaTesoreriaEntrada, actor: UsuarioSesion): Promise<CuentaTesoreria> {
    return this.conNombreUnico(entrada.nombre, () =>
      this.repositorio.transaccion(async (tx) => {
        await this.validarCuentaContable(tx, entrada.cuentaContableCodigo);
        const creada = await this.repositorio.crearCuentaTesoreria(tx, datos(entrada));
        await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: ENTIDAD, entidadId: creada.id, accion: "CREAR", despues: datos(entrada) });
        return aCuentaTesoreria(creada);
      }),
    );
  }

  editar(id: string, entrada: GuardarCuentaTesoreriaEntrada, actor: UsuarioSesion): Promise<CuentaTesoreria> {
    return this.conNombreUnico(entrada.nombre, () =>
      this.repositorio.transaccion(async (tx) => {
        const actual = await this.existente(tx, id);
        await this.validarCuentaContable(tx, entrada.cuentaContableCodigo);
        const editada = await this.repositorio.actualizarCuentaTesoreria(tx, id, datos(entrada));
        await this.auditoria.registrar(tx, {
          usuarioId: actor.id,
          entidad: ENTIDAD,
          entidadId: id,
          accion: "EDITAR",
          antes: aCuentaTesoreria(actual),
          despues: aCuentaTesoreria(editada),
        });
        return aCuentaTesoreria(editada);
      }),
    );
  }

  cambiarActivacion(id: string, activa: boolean, actor: UsuarioSesion): Promise<CuentaTesoreria> {
    return this.repositorio.transaccion(async (tx) => {
      await this.existente(tx, id);
      const editada = await this.repositorio.actualizarCuentaTesoreria(tx, id, { activa });
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: ENTIDAD, entidadId: id, accion: activa ? "ACTIVAR" : "DESACTIVAR" });
      return aCuentaTesoreria(editada);
    });
  }

  private async existente(tx: Transaccion, id: string): Promise<CuentaTesoreriaRegistro> {
    const cuenta = await this.repositorio.buscarCuentaTesoreria(tx, id);
    if (!cuenta) {
      throw errores.noEncontrado("La cuenta de tesorería no existe.");
    }
    return cuenta;
  }

  private async validarCuentaContable(tx: Transaccion, codigo: string): Promise<void> {
    const cuenta = await this.repositorio.buscarCuentaContable(tx, codigo);
    const mensaje = !cuenta
      ? `La cuenta ${codigo} no existe en el plan contable. Importa el plan contable primero.`
      : !cuenta.codigo.startsWith(PREFIJO_EFECTIVO_Y_EQUIVALENTES)
        ? "La cuenta contable debe ser de la cuenta 10 (efectivo y equivalentes de efectivo)."
        : !cuenta.deMovimiento
          ? `La cuenta ${codigo} tiene subcuentas. Elige una cuenta de movimiento.`
          : !cuenta.activa
            ? `La cuenta ${codigo} está desactivada.`
            : null;
    if (mensaje) {
      throw errores.validacion(mensaje, { cuentaContableCodigo: mensaje });
    }
  }

  private async conNombreUnico<T>(nombre: string, trabajo: () => Promise<T>): Promise<T> {
    try {
      return await trabajo();
    } catch (error: unknown) {
      if (esErrorDeUnicidad(error)) {
        throw errores.conflicto(`Ya existe una cuenta llamada ${nombre.toUpperCase()}.`, { nombre: "Ya existe una cuenta con ese nombre." });
      }
      throw error;
    }
  }
}
