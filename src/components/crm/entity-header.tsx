import Link from "next/link";

import { Button } from "@/components/ui/button";

export function EntityHeader({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {actionHref && actionLabel ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

