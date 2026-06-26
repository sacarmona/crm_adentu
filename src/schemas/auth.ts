import { UserRole } from "@prisma/client";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo valido.").toLowerCase(),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio."),
  email: z.string().email("Ingresa un correo valido.").toLowerCase(),
  role: z.nativeEnum(UserRole),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
  password: z
    .string()
    .min(12, "La contrasena debe tener al menos 12 caracteres."),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export const updateUserPhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const resetUserPasswordSchema = z.object({
  password: z
    .string()
    .min(12, "La contrasena debe tener al menos 12 caracteres."),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

