import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { errores } from "../../../shared/http/api-error";
import type { FilaHoja, ValorCelda } from "../domain/model-sheet-parser";

export type HojaCruda = { nombre: string; filas: FilaHoja[] };

function valorDe(valor: ExcelJS.CellValue): ValorCelda {
  if (valor === null || valor === undefined) {
    return null;
  }
  if (typeof valor === "number" || typeof valor === "string" || valor instanceof Date) {
    return valor;
  }
  if (typeof valor === "boolean") {
    return valor ? "1" : "0";
  }
  if ("result" in valor) {
    return valor.result === undefined ? null : valorDe(valor.result as ExcelJS.CellValue);
  }
  if ("richText" in valor) {
    return valor.richText.map((parte) => parte.text).join("");
  }
  if ("text" in valor && typeof valor.text === "string") {
    return valor.text;
  }
  if ("error" in valor) {
    return String(valor.error);
  }
  return null;
}

@Injectable()
export class ModelExcelReader {
  async leer(contenido: Buffer): Promise<HojaCruda[]> {
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.load(new Uint8Array(contenido).buffer);
    } catch (error: unknown) {
      throw errores.validacion("El archivo no es un Excel .xlsx válido.", { archivo: error instanceof Error ? error.message : String(error) });
    }
    return libro.worksheets
      .filter((hoja) => hoja.state === "visible")
      .map((hoja) => {
        const filas: FilaHoja[] = [];
        hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
          const celdas: ValorCelda[] = [];
          fila.eachCell({ includeEmpty: false }, (celda, columna) => {
            celdas[columna - 1] = valorDe(celda.value);
          });
          filas.push({ fila: numero, celdas });
        });
        return { nombre: hoja.name, filas };
      });
  }
}
