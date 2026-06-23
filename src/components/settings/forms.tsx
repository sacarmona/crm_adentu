import { DictionaryValue, Service } from "@prisma/client";

import { TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";

function ActiveField({
  defaultChecked,
}: {
  defaultChecked: boolean;
}) {
  return (
    <label className="flex h-10 items-center gap-3 self-end rounded-md border border-slate-300 px-3">
      <input
        className="h-4 w-4"
        defaultChecked={defaultChecked}
        name="isActive"
        type="checkbox"
      />
      <span className="text-sm font-medium text-slate-700">Activo</span>
    </label>
  );
}

export function ServiceForm({
  action,
  service,
}: {
  action: (formData: FormData) => void | Promise<void>;
  service?: Service | null;
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField
        defaultValue={service?.name}
        label="Nombre"
        name="name"
        required
      />
      <TextField
        defaultValue={service?.sortOrder ?? 0}
        label="Orden"
        name="sortOrder"
        required
        type="number"
      />
      <TextArea
        defaultValue={service?.description}
        label="Descripcion"
        name="description"
      />
      <ActiveField defaultChecked={service?.isActive ?? true} />
      <div className="self-end">
        <Button type="submit">Guardar servicio</Button>
      </div>
    </form>
  );
}

export function DictionaryValueForm({
  action,
  value,
  defaultType,
}: {
  action: (formData: FormData) => void | Promise<void>;
  value?: DictionaryValue | null;
  defaultType?: string;
}) {
  const editing = Boolean(value);

  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField
        defaultValue={value?.type ?? defaultType}
        label="Tipo"
        name="type"
        readOnly={editing}
        required
      />
      <TextField
        defaultValue={value?.key}
        label="Clave estable"
        name="key"
        readOnly={editing}
        required
      />
      {editing ? (
        <>
          <p className="text-xs text-slate-500 md:col-span-2">
            Tipo y clave son identificadores historicos y no se modifican.
          </p>
        </>
      ) : null}
      <TextField
        defaultValue={value?.label}
        label="Etiqueta visible"
        name="label"
        required
      />
      <TextField
        defaultValue={value?.sortOrder ?? 0}
        label="Orden"
        name="sortOrder"
        required
        type="number"
      />
      <TextArea
        defaultValue={value?.description}
        label="Descripcion"
        name="description"
      />
      <ActiveField defaultChecked={value?.isActive ?? true} />
      <div className="self-end">
        <Button type="submit">Guardar valor</Button>
      </div>
    </form>
  );
}
