import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { AuditModule } from "./modules/audit";
import { EntitiesModule } from "./modules/entities";
import { IdentityModule } from "./modules/identity";
import { ImportsModule } from "./modules/imports";
import { LedgerModule } from "./modules/ledger";
import { MastersModule } from "./modules/masters";
import { PeriodsModule } from "./modules/periods";
import { ReportsModule } from "./modules/reports";
import { TemplatesModule } from "./modules/templates";
import { AppConfigModule } from "./shared/config/config.module";
import { ApiExceptionFilter } from "./shared/http/api-exception.filter";
import { PrismaModule } from "./shared/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    PrismaModule,
    AuditModule,
    IdentityModule,
    MastersModule,
    PeriodsModule,
    EntitiesModule,
    LedgerModule,
    TemplatesModule,
    ImportsModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
