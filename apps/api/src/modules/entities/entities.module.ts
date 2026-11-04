import { Module } from "@nestjs/common";
import { AuditModule } from "../audit";
import { DocumentLookupService } from "./application/document-lookup.service";
import { EntitiesService } from "./application/entities.service";
import { EntitiesRepository } from "./infrastructure/entities.repository";
import { PeruDevsClient } from "./infrastructure/perudevs.client";
import { EntitiesController } from "./presentation/entities.controller";

@Module({
  imports: [AuditModule],
  controllers: [EntitiesController],
  providers: [EntitiesRepository, EntitiesService, PeruDevsClient, DocumentLookupService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
