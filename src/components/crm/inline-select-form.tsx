"use client";

import { useTransition } from "react";

export function InlineSelectForm({
  action,
  name,
  defaultValue,
  options,
  placeholder,
}: {
  action: (formData: FormData) => void | Promise<void>;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
    >
      <select
        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs disabled:opacity-60"
        defaultValue={defaultValue}
        disabled={isPending}
        name={name}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
