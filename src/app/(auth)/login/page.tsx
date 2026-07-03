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
    <main className="relative min-h-screen overflow-hidden">
      {/* Background image */}
      <Image
        alt=""
        className="object-cover object-center"
        fill
        priority
        src="/brand/login-bg.png"
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-[#050e1f]/60" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-end px-6 py-10 sm:px-16">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <Image
              alt="ADENTU"
              height={48}
              priority
              src="/brand/adentu-logo.png"
              style={{ height: "48px", width: "auto", filter: "brightness(0) invert(1)" }}
              width={180}
            />
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
            <h1 className="text-2xl font-semibold text-white">Iniciar sesión</h1>
            <p className="mt-1.5 text-sm text-blue-200/80">
              CRM Comercial · Acceso protegido por roles
            </p>
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
