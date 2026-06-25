"use client";

import { useState, useTransition } from "react";

export function InlineDateForm({
  action,
  name,
  defaultValue,
}: {
  action: (formData: FormData) => void | Promise<void>;
  name: string;
  defaultValue: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const [trackedDefault, setTrackedDefault] = useState(defaultValue);

  if (defaultValue !== trackedDefault) {
    setTrackedDefault(defaultValue);
    setValue(defaultValue);
  }

  return (
    <form action={(formData) => startTransition(() => action(formData))}>
      <input
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs disabled:opacity-60"
        disabled={isPending}
        name={name}
        onChange={(event) => {
          setValue(event.currentTarget.value);
          event.currentTarget.form?.requestSubmit();
        }}
        type="datetime-local"
        value={value}
      />
    </form>
  );
}
