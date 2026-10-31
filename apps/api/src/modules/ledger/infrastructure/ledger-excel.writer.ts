import { Injectable } from "@nestjs/common";
import { formatoVoucher, textoAnalitico } from "@conciliacion/contracts";
import ExcelJS from "exceljs";
import type { VoucherRegistro } from "./ledger.repository";

export type HojaExportacion = { nombre: string; vouchers: VoucherRegistro[] };

const COLUMNAS: { titulo: string; ancho: number }[] = [
  { titulo: "Nº/Cheque/Operación", ancho: 18 },
  { titulo: "N# Voucher", ancho: 12 },
  { titulo: "Fecha Operación", ancho: 14 },
  { titulo: "Analítico", ancho: 20 },
  { titulo: "Ruc", ancho: 14 },
  { titulo: "Razón social", ancho: 44 },
  { titulo: "Detalle", ancho: 52 },
  { titulo: "T.C", ancho: 8 },
  { titulo: "Ingreso", ancho: 14 },
  { titulo: "Egreso", ancho: 14 },
  { titulo: "CTA", ancho: 9 },
  { titulo: "COD", ancho: 7 },
];

const FORMATO_IMPORTE = "#,##0.00";
const FORMATO_TIPO_CAMBIO = "0.000";
const FORMATO_FECHA = "dd/mm/yyyy";

function nombreDeHoja(nombre: string, usados: Set<string>): string {
  const base = nombre.replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Hoja";
  let candidato = base;
  let sufijo = 2;
  while (usados.has(candidato.toUpperCase())) {
    const extra = ` (${sufijo})`;
    candidato = `${base.slice(0, 31 - extra.length)}${extra}`;
    sufijo += 1;
  }
  usados.add(candidato.toUpperCase());
  return candidato;
}

function analiticoDe(voucher: VoucherRegistro): string {
  return textoAnalitico(
    voucher.tipoComprobanteCodigo && voucher.serie && voucher.numeroComprobante
      ? { tipo: voucher.tipoComprobanteCodigo, serie: voucher.serie, numero: voucher.numeroComprobante }
      : null,
  );
}

@Injectable()
export class LedgerExcelWriter {
  async escribir(hojas: HojaExportacion[]): Promise<Buffer> {
    const libro = new ExcelJS.Workbook();
    libro.creator = "Conciliación Bancaria";
    libro.created = new Date();
    const usados = new Set<string>();

    for (const hoja of hojas) {
      const hojaExcel = libro.addWorksheet(nombreDeHoja(hoja.nombre, usados), { views: [{ state: "frozen", ySplit: 1 }] });
      hojaExcel.columns = COLUMNAS.map((columna) => ({ header: columna.titulo, width: columna.ancho }));
      const encabezado = hojaExcel.getRow(1);
      encabezado.font = { bold: true };
      encabezado.alignment = { vertical: "middle" };

      for (const voucher of hoja.vouchers) {
        for (const linea of voucher.lineas) {
          const fila = hojaExcel.addRow([
            voucher.nroOperacion ?? "",
            formatoVoucher(voucher.periodo.mes, voucher.numero),
            voucher.fechaOperacion,
            analiticoDe(voucher),
            voucher.entidad.numeroDocumento,
            voucher.entidad.razonSocial,
            linea.detalle,
            voucher.tipoCambio.toNumber(),
            linea.ingreso.toNumber(),
            linea.egreso.toNumber(),
            linea.cuentaContableCodigo,
            voucher.medioPagoCodigo,
          ]);
          fila.getCell(3).numFmt = FORMATO_FECHA;
          fila.getCell(8).numFmt = FORMATO_TIPO_CAMBIO;
          fila.getCell(9).numFmt = FORMATO_IMPORTE;
          fila.getCell(10).numFmt = FORMATO_IMPORTE;
        }
      }
    }

    const contenido = await libro.xlsx.writeBuffer();
    return Buffer.from(contenido);
  }
}
