import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AppModule } from "./app.module";
import { AppConfigService } from "./shared/config/app-config.service";

async function arrancar(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfigService);

  app.set("trust proxy", "loopback");
  app.disable("x-powered-by");
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.enableShutdownHooks();

  const documento = new DocumentBuilder()
    .setTitle("Conciliación Bancaria API")
    .setDescription("API del sistema de conciliación bancaria: sesión, usuarios, plan contable, catálogos SUNAT y cuentas de tesorería.")
    .setVersion("0.1.0")
    .addCookieAuth(config.nombreCookieSesion)
    .build();
  SwaggerModule.setup("api/docs", app, cleanupOpenApiDoc(SwaggerModule.createDocument(app, documento)), {
    jsonDocumentUrl: "api/docs-json",
  });

  await app.listen(config.puerto, config.host);
}

void arrancar();
