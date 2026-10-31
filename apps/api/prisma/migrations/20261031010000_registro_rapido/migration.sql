CREATE TYPE "EstadoPeriodo" AS ENUM ('ABIERTO', 'CERRADO');

CREATE TYPE "EstadoVoucher" AS ENUM ('REGISTRADO', 'ANULADO');

CREATE TYPE "TipoDocumentoEntidad" AS ENUM ('RUC', 'DNI', 'EXTRANJERO');

ALTER TYPE "AccionAuditoria" ADD VALUE 'REGISTRAR';
ALTER TYPE "AccionAuditoria" ADD VALUE 'ANULAR';
ALTER TYPE "AccionAuditoria" ADD VALUE 'CERRAR';
ALTER TYPE "AccionAuditoria" ADD VALUE 'REABRIR';

CREATE TABLE "periodos" (
    "id" UUID NOT NULL,
    "anio" SMALLINT NOT NULL,
    "mes" SMALLINT NOT NULL,
    "estado" "EstadoPeriodo" NOT NULL DEFAULT 'ABIERTO',
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,
    "cerrado_en" TIMESTAMPTZ(3),
    "cerrado_por_id" UUID,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "periodos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "entidades" (
    "id" UUID NOT NULL,
    "tipo_documento" "TipoDocumentoEntidad" NOT NULL,
    "numero_documento" VARCHAR(15) NOT NULL,
    "razon_social" VARCHAR(200) NOT NULL,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "entidades_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "detalles_frecuentes" (
    "id" UUID NOT NULL,
    "entidad_id" UUID NOT NULL,
    "detalle" VARCHAR(250) NOT NULL,
    "detalle_normalizado" VARCHAR(250) NOT NULL,
    "cuenta_contable_codigo" VARCHAR(8) NOT NULL,
    "medio_pago_codigo" VARCHAR(3) NOT NULL,
    "usos" INTEGER NOT NULL DEFAULT 0,
    "ultimo_uso" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "detalles_frecuentes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vouchers" (
    "id" UUID NOT NULL,
    "periodo_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "cuenta_tesoreria_id" UUID NOT NULL,
    "fecha_operacion" DATE NOT NULL,
    "nro_operacion" VARCHAR(30),
    "entidad_id" UUID NOT NULL,
    "tipo_comprobante_codigo" VARCHAR(4),
    "serie" VARCHAR(8),
    "numero_comprobante" VARCHAR(12),
    "medio_pago_codigo" VARCHAR(3) NOT NULL,
    "tipo_cambio" DECIMAL(10,3) NOT NULL,
    "estado" "EstadoVoucher" NOT NULL DEFAULT 'REGISTRADO',
    "motivo_anulacion" VARCHAR(250),
    "creado_por_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lineas_voucher" (
    "id" UUID NOT NULL,
    "voucher_id" UUID NOT NULL,
    "linea" SMALLINT NOT NULL,
    "detalle" VARCHAR(250) NOT NULL,
    "ingreso" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "egreso" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cuenta_contable_codigo" VARCHAR(8) NOT NULL,

    CONSTRAINT "lineas_voucher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "periodos_anio_mes_key" ON "periodos"("anio", "mes");

CREATE UNIQUE INDEX "entidades_numero_documento_key" ON "entidades"("numero_documento");

CREATE INDEX "entidades_usos_idx" ON "entidades"("usos");

CREATE UNIQUE INDEX "detalles_frecuentes_entidad_id_detalle_normalizado_key" ON "detalles_frecuentes"("entidad_id", "detalle_normalizado");

CREATE INDEX "vouchers_cuenta_tesoreria_id_fecha_operacion_idx" ON "vouchers"("cuenta_tesoreria_id", "fecha_operacion");

CREATE INDEX "vouchers_tipo_comprobante_codigo_serie_numero_comprobante_idx" ON "vouchers"("tipo_comprobante_codigo", "serie", "numero_comprobante");

CREATE INDEX "vouchers_entidad_id_fecha_operacion_idx" ON "vouchers"("entidad_id", "fecha_operacion");

CREATE UNIQUE INDEX "vouchers_periodo_id_numero_key" ON "vouchers"("periodo_id", "numero");

CREATE UNIQUE INDEX "lineas_voucher_voucher_id_linea_key" ON "lineas_voucher"("voucher_id", "linea");

ALTER TABLE "periodos" ADD CONSTRAINT "periodos_cerrado_por_id_fkey" FOREIGN KEY ("cerrado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "detalles_frecuentes" ADD CONSTRAINT "detalles_frecuentes_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_frecuentes" ADD CONSTRAINT "detalles_frecuentes_cuenta_contable_codigo_fkey" FOREIGN KEY ("cuenta_contable_codigo") REFERENCES "cuentas_contables"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_frecuentes" ADD CONSTRAINT "detalles_frecuentes_medio_pago_codigo_fkey" FOREIGN KEY ("medio_pago_codigo") REFERENCES "medios_pago"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_periodo_id_fkey" FOREIGN KEY ("periodo_id") REFERENCES "periodos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_cuenta_tesoreria_id_fkey" FOREIGN KEY ("cuenta_tesoreria_id") REFERENCES "cuentas_tesoreria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_tipo_comprobante_codigo_fkey" FOREIGN KEY ("tipo_comprobante_codigo") REFERENCES "tipos_comprobante"("codigo") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_medio_pago_codigo_fkey" FOREIGN KEY ("medio_pago_codigo") REFERENCES "medios_pago"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lineas_voucher" ADD CONSTRAINT "lineas_voucher_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "lineas_voucher" ADD CONSTRAINT "lineas_voucher_cuenta_contable_codigo_fkey" FOREIGN KEY ("cuenta_contable_codigo") REFERENCES "cuentas_contables"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

