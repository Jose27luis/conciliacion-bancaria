import { PipeTransform } from "@nestjs/common";
import { uuidSchema } from "@conciliacion/contracts";
import { errores } from "./api-error";

export class UuidParamPipe implements PipeTransform<string, string> {
  transform(valor: string): string {
    if (!uuidSchema.safeParse(valor).success) {
      throw errores.noEncontrado();
    }
    return valor;
  }
}
