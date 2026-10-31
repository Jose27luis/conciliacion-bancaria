import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ResumenAnual, ResumenMensual } from "@conciliacion/contracts";
import { ZodResponse } from "nestjs-zod";
import { ApiProtegida } from "../../../shared/http/api-docs";
import { ReportsService } from "../application/reports.service";
import { ResumenAnualDto, ResumenAnualQueryDto, ResumenMensualDto, ResumenQueryDto } from "./reports.dto";

@ApiTags("Resumen y saldos")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportes: ReportsService) {}

  @Get("summary")
  @ApiProtegida("validacion")
  @ApiOperation({
    summary: "Resumen del mes",
    description:
      "Por cuenta: saldo inicial, ingresos, egresos y saldo final del mes, con vouchers registrados y anulados. El saldo se calcula desde el saldo de apertura de la cuenta; sin apertura solo se dan los movimientos.",
  })
  @ZodResponse({ status: 200, description: "Resumen mensual", type: ResumenMensualDto })
  mensual(@Query() consulta: ResumenQueryDto): Promise<ResumenMensual> {
    return this.reportes.mensual(consulta);
  }

  @Get("year")
  @ApiProtegida("validacion")
  @ApiOperation({ summary: "Resumen del año", description: "Ingresos, egresos y saldo final de cada mes por cuenta." })
  @ZodResponse({ status: 200, description: "Resumen anual", type: ResumenAnualDto })
  anual(@Query() consulta: ResumenAnualQueryDto): Promise<ResumenAnual> {
    return this.reportes.anual(consulta.anio);
  }
}
