import { Injectable } from "@nestjs/common";
import type {
  CambiarPasswordEntrada,
  CrearUsuarioEntrada,
  EditarUsuarioEntrada,
  Usuario,
  UsuarioSesion,
} from "@conciliacion/contracts";
import { AuditService } from "../../audit";
import { errores, esErrorDeUnicidad } from "../../../shared/http/api-error";
import type { Transaccion } from "../../../shared/prisma/prisma.service";
import { cifrarPassword } from "../domain/password";
import { IdentityRepository, type UsuarioRegistro } from "../infrastructure/identity.repository";

function aUsuario(registro: UsuarioRegistro): Usuario {
  return { ...registro, creadoEn: registro.creadoEn.toISOString() };
}

const ENTIDAD = "usuario";

@Injectable()
export class UsersService {
  constructor(
    private readonly repositorio: IdentityRepository,
    private readonly auditoria: AuditService,
  ) {}

  async listar(): Promise<Usuario[]> {
    return (await this.repositorio.listar()).map(aUsuario);
  }

  async crear(entrada: CrearUsuarioEntrada, actor: UsuarioSesion): Promise<Usuario> {
    const passwordHash = await cifrarPassword(entrada.password);
    try {
      return await this.repositorio.transaccion(async (tx) => {
        const creado = await this.repositorio.crear(tx, { nombre: entrada.nombre, email: entrada.email, rol: entrada.rol, passwordHash });
        await this.auditoria.registrar(tx, {
          usuarioId: actor.id,
          entidad: ENTIDAD,
          entidadId: creado.id,
          accion: "CREAR",
          despues: { nombre: creado.nombre, email: creado.email, rol: creado.rol },
        });
        return aUsuario(creado);
      });
    } catch (error: unknown) {
      if (esErrorDeUnicidad(error)) {
        throw errores.conflicto("Ya existe un usuario con ese correo.", { email: "Ya existe un usuario con ese correo." });
      }
      throw error;
    }
  }

  editar(id: string, entrada: EditarUsuarioEntrada, actor: UsuarioSesion): Promise<Usuario> {
    return this.repositorio.transaccion(async (tx) => {
      const actual = await this.existente(tx, id);
      if (actual.rol === "ADMIN" && entrada.rol !== "ADMIN") {
        await this.exigirOtroAdministrador(tx, actual);
      }
      const editado = await this.repositorio.actualizar(tx, id, { nombre: entrada.nombre, rol: entrada.rol });
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: ENTIDAD,
        entidadId: id,
        accion: "EDITAR",
        antes: { nombre: actual.nombre, rol: actual.rol },
        despues: { nombre: editado.nombre, rol: editado.rol },
      });
      return aUsuario(editado);
    });
  }

  cambiarActivacion(id: string, activo: boolean, actor: UsuarioSesion): Promise<Usuario> {
    return this.repositorio.transaccion(async (tx) => {
      const actual = await this.existente(tx, id);
      if (!activo && actual.id === actor.id) {
        throw errores.conflicto("No puedes desactivar tu propio usuario.");
      }
      if (!activo && actual.rol === "ADMIN") {
        await this.exigirOtroAdministrador(tx, actual);
      }
      const editado = await this.repositorio.actualizar(tx, id, { activo });
      await this.auditoria.registrar(tx, {
        usuarioId: actor.id,
        entidad: ENTIDAD,
        entidadId: id,
        accion: activo ? "ACTIVAR" : "DESACTIVAR",
      });
      return aUsuario(editado);
    });
  }

  async cambiarPassword(id: string, entrada: CambiarPasswordEntrada, actor: UsuarioSesion): Promise<void> {
    const passwordHash = await cifrarPassword(entrada.password);
    await this.repositorio.transaccion(async (tx) => {
      await this.existente(tx, id);
      await this.repositorio.actualizar(tx, id, { passwordHash });
      await this.auditoria.registrar(tx, { usuarioId: actor.id, entidad: ENTIDAD, entidadId: id, accion: "CAMBIAR_PASSWORD" });
    });
  }

  private async existente(tx: Transaccion, id: string): Promise<UsuarioRegistro> {
    const usuario = await this.repositorio.buscar(tx, id);
    if (!usuario) {
      throw errores.noEncontrado("El usuario no existe.");
    }
    return usuario;
  }

  private async exigirOtroAdministrador(tx: Transaccion, usuario: UsuarioRegistro): Promise<void> {
    const activos = await this.repositorio.contarAdministradoresActivos(tx);
    if (usuario.activo && activos <= 1) {
      throw errores.conflicto("Debe quedar al menos un administrador activo.");
    }
  }
}
