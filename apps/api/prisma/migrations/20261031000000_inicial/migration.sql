CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "Rol" AS ENUM ('ADMIN', 'CONTADOR', 'ASISTENTE', 'LECTOR');

CREATE TYPE "Moneda" AS ENUM ('PEN', 'USD');

CREATE TYPE "TipoCuentaTesoreria" AS ENUM ('BANCO', 'CAJA');

CREATE TYPE "TipoCuentaContable" AS ENUM ('BAL', 'RNA', 'RNF', 'NIN', 'RFU', 'ORD');

CREATE TYPE "ClaseCuentaContable" AS ENUM ('ORDEN', 'ACTIVO', 'PASIVO', 'PATRIMONIO', 'GASTO', 'INGRESO', 'GESTION');

CREATE TYPE "AccionAuditoria" AS ENUM ('CREAR', 'EDITAR', 'ACTIVAR', 'DESACTIVAR', 'IMPORTAR', 'CAMBIAR_PASSWORD');

CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cuentas_contables" (
    "codigo" VARCHAR(8) NOT NULL,
    "denominacion" VARCHAR(200) NOT NULL,
    "padre_codigo" VARCHAR(8),
    "nivel" SMALLINT NOT NULL,
    "de_movimiento" BOOLEAN NOT NULL,
    "tipo" "TipoCuentaContable" NOT NULL,
    "clase" "ClaseCuentaContable" NOT NULL,
    "analitica" BOOLEAN NOT NULL,
    "centro_costo" BOOLEAN NOT NULL,
    "moneda" "Moneda" NOT NULL,
    "destino_debe_codigo" VARCHAR(8),
    "destino_haber_codigo" VARCHAR(8),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cuentas_contables_pkey" PRIMARY KEY ("codigo")
);

CREATE TABLE "medios_pago" (
    "codigo" VARCHAR(3) NOT NULL,
    "descripcion" VARCHAR(250) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "medios_pago_pkey" PRIMARY KEY ("codigo")
);

CREATE TABLE "tipos_comprobante" (
    "codigo" VARCHAR(4) NOT NULL,
    "descripcion" VARCHAR(120) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipos_comprobante_pkey" PRIMARY KEY ("codigo")
);

CREATE TABLE "cuentas_tesoreria" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "tipo" "TipoCuentaTesoreria" NOT NULL,
    "banco" VARCHAR(80),
    "numero_cuenta" VARCHAR(30),
    "moneda" "Moneda" NOT NULL,
    "cuenta_contable_codigo" VARCHAR(8) NOT NULL,
    "orden" SMALLINT NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cuentas_tesoreria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "entidad" VARCHAR(60) NOT NULL,
    "entidad_id" VARCHAR(60) NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

CREATE INDEX "cuentas_contables_padre_codigo_idx" ON "cuentas_contables"("padre_codigo");

CREATE INDEX "cuentas_contables_de_movimiento_activa_idx" ON "cuentas_contables"("de_movimiento", "activa");

CREATE UNIQUE INDEX "cuentas_tesoreria_nombre_key" ON "cuentas_tesoreria"("nombre");

CREATE INDEX "auditoria_entidad_entidad_id_idx" ON "auditoria"("entidad", "entidad_id");

CREATE INDEX "auditoria_usuario_id_creado_en_idx" ON "auditoria"("usuario_id", "creado_en");

ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_padre_codigo_fkey" FOREIGN KEY ("padre_codigo") REFERENCES "cuentas_contables"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_destino_debe_codigo_fkey" FOREIGN KEY ("destino_debe_codigo") REFERENCES "cuentas_contables"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cuentas_contables" ADD CONSTRAINT "cuentas_contables_destino_haber_codigo_fkey" FOREIGN KEY ("destino_haber_codigo") REFERENCES "cuentas_contables"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cuentas_tesoreria" ADD CONSTRAINT "cuentas_tesoreria_cuenta_contable_codigo_fkey" FOREIGN KEY ("cuenta_contable_codigo") REFERENCES "cuentas_contables"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

