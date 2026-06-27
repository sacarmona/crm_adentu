import Link from "next/link";

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const buildHref = (targetPage: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        for (const item of value) qs.append(key, item);
      } else if (value) {
        qs.set(key, value);
      }
    }
    qs.set("page", String(targetPage));
    return `${basePath}?${qs.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <p>{total === 0 ? "Sin resultados" : `${from}-${to} de ${total}`}</p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            href={buildHref(page - 1)}
          >
            Anterior
          </Link>
        ) : (
          <span className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400">
            Anterior
          </span>
        )}
        <span className="px-1 text-xs text-slate-500">
          Pagina {page} de {totalPages}
        </span>
        {hasNext ? (
          <Link
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            href={buildHref(page + 1)}
          >
            Siguiente
          </Link>
        ) : (
          <span className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400">
            Siguiente
          </span>
        )}
      </div>
    </div>
  );
}
