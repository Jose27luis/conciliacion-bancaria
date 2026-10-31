import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuditModule } from "../audit";
import { LoginService } from "./application/login.service";
import { SessionTokenService } from "./application/session-token.service";
import { UsersService } from "./application/users.service";
import { IdentityRepository } from "./infrastructure/identity.repository";
import { AuthController } from "./presentation/auth.controller";
import { LoginThrottlerGuard } from "./presentation/login-throttler.guard";
import { SessionGuard } from "./presentation/session.guard";
import { UsersController } from "./presentation/users.controller";

@Module({
  imports: [AuditModule, ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])],
  controllers: [AuthController, UsersController],
  providers: [
    IdentityRepository,
    SessionTokenService,
    LoginService,
    UsersService,
    LoginThrottlerGuard,
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class IdentityModule {}
