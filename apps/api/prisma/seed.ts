import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const MEDIOS_PAGO_SUNAT: ReadonlyArray<readonly [string, string]> = [
  ["001", "Depósito en cuenta"],
  ["002", "Giro"],
  ["003", "Transferencia de fondos"],
  ["004", "Orden de pago"],
  ["005", "Tarjeta de débito"],
  ["006", "Tarjeta de crédito emitida en el país por una empresa del sistema financiero"],
  ["007", "Cheques con la cláusula de NO NEGOCIABLE, INTRANSFERIBLES, NO A LA ORDEN u otra equivalente"],
  ["008", "Efectivo, por operaciones en las que no existe obligación de utilizar medio de pago"],
  ["009", "Efectivo, en los demás casos"],
  ["010", "Medios de pago usados en comercio exterior"],
  ["011", "Documentos emitidos por las EDPYMES y las cooperativas de ahorro y crédito no autorizadas a captar depósitos del público"],
  ["012", "Tarjeta de crédito emitida en el país o en el exterior por una empresa no perteneciente al sistema financiero"],
  ["013", "Tarjetas de crédito emitidas en el exterior por empresas bancarias o financieras no domiciliadas"],
  ["101", "Transferencias - Comercio exterior"],
  ["102", "Cheques bancarios - Comercio exterior"],
  ["103", "Orden de pago simple - Comercio exterior"],
  ["104", "Orden de pago documentario - Comercio exterior"],
  ["105", "Remesa simple - Comercio exterior"],
  ["106", "Remesa documentaria - Comercio exterior"],
  ["107", "Carta de crédito simple - Comercio exterior"],
  ["108", "Carta de crédito documentario - Comercio exterior"],
  ["999", "Otros medios de pago"],
];

const TIPOS_COMPROBANTE: ReadonlyArray<readonly [string, string]> = [
  ["01", "Factura"],
  ["02", "Recibo por honorarios"],
  ["03", "Boleta de venta"],
  ["07", "Nota de crédito"],
  ["08", "Nota de débito"],
  ["12", "Ticket o cinta emitido por máquina registradora"],
  ["14", "Recibo por servicios públicos"],
  ["DJ", "Declaración jurada"],
];

const COSTO_HASH = 12;

async function sembrarCatalogos(prisma: PrismaClient): Promise<void> {
  for (const [codigo, descripcion] of MEDIOS_PAGO_SUNAT) {
    await prisma.medioPago.upsert({ where: { codigo }, create: { codigo, descripcion }, update: { descripcion } });
  }
  for (const [codigo, descripcion] of TIPOS_COMPROBANTE) {
    await prisma.tipoComprobante.upsert({ where: { codigo }, create: { codigo, descripcion }, update: {} });
  }
}

async function sembrarAdministrador(prisma: PrismaClient): Promise<void> {
  if ((await prisma.usuario.count()) > 0) {
    return;
  }
  const nombre = process.env.SEED_ADMIN_NOMBRE?.trim();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!nombre || !email || !password) {
    throw new Error("No hay usuarios. Define SEED_ADMIN_NOMBRE, SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crear el primer administrador.");
  }
  if (password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 10 caracteres.");
  }
  await prisma.usuario.create({
    data: { nombre, email, rol: "ADMIN", passwordHash: await bcrypt.hash(password, COSTO_HASH) },
  });
}

async function sembrar(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await sembrarCatalogos(prisma);
    await sembrarAdministrador(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

sembrar().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
