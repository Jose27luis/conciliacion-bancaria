CREATE TYPE "TipoMovimiento" AS ENUM ('EGRESO', 'INGRESO');

ALTER TABLE "detalles_frecuentes" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "plantillas" (
    "id" UUID NOT NULL,
    "atajo" SMALLINT,
    "etiqueta" VARCHAR(40) NOT NULL,
    "entidad_id" UUID NOT NULL,
    "detalle" VARCHAR(250) NOT NULL,
    "cuenta_contable_codigo" VARCHAR(8) NOT NULL,
    "medio_pago_codigo" VARCHAR(3) NOT NULL,
    "analitico" VARCHAR(5) NOT NULL DEFAULT '',
    "tipo" "TipoMovimiento" NOT NULL DEFAULT 'EGRESO',
    "importe" DECIMAL(14,2),
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plantillas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plantillas_atajo_key" ON "plantillas"("atajo");

ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_cuenta_contable_codigo_fkey" FOREIGN KEY ("cuenta_contable_codigo") REFERENCES "cuentas_contables"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "plantillas" ADD CONSTRAINT "plantillas_medio_pago_codigo_fkey" FOREIGN KEY ("medio_pago_codigo") REFERENCES "medios_pago"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;

