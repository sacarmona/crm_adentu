"use client";

import { Currency } from "@prisma/client";
import { useState } from "react";

import { currencyLabels } from "@/lib/labels";

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const inputClass =
  "mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950";

export function OpportunityAmountFields({
  defaultCurrency,
  defaultPrice,
  defaultMonths,
  defaultExchangeRate,
  defaultQuantity,
}: {
  defaultCurrency?: Currency | null;
  defaultPrice?: string | null;
  defaultMonths?: number | null;
  defaultExchangeRate?: string | null;
  defaultQuantity?: string | null;
}) {
  const [currency, setCurrency] = useState<string>(defaultCurrency ?? "CLP");
  const [price, setPrice] = useState<string>(defaultPrice ?? "");
  const [months, setMonths] = useState<string>(
    defaultMonths != null ? String(defaultMonths) : "",
  );
  const [exchangeRate, setExchangeRate] = useState<string>(defaultExchangeRate ?? "1");

  const quantity = Number(defaultQuantity) || 1;
  const monthlyClp = (Number(price) || 0) * (Number(exchangeRate) || 0) * quantity;
  const totalClp = monthlyClp * (Number(months) || 0);
  const isForeign = currency !== "CLP";

  return (
    <>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Moneda</span>
        <select
          className={inputClass}
          name="currency"
          onChange={(event) => setCurrency(event.currentTarget.value)}
          required
          value={currency}
        >
          {Object.values(Currency).map((value) => (
            <option key={value} value={value}>
              {currencyLabels[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Monto mensual</span>
        <input
          className={inputClass}
          name="price"
          onChange={(event) => setPrice(event.currentTarget.value)}
          required
          step="any"
          type="number"
          value={price}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Meses (periodo)</span>
        <input
          className={inputClass}
          name="months"
          onChange={(event) => setMonths(event.currentTarget.value)}
          required
          step="1"
          type="number"
          value={months}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Tipo de cambio</span>
        <input
          className={inputClass}
          name="exchangeRate"
          onChange={(event) => setExchangeRate(event.currentTarget.value)}
          step="any"
          type="number"
          value={exchangeRate}
        />
      </label>

      <input defaultValue={String(quantity)} name="quantity" type="hidden" />

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm md:col-span-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-slate-600">
            Monto mensual{isForeign ? " (CLP)" : ""}:{" "}
            <strong className="text-slate-900">{clpFormatter.format(monthlyClp)}</strong>
          </span>
          <span className="text-slate-600">
            Total ({Number(months) || 0} {Number(months) === 1 ? "mes" : "meses"}):{" "}
            <strong className="text-slate-900">{clpFormatter.format(totalClp)}</strong>
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          El monto total se calcula como Monto mensual × Meses
          {isForeign ? " (convertido a CLP por el tipo de cambio)" : ""}.
        </p>
      </div>
    </>
  );
}
