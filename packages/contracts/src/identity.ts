import { z } from "zod";
import { ROLES } from "./enums";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Escribe un correo válido."))
  .describe("Correo del usuario");

const password = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(72, "La contraseña no puede tener más de 72 caracteres.")
  .describe("Contraseña, de 10 a 72 caracteres");

const nombre = z.string().trim().min(3, "Escribe el nombre completo.").max(120).describe("Nombre completo");

export const rolSchema = z.enum(ROLES).describe("Rol del usuario");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Escribe tu contraseña.").describe("Contraseña"),
});
export type LoginEntrada = z.infer<typeof loginSchema>;

export const usuarioSesionSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  rol: rolSchema,
});
export type UsuarioSesion = z.infer<typeof usuarioSesionSchema>;

export const loginRespuestaSchema = z.object({
  token: z.string().describe("JWT de la sesión, también enviado en la cookie"),
  expiraEn: z.iso.datetime().describe("Fecha y hora de expiración en ISO 8601"),
  usuario: usuarioSesionSchema,
});
export type LoginRespuesta = z.infer<typeof loginRespuestaSchema>;

export const usuarioSchema = z.object({
  id: z.uuid(),
  nombre: z.string(),
  email: z.string(),
  rol: rolSchema,
  activo: z.boolean(),
  creadoEn: z.iso.datetime(),
});
export type Usuario = z.infer<typeof usuarioSchema>;

export const crearUsuarioSchema = z.object({
  nombre,
  email,
  rol: rolSchema,
  password,
});
export type CrearUsuarioEntrada = z.infer<typeof crearUsuarioSchema>;

export const editarUsuarioSchema = z.object({
  nombre,
  rol: rolSchema,
});
export type EditarUsuarioEntrada = z.infer<typeof editarUsuarioSchema>;

export const cambiarPasswordSchema = z.object({
  password,
});
export type CambiarPasswordEntrada = z.infer<typeof cambiarPasswordSchema>;
