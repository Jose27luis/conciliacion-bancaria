import type { Metadata } from "next";
import { ETIQUETAS_ROL, usuarioSchema } from "@conciliacion/contracts";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cambiarActivacionUsuario } from "@/modules/identity/actions";
import { PasswordDialog } from "@/modules/identity/ui/password-dialog";
import { UserDialog } from "@/modules/identity/ui/user-dialog";
import { api } from "@/shared/api/server-client";
import { exigirSesion } from "@/shared/auth/session";
import { ActivationButton } from "@/shared/ui/activation-button";
import { PageHeader } from "@/shared/ui/page-header";
import { StatusBadge } from "@/shared/ui/status-badge";

export const metadata: Metadata = { title: "Usuarios" };

export default async function UsersPage() {
  const sesion = await exigirSesion(["ADMIN"]);
  const usuarios = await api("/users", usuarioSchema.array());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader seccion="Configuración" titulo="Usuarios" descripcion="Quién puede ingresar al sistema y con qué rol." acciones={<UserDialog />} />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id}>
                <TableCell className="font-medium text-white">{usuario.nombre}</TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>{ETIQUETAS_ROL[usuario.rol]}</TableCell>
                <TableCell>
                  <StatusBadge activo={usuario.activo} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <UserDialog usuario={usuario} />
                    <PasswordDialog usuario={usuario} />
                    {usuario.id === sesion.id ? null : (
                      <ActivationButton accion={cambiarActivacionUsuario.bind(null, usuario.id)} activo={usuario.activo} nombre={usuario.nombre} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
