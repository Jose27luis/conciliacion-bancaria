import { Injectable } from "@nestjs/common";
import ExcelJS from "exceljs";
import { errores } from "../../../shared/http/api-error";
import { COLUMNAS_PLAN, type ColumnaPlan, type FilaPlan } from "../domain/chart-of-accounts-plan";

const FILAS_BUSQUEDA_ENCABEZADO = 30;

type Encabezado = { fila: number; columnas: Record<ColumnaPlan, number> };

function columnasDeEncabezado(fila: ExcelJS.Row): Partial<Record<ColumnaPlan, number>> {
  const encontradas: Partial<Record<ColumnaPlan, number>> = {};
  fila.eachCell((celda, numeroColumna) => {
    const texto = celda.text.trim().toUpperCase();
    for (const [clave, nombre] of Object.entries(COLUMNAS_PLAN)) {
      if (texto === nombre) {
        encontradas[clave as ColumnaPlan] = numeroColumna;
      }
    }
  });
  return encontradas;
}

function encabezadoCompleto(columnas: Partial<Record<ColumnaPlan, number>>): columnas is Record<ColumnaPlan, number> {
  return (Object.keys(COLUMNAS_PLAN) as ColumnaPlan[]).every((clave) => columnas[clave] !== undefined);
}

function buscarEncabezado(hoja: ExcelJS.Worksheet): Encabezado | Partial<Record<ColumnaPlan, number>> | null {
  let parcial: Partial<Record<ColumnaPlan, number>> | null = null;
  const limite = Math.min(hoja.rowCount, FILAS_BUSQUEDA_ENCABEZADO);
  for (let numero = 1; numero <= limite; numero += 1) {
    const columnas = columnasDeEncabezado(hoja.getRow(numero));
    if (encabezadoCompleto(columnas)) {
      return { fila: numero, columnas };
    }
    if (columnas.codigo !== undefined) {
      parcial = columnas;
    }
  }
  return parcial;
}

function esEncabezado(valor: Encabezado | Partial<Record<ColumnaPlan, number>>): valor is Encabezado {
  return "fila" in valor && "columnas" in valor;
}

@Injectable()
export class ChartOfAccountsExcelReader {
  async leer(contenido: Buffer): Promise<FilaPlan[]> {
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.load(new Uint8Array(contenido).buffer);
    } catch (error: unknown) {
      throw errores.validacion("El archivo no es un Excel .xlsx válido.", { archivo: error instanceof Error ? error.message : String(error) });
    }

    let faltantes: string[] = Object.values(COLUMNAS_PLAN);
    for (const hoja of libro.worksheets) {
      const encontrado = buscarEncabezado(hoja);
      if (!encontrado) {
        continue;
      }
      if (esEncabezado(encontrado)) {
        return this.filas(hoja, encontrado);
      }
      faltantes = (Object.keys(COLUMNAS_PLAN) as ColumnaPlan[]).filter((clave) => encontrado[clave] === undefined).map((clave) => COLUMNAS_PLAN[clave]);
    }
    throw errores.validacion(`No se encontró el encabezado del plan contable. Faltan las columnas: ${faltantes.join(", ")}.`);
  }

  private filas(hoja: ExcelJS.Worksheet, encabezado: Encabezado): FilaPlan[] {
    const filas: FilaPlan[] = [];
    for (let numero = encabezado.fila + 1; numero <= hoja.rowCount; numero += 1) {
      const fila = hoja.getRow(numero);
      const valores = Object.fromEntries(
        (Object.entries(encabezado.columnas) as [ColumnaPlan, number][]).map(([clave, columna]) => [clave, fila.getCell(columna).text.trim()]),
      ) as Record<ColumnaPlan, string>;
      if (Object.values(valores).every((valor) => valor === "")) {
        continue;
      }
      filas.push({ fila: numero, valores });
    }
    return filas;
  }
}
