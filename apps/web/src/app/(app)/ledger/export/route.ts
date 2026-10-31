import { exportacionQuerySchema } from "@conciliacion/contracts";
import { NextResponse, type NextRequest } from "next/server";
import { apiArchivo, ErrorDeApi } from "@/shared/api/server-client";

export async function GET(solicitud: NextRequest): Promise<Response> {
  const parametros = solicitud.nextUrl.searchParams;
  const consulta = exportacionQuerySchema.safeParse({
    cuenta: parametros.get("cuenta") || undefined,
    anio: parametros.get("anio"),
    mes: parametros.get("mes"),
  });
  if (!consulta.success) {
    return NextResponse.json({ mensaje: "Indica un mes válido para exportar." }, { status: 400 });
  }
  try {
    const respuesta = await apiArchivo("/ledger/export.xlsx", { consulta: consulta.data });
    const cabeceras = new Headers();
    for (const nombre of ["content-type", "content-disposition", "content-length"]) {
      const valor = respuesta.headers.get(nombre);
      if (valor) {
        cabeceras.set(nombre, valor);
      }
    }
    cabeceras.set("cache-control", "no-store");
    return new Response(respuesta.body, { status: 200, headers: cabeceras });
  } catch (error: unknown) {
    if (error instanceof ErrorDeApi) {
      return NextResponse.json(error.cuerpo, { status: error.estado });
    }
    throw error;
  }
}
