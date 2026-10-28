import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const HEADERS = ["Contacto", "Empresa", "Medio", "Email", "Telefono", "Ultimo contacto", "Notas"];

const EXAMPLE_ROWS = [
  ["Juan Perez", "Minera Ejemplo", "WhatsApp", "juan@ejemplo.cl", "+56 9 1234 5678", "2026-10-28", "Interesado en inspeccion con dron"],
  ["Maria Soto", "Energia Solar SpA", "Telefono", "maria@solar.cl", "+56 2 2345 6789", "27-10-2026", "Solicita cotizacion termografia"],
];

function csvField(value: string) {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET() {
  const lines = [HEADERS, ...EXAMPLE_ROWS].map((row) => row.map(csvField).join(","));
  // BOM UTF-8 para que Excel muestre correctamente los acentos.
  const body = "﻿" + lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-leads.csv"',
      "Cache-Control": "no-store",
    },
  });
}
