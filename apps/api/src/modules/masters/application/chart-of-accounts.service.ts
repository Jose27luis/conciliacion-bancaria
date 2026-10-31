import { Injectable, UnprocessableEntityException } from "@nestjs/common";
import type {
  CuentaContable,
  CrearCuentaContableEntrada,
  CuentasContablesQuery,
  DestinosCuentaEntrada,
  EditarCuentaContableEntrada,
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

  async crear(entrada: CrearCuentaContableEntrada, actor: UsuarioSesion): Promise<CuentaContable> {
    const codigo = entrada.codigo;
    return this.repositorio.transaccion(async (tx) => {
      const prefijos = Array.from({ length: codigo.length - 2 }, (_valor, indice) => codigo.slice(0, codigo.length - 1 - indice));
      const conocidas = await this.repositorio.cuentasPorCodigo(tx, [codigo, ...prefijos]);
      if (conocidas.some((cuenta) => cuenta.codigo === codigo)) {
        throw errores.conflicto(`La cuenta ${codigo} ya existe.`, { codigo: "Ese código ya existe." });
      }
      const padre = prefijos.map((prefijo) => conocidas.find((cuenta) => cuenta.codigo === prefijo)).find((cuenta) => cuenta !== undefined) ?? null;
      if (!padre && codigo.length > 2) {
        const mensaje = `No existe ninguna cuenta superior de ${codigo}. Crea primero la cuenta ${codigo.slice(0, 2)}.`;
        throw errores.validacion(mensaje, { codigo: mensaje });
      }
      if (padre && !padre.activa) {
        const mensaje = `La cuenta superior ${padre.codigo} está desactivada.`;
        throw errores.validacion(mensaje, { codigo: mensaje });
      }

      const subcuentas = await this.repositorio.subcuentasQueCuelganDe(tx, padre?.codigo ?? null, codigo);
      if (padre?.deMovimiento) {
        const usos = await this.repositorio.usosQueRequierenMovimiento(tx, padre.codigo);
        const detalle = [
          ...usos.tesoreria.map((nombre) => `la cuenta de tesorería ${nombre}`),
          ...usos.plantillas.map((etiqueta) => `la plantilla ${etiqueta}`),
        ];
        if (detalle.length > 0) {
          const mensaje = `La cuenta ${padre.codigo} pasaría a ser agrupadora y la usa ${detalle.join(", ")}. Cámbiala ahí primero.`;
          throw errores.conflicto(mensaje, { codigo: mensaje });
        }
        await this.repositorio.actualizarCuentaContable(tx, padre.codigo, { deMovimiento: false });
      }

      const creada = await this.repositorio.crearCuentaContable(tx, {
        codigo,
        denominacion: entrada.denominacion.trim(),
        padreCodigo: padre?.codigo ?? null,
        nivel: padre ? padre.nivel + 1 : 1,
        deMovimiento: subcuentas.length === 0,
        tipo: entrada.tipo,
        clase: entrada.clase,
        moneda: entrada.moneda,
        analitica: entrada.analitica,
        centroCosto: entrada.centroCosto,
      });
      await this.repositorio.colgarDe(tx, subcuentas, codigo, codigo);
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "cuenta_contable",
        entidadId: codigo,
        accion: "CREAR",
        despues: { ...entrada, padre: padre?.codigo ?? null, padreAhoraAgrupadora: padre?.deMovimiento ?? false, subcuentasReasignadas: subcuentas },
      });
      return creada;
    });
  }

  async editar(codigo: string, entrada: EditarCuentaContableEntrada, actor: UsuarioSesion): Promise<CuentaContable> {
    return this.repositorio.transaccion(async (tx) => {
      const actual = await this.repositorio.buscarCuentaContable(tx, codigo);
      if (!actual) {
        throw errores.noEncontrado(`La cuenta ${codigo} no existe en el plan contable.`);
      }
      const datos = { ...entrada, denominacion: entrada.denominacion.trim() };
      const editada = await this.repositorio.editarCuentaContable(tx, codigo, datos);
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "cuenta_contable",
        entidadId: codigo,
        accion: "EDITAR",
        antes: { denominacion: actual.denominacion, tipo: actual.tipo, clase: actual.clase, moneda: actual.moneda, analitica: actual.analitica, centroCosto: actual.centroCosto },
        despues: datos,
      });
      return editada;
    });
  }

  async cambiarDestinos(codigo: string, entrada: DestinosCuentaEntrada, actor: UsuarioSesion): Promise<CuentaContable> {
    return this.repositorio.transaccion(async (tx) => {
      const actual = await this.repositorio.buscarCuentaContable(tx, codigo);
      if (!actual) {
        throw errores.noEncontrado(`La cuenta ${codigo} no existe en el plan contable.`);
      }
      const destinos = { destinoDebeCodigo: entrada.destinoDebeCodigo, destinoHaberCodigo: entrada.destinoHaberCodigo };
      for (const [campo, destino] of Object.entries(destinos)) {
        if (destino === null) {
          continue;
        }
        const cuenta = await this.repositorio.buscarCuentaContable(tx, destino);
        const mensaje =
          destino === codigo
            ? "La cuenta no puede ser su propio destino."
            : !cuenta
              ? `La cuenta ${destino} no existe en el plan contable.`
              : !cuenta.activa
                ? `La cuenta ${destino} está desactivada.`
                : null;
        if (mensaje) {
          throw errores.validacion(mensaje, { [campo]: mensaje });
        }
      }
      if ((entrada.destinoDebeCodigo === null) !== (entrada.destinoHaberCodigo === null)) {
        const mensaje = "Indica las dos cuentas de destino, debe y haber, o ninguna.";
        throw errores.validacion(mensaje, { destinoHaberCodigo: mensaje });
      }
      const editada = await this.repositorio.actualizarDestinos(tx, codigo, entrada.destinoDebeCodigo, entrada.destinoHaberCodigo);
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: "cuenta_contable",
        entidadId: codigo,
        accion: "EDITAR",
        antes: { destinoDebe: actual.destinoDebeCodigo, destinoHaber: actual.destinoHaberCodigo },
        despues: { destinoDebe: editada.destinoDebeCodigo, destinoHaber: editada.destinoHaberCodigo },
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
