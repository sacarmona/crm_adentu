import Image from "next/image";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10 text-slate-950">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <Image
            alt="ADENTU"
            height={56}
            priority
            src="/brand/adentu-logo.png"
            style={{ height: "56px", width: "auto" }}
            width={200}
          />
          <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-500">
            Ingenieria SpA
          </p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-normal">
            Acceso al CRM comercial
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Gestiona empresas, contactos, oportunidades, interacciones y tareas
            desde un entorno protegido por roles.
          </p>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Iniciar sesion</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Usa las credenciales demo creadas por el seed para validar el flujo.
          </p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
