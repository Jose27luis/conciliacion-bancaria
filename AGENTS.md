# Reglas del proyecto

Reglas obligatorias para cualquier persona o agente de IA que escriba código en este repositorio. No son sugerencias: un cambio que incumpla una regla marcada como **PROHIBIDO** no se acepta.

El contexto funcional y la arquitectura están en [`README.md`](README.md). Léelo antes de empezar.

---

## 1. Stack

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10 + Prisma (`apps/api`) |
| Frontend | Next.js 14 App Router + shadcn/ui + Tailwind CSS (`apps/web`) |
| Contratos | zod + tipos compartidos (`packages/contracts`) |
| Base de datos | PostgreSQL 16 |
| Gestor de paquetes | pnpm 9 (workspaces) |
| Runtime | Node.js 18 |

No se agregan dependencias nuevas sin justificar por qué no alcanza lo que ya existe.

---

## 2. TypeScript estricto

- `strict: true`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `noImplicitReturns` y `noFallthroughCasesInSwitch` activos en todos los `tsconfig`.
- **PROHIBIDO `any`** en cualquiera de sus formas: `any`, `as any`, `any[]`, `Record<string, any>`, `Promise<any>`, genéricos que caen en `any`.
- **PROHIBIDO** `@ts-ignore`, `@ts-nocheck` y `@ts-expect-error`.
- **PROHIBIDO** el operador de aserción no nula `!` para silenciar el compilador.
- **PROHIBIDO** desactivar reglas de ESLint con `eslint-disable`.
- Los datos externos (body, query, params, archivos, respuestas de terceros, `JSON.parse`) entran como `unknown` y se validan con un esquema zod antes de usarse.
- Los tipos se derivan de los esquemas (`z.infer<typeof esquema>`); no se duplican a mano.
- Los tipos de retorno de funciones exportadas, servicios y controladores se escriben explícitamente.
- ESLint en modo error: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-unsafe-*`, `@typescript-eslint/no-non-null-assertion`, `@typescript-eslint/ban-ts-comment`.

---

## 3. Sin comentarios en el código

- **PROHIBIDO** escribir comentarios en el código: ni de línea (`//`), ni de bloque (`/* */`), ni JSDoc/TSDoc (`/** */`), ni en JSX (`{/* */}`), ni en CSS, ni en SQL, ni en `schema.prisma`.
- El código se explica solo con nombres claros, funciones pequeñas y tipos.
- La documentación de la API va en los decoradores de Swagger (sección 6), no en comentarios.
- La documentación funcional va en `README.md`.
- Para desactivar código existente se comenta en vez de borrarlo **solo si el usuario lo pide expresamente**; en cualquier otro caso se elimina el código muerto.

---

## 4. Sin placeholders en los inputs

- **PROHIBIDO** usar el atributo `placeholder` en `input`, `textarea`, `select` o componentes de shadcn (`Input`, `Textarea`, `SelectValue`, `CommandInput`…), **salvo que el usuario lo pida explícitamente** para un campo concreto.
- Cada campo lleva un `Label` visible asociado (`htmlFor` / `id`).
- Las ayudas de formato (por ejemplo `01-F001-123` para el analítico) van en un texto de ayuda visible debajo del campo (`FormDescription`), no dentro del input.

---

## 5. Sin emojis

- **PROHIBIDO** usar emojis o emoticones en el código: textos de la interfaz, mensajes de error, respuestas de la API, logs, nombres de variables, datos de semilla, tests y mensajes de commit.
- Para íconos se usa `lucide-react` (incluido con shadcn/ui).

---

## 6. Documentación con Swagger

Toda la API se documenta con `@nestjs/swagger`. La interfaz queda en `/api/docs` y el JSON en `/api/docs-json`.

- Cada controlador: `@ApiTags`.
- Cada endpoint: `@ApiOperation({ summary })` y una respuesta tipada por cada código posible (`@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, `@ApiConflictResponse`).
- Endpoints protegidos: `@ApiCookieAuth()`.
- Parámetros: `@ApiParam` y `@ApiQuery` con tipo y descripción.
- Los DTO se crean desde los esquemas zod de `packages/contracts` con `createZodDto` (`nestjs-zod`), de modo que la validación y el esquema OpenAPI salen de la misma fuente.
- Las respuestas se declaran con `@ZodResponse({ status, description, type })`, que documenta en Swagger y valida la salida contra su esquema. No se devuelven entidades de Prisma directamente.
- Los errores comunes se documentan con `@ApiProtegida(...)` de `shared/http/api-docs.ts`.
- En componentes de cliente de la web, las constantes se importan desde `@conciliacion/contracts/enums` (sin zod) y los tipos con `import type` desde `@conciliacion/contracts`.
- Las descripciones de Swagger van en español.
- Un endpoint sin documentación Swagger completa se considera incompleto.

---

## 7. Sin soluciones temporales

**PROHIBIDO** entregar parches o arreglos provisionales. Se resuelve la causa, no el síntoma. En concreto, no se permite:

- `TODO`, `FIXME`, `HACK` ni código "para después".
- Datos ficticios, mocks o valores de ejemplo en código de producción o en la base de datos real.
- Valores fijos en el código que deberían venir de la base de datos o de la configuración (cuentas, tipos de cambio, usuarios, URLs, credenciales).
- `catch` vacíos o que se tragan el error sin manejarlo.
- `setTimeout` o reintentos para tapar una condición de carrera.
- Desactivar validaciones, guards o tests para que algo "funcione".
- `--force`, `--legacy-peer-deps`, `--accept-data-loss` o equivalentes para saltarse un error.
- Copiar y pegar lógica en vez de reutilizarla.

Si la solución correcta requiere una decisión del usuario o un cambio mayor, se avisa y se pregunta antes de implementar.

---

## 8. Datos

- **PROHIBIDO eliminar información** de la base de datos: los registros se anulan (`estado = ANULADO`) o se desactivan (`activo = false`), y el cambio queda en `auditoria`.
- **PROHIBIDO** `prisma migrate reset`, `prisma db push` contra una base con datos, `DROP`, `TRUNCATE` y `DELETE` masivos.
- Las migraciones se versionan en `apps/api/prisma/migrations` y se aplican con `prisma migrate deploy`.
- Montos con `Decimal` (`NUMERIC(14,2)`) y tipo de cambio con `NUMERIC(10,3)`. **PROHIBIDO** usar `number`/`float` para dinero en la base o en cálculos de la API.
- Documentos de identidad (RUC, DNI) siempre como texto.
- Fechas de operación como `DATE`; marcas de tiempo en UTC y se muestran en `America/Lima`.
- Las operaciones que tocan varias tablas (registro de lote, correlativo, cierre de mes) van en una sola transacción.

---

## 9. Arquitectura

- `apps/web` **no accede a la base de datos**. Solo llama a la API (server actions o rutas).
- Cada módulo de `apps/api/src/modules/<modulo>` tiene las capas `domain`, `application`, `infrastructure` y `presentation`, y expone solo su `index.ts`. **PROHIBIDO** importar capas internas de otro módulo.
- Las reglas de validación de una fila del registro rápido viven en `packages/contracts` y las usan tanto la web como la API.
- Los componentes de shadcn/ui se agregan con su CLI en `apps/web/src/components/ui` y no se editan para lógica de negocio.
- En componentes de cliente solo se usa `import type` desde `packages/contracts`, salvo los esquemas que se necesiten para validar formularios.

---

## 10. Nombres e idioma

- **Archivos y carpetas en inglés**, en `kebab-case` y con los sufijos del framework (`ledger.controller.ts`, `create-movement.dto.ts`, `quick-entry/`).
- **Identificadores, textos de la interfaz, mensajes de error, descripciones de Swagger y documentación en español.**
- Componentes React en `PascalCase`; funciones y variables en `camelCase`; tablas y columnas de la base en `snake_case`.

---

## 11. Git

- Se trabaja en `main` salvo que el usuario pida otra rama.
- Commits **convencionales en español** (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), **uno por archivo**.
- Autor: `jose27luis <18121040@unamad.edu.pe>`.
- **PROHIBIDO** agregar `Co-Authored-By`, `Claude-Session` o cualquier mención a agentes de IA en commits o PR.
- **PROHIBIDO** commitear archivos `.env` o credenciales. Solo se versionan los `.env.example`.
- No se hace `push` sin que el usuario lo pida.

---

## 12. Antes de dar algo por terminado

1. `pnpm -r typecheck` sin errores.
2. `pnpm -r lint` sin errores ni advertencias.
3. `pnpm -r build` correcto.
4. Tests del módulo modificado en verde.
5. Endpoints nuevos visibles y completos en `/api/docs`.
6. Pantallas nuevas revisadas en el navegador, sin `placeholder` y sin emojis.

Si un paso falla, se informa tal cual con su salida; no se marca como terminado.
