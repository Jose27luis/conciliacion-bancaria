import { Module } from "@nestjs/common";
import { PeriodsService } from "./application/periods.service";
import { PeriodsRepository } from "./infrastructure/periods.repository";

@Module({
  providers: [PeriodsRepository, PeriodsService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
