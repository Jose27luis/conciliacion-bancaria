import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { AuditModule } from "./modules/audit";
import { IdentityModule } from "./modules/identity";
import { MastersModule } from "./modules/masters";
import { AppConfigModule } from "./shared/config/config.module";
import { ApiExceptionFilter } from "./shared/http/api-exception.filter";
import { PrismaModule } from "./shared/prisma/prisma.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AppConfigModule, PrismaModule, AuditModule, IdentityModule, MastersModule],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
