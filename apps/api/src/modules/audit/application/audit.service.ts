import { Injectable } from "@nestjs/common";
import type { AccionAuditoria, Prisma } from "@prisma/client";
import type { Transaccion } from "../../../shared/prisma/prisma.service";

export type RegistroAuditoria = {
  usuarioId: string;
  entidad: string;
  entidadId: string;
  accion: AccionAuditoria;
  antes?: Prisma.InputJsonValue;
  despues?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditService {
  async registrar(tx: Transaccion, registro: RegistroAuditoria): Promise<void> {
    await tx.auditoria.create({ data: registro });
  }
}
