import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM ADENTU",
  description: "CRM comercial para ADENTU Ingenieria SpA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
