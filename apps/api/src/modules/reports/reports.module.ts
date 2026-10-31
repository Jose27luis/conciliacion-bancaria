import { Module } from "@nestjs/common";
import { PeriodsModule } from "../periods";
import { ReportsService } from "./application/reports.service";
import { ReportsRepository } from "./infrastructure/reports.repository";
import { ReportsController } from "./presentation/reports.controller";

@Module({
  imports: [PeriodsModule],
  controllers: [ReportsController],
  providers: [ReportsRepository, ReportsService],
})
export class ReportsModule {}
