import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { LedgerModule } from "../ledger";
import { PeriodsModule } from "../periods";
import { ImportsService } from "./application/imports.service";
import { ImportsRepository } from "./infrastructure/imports.repository";
import { ModelExcelReader } from "./infrastructure/model-excel.reader";
import { ImportsController } from "./presentation/imports.controller";

@Module({
  imports: [AuditModule, LedgerModule, PeriodsModule],
  controllers: [ImportsController],
  providers: [ImportsRepository, ModelExcelReader, ImportsService],
})
export class ImportsModule {}
