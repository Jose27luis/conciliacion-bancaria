import { Module } from "@nestjs/common";
import { EntitiesService } from "./application/entities.service";
import { EntitiesRepository } from "./infrastructure/entities.repository";
import { EntitiesController } from "./presentation/entities.controller";

@Module({
  controllers: [EntitiesController],
  providers: [EntitiesRepository, EntitiesService],
  exports: [EntitiesService],
})
export class EntitiesModule {}
