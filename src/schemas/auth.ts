import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo valido.").toLowerCase(),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
});

export type LoginInput = z.infer<typeof loginSchema>;

