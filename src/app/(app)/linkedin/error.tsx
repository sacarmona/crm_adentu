"use client";

import { Button } from "@/components/ui/button";

export default function LinkedInError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3 rounded-md border border-rose-200 bg-rose-50 p-5">
      <h2 className="font-semibold text-rose-900">
        No se pudo registrar la captura
      </h2>
      <p className="text-sm text-rose-800">
        {error.message || "Revisa los datos ingresados e intenta nuevamente."}
      </p>
      <Button onClick={reset} size="sm" variant="outline">
        Reintentar
      </Button>
    </div>
  );
}
