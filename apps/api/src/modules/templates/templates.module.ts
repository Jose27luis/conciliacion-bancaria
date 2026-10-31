import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { TemplatesService } from "./application/templates.service";
import { TemplatesRepository } from "./infrastructure/templates.repository";
import { TemplatesController } from "./presentation/templates.controller";

@Module({
  imports: [AuditModule],
  controllers: [TemplatesController],
  providers: [TemplatesRepository, TemplatesService],
})
export class TemplatesModule {}
