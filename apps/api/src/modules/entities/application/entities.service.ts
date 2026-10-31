import { Injectable } from "@nestjs/common";
import { normalizarDocumento, normalizarTexto, tipoDeDocumento, type Entidad, type EntidadConHistorial } from "@conciliacion/contracts";
import { errores } from "../../../shared/http/api-error";
import { PrismaService, type Transaccion } from "../../../shared/prisma/prisma.service";
import { EntitiesRepository } from "../infrastructure/entities.repository";

@Injectable()
export class EntitiesService {
  constructor(
    private readonly repositorio: EntitiesRepository,
    private readonly prisma: PrismaService,
  ) {}

  buscar(consulta: string): Promise<Entidad[]> {
    const limpia = consulta.trim();
    return this.repositorio.buscar(/^[\d\s.-]+$/.test(limpia) ? limpia.replace(/[\s.-]/g, "") : limpia);
  }

  async porDocumento(documento: string): Promise<EntidadConHistorial> {
    const entidad = await this.repositorio.porDocumento(normalizarDocumento(documento));
    if (!entidad) {
      throw errores.noEncontrado("Ese documento aún no está registrado.");
    }
    return entidad;
  }

  async documentosConocidos(documentos: string[]): Promise<Set<string>> {
    const existentes = await this.repositorio.documentosExistentes(this.prisma, documentos.map(normalizarDocumento));
    return new Set(existentes.map((entidad) => entidad.numeroDocumento));
  }

  usar(tx: Transaccion, documento: string, razonSocial: string): Promise<Entidad> {
    const numeroDocumento = normalizarDocumento(documento);
    return this.repositorio.usarEntidad(tx, {
      numeroDocumento,
      tipoDocumento: tipoDeDocumento(numeroDocumento),
      razonSocial: razonSocial.trim().replace(/\s+/g, " "),
    });
  }

  aprender(tx: Transaccion, entidadId: string, detalle: string, cuentaContableCodigo: string, medioPagoCodigo: string): Promise<void> {
    const limpio = detalle.trim().replace(/\s+/g, " ");
    return this.repositorio.aprenderDetalle(tx, {
      entidadId,
      detalle: limpio,
      detalleNormalizado: normalizarTexto(limpio),
      cuentaContableCodigo,
      medioPagoCodigo,
    });
  }
}
