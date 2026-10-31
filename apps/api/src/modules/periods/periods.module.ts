import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { PeriodsService } from "./application/periods.service";
import { PeriodsRepository } from "./infrastructure/periods.repository";
import { PeriodsController } from "./presentation/periods.controller";

@Module({
  imports: [AuditModule],
  controllers: [PeriodsController],
  providers: [PeriodsRepository, PeriodsService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
