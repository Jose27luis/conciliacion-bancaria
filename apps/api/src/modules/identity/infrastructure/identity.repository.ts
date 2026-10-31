import { Injectable } from "@nestjs/common";
import type { Prisma, Rol } from "@prisma/client";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";

const camposUsuario = { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true } satisfies Prisma.UsuarioSelect;

export type UsuarioRegistro = Prisma.UsuarioGetPayload<{ select: typeof camposUsuario }>;

export type UsuarioConPassword = { id: string; nombre: string; rol: Rol; activo: boolean; passwordHash: string };

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  buscarParaLogin(email: string): Promise<UsuarioConPassword | null> {
    return this.prisma.usuario.findUnique({
      where: { email },
      select: { id: true, nombre: true, rol: true, activo: true, passwordHash: true },
    });
  }

  buscarActivo(id: string): Promise<{ id: string; rol: Rol } | null> {
    return this.prisma.usuario.findFirst({ where: { id, activo: true }, select: { id: true, rol: true } });
  }

  listar(): Promise<UsuarioRegistro[]> {
    return this.prisma.usuario.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }], select: camposUsuario });
  }

  buscar(tx: Transaccion, id: string): Promise<UsuarioRegistro | null> {
    return tx.usuario.findUnique({ where: { id }, select: camposUsuario });
  }

  contarAdministradoresActivos(tx: Transaccion): Promise<number> {
    return tx.usuario.count({ where: { rol: "ADMIN", activo: true } });
  }

  crear(tx: Transaccion, datos: { nombre: string; email: string; rol: Rol; passwordHash: string }): Promise<UsuarioRegistro> {
    return tx.usuario.create({ data: datos, select: camposUsuario });
  }

  actualizar(tx: Transaccion, id: string, datos: Prisma.UsuarioUpdateInput): Promise<UsuarioRegistro> {
    return tx.usuario.update({ where: { id }, data: datos, select: camposUsuario });
  }

  transaccion<T>(trabajo: (tx: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(trabajo);
  }
}
