type Option = {
  value: string;
  label: string;
};

export function TextField({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  readOnly = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
        defaultValue={defaultValue ?? ""}
        name={name}
        readOnly={readOnly}
        required={required}
        step={type === "number" ? "any" : undefined}
        type={type}
      />
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue,
  minLength,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? " *" : ""}
      </span>
      <textarea
        className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
        defaultValue={defaultValue ?? ""}
        minLength={minLength}
        name={name}
        required={required}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  placeholder = "Seleccionar",
  required = false,
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
        defaultValue={defaultValue ?? ""}
        name={name}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
