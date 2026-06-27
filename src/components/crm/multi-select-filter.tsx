"use client";

import { useState } from "react";

export function MultiSelectFilter({
  name,
  options,
  defaultValues,
  placeholder,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValues: string[];
  placeholder: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValues);
  const [open, setOpen] = useState(false);

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label ?? placeholder
        : `${selected.length} seleccionados`;

  return (
    <div className="relative">
      <button
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 text-left text-sm"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-slate-400">
          ▾
        </span>
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          {options.map((option) => (
            <label
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
              key={option.value}
            >
              <input
                checked={selected.includes(option.value)}
                name={name}
                onChange={(event) => {
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, option.value]
                      : current.filter((value) => value !== option.value),
                  );
                }}
                type="checkbox"
                value={option.value}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
