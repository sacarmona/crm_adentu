export function emailSyncErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "No fue posible completar la sincronizacion.";
  }

  const message = error.message;
  if (
    message.includes("Transaction API error") ||
    message.includes("prisma.") ||
    message.includes("Prisma")
  ) {
    return "No fue posible guardar los mensajes sincronizados.";
  }

  return message.slice(0, 500);
}
