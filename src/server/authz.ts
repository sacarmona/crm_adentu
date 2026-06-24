import { auth } from "@/auth";
import {
  canAdminister,
  canWrite,
} from "@/server/authorization-policy";

export { canAdminister, canWrite };

export async function requireWriter(message = "No tienes permisos para modificar datos.") {
  const session = await auth();
  if (!session?.user || !canWrite(session.user.role)) {
    throw new Error(message);
  }
  return session.user;
}

export async function requireAdmin(message = "Solo ADMIN puede realizar esta accion.") {
  const session = await auth();
  if (!session?.user || !canAdminister(session.user.role)) {
    throw new Error(message);
  }
  return session.user;
}
