import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected getTracker(solicitud: Request): Promise<string> {
    const ipCliente = solicitud.headers["x-cliente-ip"];
    const ip = typeof ipCliente === "string" && ipCliente ? ipCliente : solicitud.ip ?? "desconocida";
    return Promise.resolve(`login:${ip}`);
  }
}
