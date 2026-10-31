import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { EntitiesModule } from "../entities";
import { PeriodsModule } from "../periods";
import { LedgerService } from "./application/ledger.service";
import { LedgerExcelWriter } from "./infrastructure/ledger-excel.writer";
import { LedgerRepository } from "./infrastructure/ledger.repository";
import { LedgerController } from "./presentation/ledger.controller";

@Module({
  imports: [AuditModule, EntitiesModule, PeriodsModule],
  controllers: [LedgerController],
  providers: [LedgerRepository, LedgerExcelWriter, LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
