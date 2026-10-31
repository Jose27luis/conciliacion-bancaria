# Reglas para Claude Code

Las reglas del proyecto están en `AGENTS.md` y son obligatorias. Se importan aquí para que Claude Code las cargue en cada sesión:

@AGENTS.md

## Resumen de prohibiciones

- **PROHIBIDO** `any`, `@ts-ignore`, `@ts-expect-error` y `eslint-disable`.
- **PROHIBIDO** escribir comentarios en el código.
- **PROHIBIDO** usar `placeholder` en los inputs, salvo que el usuario lo pida.
- **PROHIBIDO** usar emojis en el código.
- **PROHIBIDO** entregar soluciones temporales o parches.
- **PROHIBIDO** eliminar información de la base de datos.
- **PROHIBIDO** incluir `Co-Authored-By` o `Claude-Session` en los commits.
- **OBLIGATORIO** documentar cada endpoint con Swagger.
