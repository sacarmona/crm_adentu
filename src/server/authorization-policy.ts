import { UserRole } from "@prisma/client";

export function canWrite(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.COMERCIAL;
}

export function canAdminister(role: UserRole) {
  return role === UserRole.ADMIN;
}
