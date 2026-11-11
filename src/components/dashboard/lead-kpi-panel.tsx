import Link from "next/link";

import { formatDate } from "@/lib/format";
import {
  KPI_GREEN_AT,
  KPI_YELLOW_AT,
  MIN_SAMPLE,
  STATUS_RULES,
  addDays,
  kpiLight,
  type Light,
  type StatusReading,
  type WeekResult,
} from "@/server/services/lead-kpi";

const LIGHT_STYLES: Record<Light, { dot: string; bar: string; chip: string; label: string }> = {
  green: { dot: "bg-emerald-500", bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "En meta" },
  yellow: { dot: "bg-amber-400", bar: "bg-amber-400", chip: "bg-amber-50 text-amber-700 border-amber-200", label: "En riesgo" },
  red: { dot: "bg-rose-500", bar: "bg-rose-500", chip: "bg-rose-50 text-rose-700 border-rose-200", label: "Bajo la meta" },
  neutral: { dot: "bg-slate-300", bar: "bg-slate-300", chip: "bg-slate-50 text-slate-500 border-slate-200", label: "Semana iniciando" },
};

const shortDate = (date: Date) => formatDate(date).slice(0, 5);

// Las barras ocupan el 78% del alto para dejar lugar a la etiqueta; las lineas de meta usan la misma escala.
const BAR_SCALE = 0.78;

export function LeadKpiPanel({
  goal,
  respondedGoal,
  weeks,
  expected,
  respondedExpected,
  periodLabel,
  periodTotal,
  periodNuevos,
  periodConvertidos,
  readings,
}: {
  goal: number;
  respondedGoal: number;
  weeks: WeekResult[];
  expected: number;
  respondedExpected: number;
  periodLabel: string;
  periodTotal: number;
  periodNuevos: number;
  periodConvertidos: number;
  readings: StatusReading[];
}) {
  const current = weeks[weeks.length - 1];
  const light = kpiLight(current.unique, expected);
  const styles = LIGHT_STYLES[light];
  const respondedLight = kpiLight(current.responded, respondedExpected);
  const respondedStyles = LIGHT_STYLES[respondedLight];
  const duplicates = current.gross - current.unique;
  const progressPct = Math.min(100, Math.round((current.unique / goal) * 100));
  const respondedProgressPct = Math.min(100, Math.round((current.responded / respondedGoal) * 100));
  const respondedPct = current.unique === 0 ? 0 : Math.round((current.responded / current.unique) * 100);
  const scaleMax = Math.max(goal, ...weeks.map((week) => week.unique), 1);
  // Semanas anteriores a la primera con leads: aun no se registraban, no se juzgan como "bajo la meta".
  const firstActive = weeks.findIndex((week) => week.gross > 0);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Meta semanal de leads</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Leads nuevos <strong>únicos</strong> (empresa + servicio) · meta {goal} captados y {respondedGoal} con
            respuesta por semana
          </p>
        </div>
        <Link className="text-xs font-medium hover:underline" href="/leads">
          Ver leads
        </Link>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        {/* Semana en curso */}
        <div className="rounded-md border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">
              Semana del {shortDate(current.start)} al {shortDate(addDays(current.start, 6))}
            </p>
            <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles.chip}`}>
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              {styles.label}
            </span>
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">Captados (únicos)</p>
          <p className="text-4xl font-bold tabular-nums text-slate-900">
            {current.unique}
            <span className="text-lg font-medium text-slate-400"> / {goal}</span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${progressPct}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div>
              <dt className="text-slate-400">Esperado a hoy</dt>
              <dd className="font-semibold tabular-nums">{expected}</dd>
            </div>
            <div>
              <dt className="text-slate-400">Cumplimiento de la meta</dt>
              <dd className="font-semibold tabular-nums">{progressPct}%</dd>
            </div>
          </dl>

          <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Con respuesta (únicos)</p>
              <span
                className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${respondedStyles.chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${respondedStyles.dot}`} />
                {respondedStyles.label}
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">
              {current.responded}
              <span className="text-base font-medium text-slate-400"> / {respondedGoal}</span>
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${respondedStyles.bar}`}
                style={{ width: `${respondedProgressPct}%` }}
              />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <dt className="text-slate-400">Esperado a hoy</dt>
                <dd className="font-semibold tabular-nums">{respondedExpected}</dd>
              </div>
              <div>
                <dt className="text-slate-400">De los captados</dt>
                <dd className="font-semibold tabular-nums">{respondedPct}%</dd>
              </div>
            </dl>
            <p className="mt-1.5 text-[11px] text-slate-400">Contactados, calificados o convertidos.</p>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {current.gross} lead{current.gross !== 1 ? "s" : ""} ingresado{current.gross !== 1 ? "s" : ""}
            {duplicates > 0
              ? ` → ${current.unique} únicos (${duplicates} repetido${duplicates !== 1 ? "s" : ""} por empresa y servicio)`
              : ""}
            .
          </p>
        </div>

        {/* Tendencia */}
        <div>
          <p className="text-xs font-medium text-slate-500">
            Últimas {weeks.length} semanas · captados <span className="text-slate-400">· con respuesta</span>
          </p>
          <p className="mt-0.5 flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-slate-400/40" /> captados (color = su semáforo)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-slate-500" /> con respuesta (color = su semáforo)
            </span>
          </p>
          <div className="relative mt-3 flex h-32 items-end gap-2 border-b border-slate-200">
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-400"
              style={{ bottom: `${(goal / scaleMax) * BAR_SCALE * 100}%` }}
            >
              <span className="absolute -top-4 right-0 text-[10px] text-slate-400">meta {goal}</span>
            </div>
            <div
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-500"
              style={{ bottom: `${(respondedGoal / scaleMax) * BAR_SCALE * 100}%` }}
            >
              <span className="absolute -top-4 right-0 text-[10px] text-slate-500">resp. {respondedGoal}</span>
            </div>
            {weeks.map((week, index) => {
              const isCurrent = index === weeks.length - 1;
              const beforeStart = !isCurrent && (firstActive === -1 || index < firstActive);
              const barLight: Light = beforeStart ? "neutral" : isCurrent ? light : kpiLight(week.unique, goal);
              const fillLight: Light = beforeStart
                ? "neutral"
                : isCurrent
                  ? respondedLight
                  : kpiLight(week.responded, respondedGoal);
              return (
                <div key={week.start.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                    {week.unique}
                    {!beforeStart && week.unique > 0 ? (
                      <span className="font-normal text-slate-400"> · {week.responded}</span>
                    ) : null}
                  </span>
                  <div
                    className="relative w-full overflow-hidden rounded-t"
                    style={{ height: `${Math.max(2, (week.unique / scaleMax) * 100 * BAR_SCALE)}%` }}
                    title={
                      beforeStart
                        ? `Semana del ${shortDate(week.start)}: sin leads registrados (aún no se usaba el módulo)`
                        : `Semana del ${shortDate(week.start)}: ${week.unique} captados (${week.gross} ingresados) · ${week.responded} con respuesta`
                    }
                  >
                    {/* Barra clara = captados (semáforo de captación); sólida = con respuesta (su propio semáforo) */}
                    <div className={`absolute inset-0 ${LIGHT_STYLES[barLight].bar} ${isCurrent ? "opacity-40" : "opacity-35"}`} />
                    <div
                      className={`absolute inset-x-0 bottom-0 ${LIGHT_STYLES[fillLight].bar}`}
                      style={{ height: `${week.unique === 0 ? 0 : (week.responded / week.unique) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex gap-2">
            {weeks.map((week) => (
              <span key={week.start.toISOString()} className="flex-1 text-center text-[10px] text-slate-400">
                {shortDate(week.start)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        Semáforo (captados y con respuesta, cada uno contra su meta): <span className="font-medium text-emerald-600">verde</span> ≥{" "}
        {Math.round(KPI_GREEN_AT * 100)}% de lo esperado a la fecha ·{" "}
        <span className="font-medium text-amber-600">amarillo</span> {Math.round(KPI_YELLOW_AT * 100)}–
        {Math.round(KPI_GREEN_AT * 100) - 1}% · <span className="font-medium text-rose-600">rojo</span> &lt;{" "}
        {Math.round(KPI_YELLOW_AT * 100)}%. Esperado = meta × días hábiles terminados ÷ 5 (captados {goal}, con
        respuesta {respondedGoal}); el lunes aún no se espera nada. Las semanas cerradas se juzgan contra la meta
        completa. Los leads se cuentan en la semana en que se crearon: un lead que responde después sube el
        «con respuesta» de su semana de origen.
      </p>

      {/* Lectura de estados */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Lectura de estados</h3>
          <p className="text-xs text-slate-500">
            Leads creados en el período ({periodLabel}): <strong>{periodTotal}</strong> · {periodNuevos} nuevo
            {periodNuevos !== 1 ? "s" : ""} sin gestionar · {periodConvertidos} convertido
            {periodConvertidos !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {readings.map((reading) => {
            const rule = STATUS_RULES[reading.key];
            const s = LIGHT_STYLES[reading.light];
            return (
              <div key={reading.key} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">
                    {reading.label}
                    {reading.key === "calificados" ? " *" : ""}
                  </p>
                  <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} title={s.label} />
                </div>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">
                  {reading.count}
                  <span className="ml-1.5 text-sm font-medium text-slate-400">{reading.percent}%</span>
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  ideal {rule.goodWhen === "low" ? "≤" : "≥"} {rule.green}%
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          * Calificados incluye los ya convertidos a oportunidad. Porcentajes sobre los leads del período; con menos
          de {MIN_SAMPLE} leads no se emite semáforo. Verde = dentro del ideal; amarillo = cerca; rojo = lejos. Umbrales
          propuestos, ajustables en <code>src/server/services/lead-kpi.ts</code>.
        </p>
      </div>
    </section>
  );
}
