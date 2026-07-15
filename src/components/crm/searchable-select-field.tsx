"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Option = {
  value: string;
  label: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function SearchableSelectField({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
  placeholder = "Seleccionar",
  searchPlaceholder = "Buscar...",
  emptyLabel = "Sin resultados",
  className = "",
  labelClassName = "text-sm font-medium text-slate-700",
  controlClassName = "mt-2 h-10 text-sm",
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string | null;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  className?: string;
  labelClassName?: string;
  controlClassName?: string;
}) {
  const wrapperRef = useRef<HTMLLabelElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedValue = value ?? internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);

  const filteredOptions = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return options;
    return options.filter((option) => normalize(option.label).includes(needle));
  }, [options, query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function selectValue(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
    setQuery("");
  }

  return (
    <label className={`relative block ${className}`} ref={wrapperRef}>
      <span className={labelClassName}>{label}</span>
      <input name={name} type="hidden" value={selectedValue} />
      <button
        aria-expanded={open}
        className={`${controlClassName} flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 outline-none transition focus:border-slate-950`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={selectedOption ? "truncate text-slate-950" : "truncate text-slate-500"}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-1 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex h-9 items-center gap-2 rounded-md border border-slate-300 px-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <input
              autoFocus
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label="Limpiar busqueda"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setQuery("")}
                type="button"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="mt-2 max-h-56 overflow-auto">
            <button
              className={`block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100 ${
                selectedValue === "" ? "bg-slate-100 text-slate-950" : "text-slate-700"
              }`}
              onClick={() => selectValue("")}
              type="button"
            >
              {placeholder}
            </button>
            {filteredOptions.map((option) => (
              <button
                className={`block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-100 ${
                  selectedValue === option.value ? "bg-slate-100 text-slate-950" : "text-slate-700"
                }`}
                key={option.value}
                onClick={() => selectValue(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-2 text-sm text-slate-500">{emptyLabel}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </label>
  );
}
