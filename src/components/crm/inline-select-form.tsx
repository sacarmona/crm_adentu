"use client";

import { useState, useTransition } from "react";

export function InlineSelectForm({
  action,
  name,
  defaultValue,
  options,
  placeholder,
  includeBlankOption = true,
}: {
  action: (formData: FormData) => void | Promise<void>;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  includeBlankOption?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const [trackedDefault, setTrackedDefault] = useState(defaultValue);

  if (defaultValue !== trackedDefault) {
    setTrackedDefault(defaultValue);
    setValue(defaultValue);
  }

  return (
    <form
      action={(formData) => startTransition(() => action(formData))}
    >
      <select
        className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs disabled:opacity-60"
        disabled={isPending}
        name={name}
        onChange={(event) => {
          setValue(event.currentTarget.value);
          event.currentTarget.form?.requestSubmit();
        }}
        value={value}
      >
        {includeBlankOption ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </form>
  );
}
