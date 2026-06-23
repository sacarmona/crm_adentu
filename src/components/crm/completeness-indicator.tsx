import { cn } from "@/lib/utils";

export function CompletenessIndicator({
  score,
  showLabel = false,
}: {
  score: number;
  showLabel?: boolean;
}) {
  const tone =
    score >= 80
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : score >= 50
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

  return (
    <span
      className={cn(
        "inline-flex min-w-14 items-center justify-center rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset",
        tone,
      )}
      title={`Completitud del registro: ${score}%`}
    >
      {showLabel ? `Completitud ${score}%` : `${score}%`}
    </span>
  );
}
