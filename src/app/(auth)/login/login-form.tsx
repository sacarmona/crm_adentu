"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
      callbackUrl,
    });

    setIsPending(false);

    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-medium text-blue-100" htmlFor="email">
          Correo
        </label>
        <input
          autoComplete="email"
          className="mt-2 h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-blue-400 focus:bg-white/15"
          defaultValue="admin.demo@adentu.cl"
          id="email"
          name="email"
          type="email"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-blue-100" htmlFor="password">
          Contraseña
        </label>
        <input
          autoComplete="current-password"
          className="mt-2 h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-blue-400 focus:bg-white/15"
          defaultValue="AdentuDemo2026!"
          id="password"
          name="password"
          type="password"
        />
      </div>
      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-500/20 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      <button
        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 text-sm font-semibold text-white transition-colors hover:bg-blue-400 disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Ingresar
      </button>
    </form>
  );
}
