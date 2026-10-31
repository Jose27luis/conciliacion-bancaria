CREATE TYPE "EstadoImportacion" AS ENUM ('VALIDADA', 'IMPORTADA', 'DESCARTADA');

ALTER TABLE "vouchers" ADD COLUMN     "importacion_id" UUID;

CREATE TABLE "importaciones" (
    "id" UUID NOT NULL,
    "archivo" VARCHAR(200) NOT NULL,
    "estado" "EstadoImportacion" NOT NULL DEFAULT 'VALIDADA',
    "datos" JSONB NOT NULL,
    "resumen" JSONB NOT NULL,
    "importados" INTEGER,
    "creado_por_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "importaciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "importaciones_creado_en_idx" ON "importaciones"("creado_en");

ALTER TABLE "importaciones" ADD CONSTRAINT "importaciones_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_importacion_id_fkey" FOREIGN KEY ("importacion_id") REFERENCES "importaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

