import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import type {
  CuentaContable,
  CuentasContablesQuery,
  ImportacionPlanRechazo,
  ImportacionPlanResultado,
  OpcionCuentaContable,
  Pagina,
  UsuarioSesion,
} from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { errores } from "../../../shared/http/api-error";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { armarJerarquia, leerCuentas, type CuentaJerarquica } from "../domain/chart-of-accounts-plan";
import { ChartOfAccountsExcelReader } from "../infrastructure/chart-of-accounts.excel-reader";
import { MastersRepository, type CuentaContableRegistro } from "../infrastructure/masters.repository";

const MAXIMO_ERRORES_REPORTADOS = 100;

function rechazo(mensaje: string, filas: ImportacionPlanRechazo["filas"]): UnprocessableEntityException {
  const cuerpo: ImportacionPlanRechazo = { mensaje, filas: filas.slice(0, MAXIMO_ERRORES_REPORTADOS) };
  return new UnprocessableEntityException(cuerpo);
}

function cambio(actual: CuentaContableRegistro, nueva: CuentaJerarquica): boolean {
  return (
    actual.denominacion !== nueva.denominacion ||
    actual.padreCodigo !== nueva.padreCodigo ||
    actual.nivel !== nueva.nivel ||
    actual.deMovimiento !== nueva.deMovimiento ||
    actual.tipo !== nueva.tipo ||
    actual.clase !== nueva.clase ||
    actual.analitica !== nueva.analitica ||
    actual.centroCosto !== nueva.centroCosto ||
    actual.moneda !== nueva.moneda
  );
}

@Injectable()
export class ChartOfAccountsService {
  constructor(
    private readonly repositorio: MastersRepository,
    private readonly prisma: PrismaService,
    private readonly lector: ChartOfAccountsExcelReader,
    private readonly auditoria: AuditService,
  ) {}

  async listar(consulta: CuentasContablesQuery): Promise<Pagina<CuentaContable>> {
    const { items, total } = await this.repositorio.listarCuentasContables(consulta);
    return { items, total, pagina: consulta.pagina, porPagina: consulta.porPagina };
  }

  opciones(): Promise<OpcionCuentaContable[]> {
    return this.repositorio.cuentasDeMovimientoActivas();
  }

  async obtener(codigo: string): Promise<CuentaContable> {
    const cuenta = await this.repositorio.buscarCuentaContable(this.prisma, codigo);
    if (!cuenta) {
      throw errores.noEncontrado(`La cuenta ${codigo} no existe en el plan contable.`);
    }
    return cuenta;
  }

  async cambiarActivacion(codigo: string, activa: boolean, actor: UsuarioSesion): Promise<CuentaContable> {
    await this.obtener(codigo);
    return this.repositorio.transaccion(async (tx) => {
      const editada = await this.repositorio.cambiarActivacionCuentaContable(tx, codigo, activa);
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "cuenta_contable",
        entidadId: codigo,
        accion: activa ? "ACTIVAR" : "DESACTIVAR",
      });
      return editada;
    });
  }

  async importar(contenido: Buffer, nombreArchivo: string, actor: UsuarioSesion): Promise<ImportacionPlanResultado> {
    const filas = await this.lector.leer(contenido);
    if (filas.length === 0) {
      throw errores.validacion("El archivo no tiene cuentas debajo del encabezado.");
    }
    const { cuentas, errores: filasConError } = leerCuentas(filas);
    if (filasConError.length > 0) {
      throw rechazo(`El archivo tiene ${filasConError.length} filas con errores. Corrígelas y vuelve a importarlo; no se guardó nada.`, filasConError);
    }

    return this.repositorio.transaccionLarga(async (tx) => {
      const existentes = await this.repositorio.todasLasCuentasContables(tx);
      const porCodigo = new Map(existentes.map((cuenta) => [cuenta.codigo, cuenta]));
      const jerarquia = armarJerarquia(cuentas, existentes);

      const nuevas: CuentaJerarquica[] = [];
      let actualizadas = 0;
      let sinCambios = 0;
      for (const cuenta of jerarquia.cuentas.values()) {
        const actual = porCodigo.get(cuenta.codigo);
        if (!actual) {
          nuevas.push(cuenta);
        } else if (cambio(actual, cuenta)) {
          const { codigo, ...datos } = cuenta;
          await this.repositorio.actualizarCuentaContable(tx, codigo, datos);
          actualizadas += 1;
        } else {
          sinCambios += 1;
        }
      }
      await this.repositorio.crearCuentasContables(tx, nuevas);

      for (const existente of existentes) {
        if (jerarquia.cuentas.has(existente.codigo)) {
          continue;
        }
        const deMovimiento = !jerarquia.conHijas.has(existente.codigo);
        if (existente.deMovimiento !== deMovimiento) {
          await this.repositorio.actualizarCuentaContable(tx, existente.codigo, { deMovimiento });
        }
      }

      const afectadas = await this.repositorio.cuentasTesoreriaSinMovimiento(tx);
      if (afectadas.length > 0) {
        const detalle = afectadas.map((cuenta) => `${cuenta.nombre} (${cuenta.cuentaContableCodigo})`).join(", ");
        throw errores.conflicto(`La importación deja sin cuenta de movimiento a: ${detalle}. No se guardó nada.`);
      }

      const resultado: ImportacionPlanResultado = { leidas: cuentas.length, creadas: nuevas.length, actualizadas, sinCambios };
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "plan_contable",
        entidadId: "importacion",
        accion: "IMPORTAR",
        despues: { archivo: nombreArchivo, ...resultado },
      });
      return resultado;
    });
  }
}
