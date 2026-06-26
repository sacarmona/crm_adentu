import { DictionaryValue, Service, UserRole } from "@prisma/client";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";
import { userRoleLabels } from "@/lib/labels";

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

export function UserForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField label="Nombre" name="name" required />
      <TextField label="Correo" name="email" required type="email" />
      <SelectField
        defaultValue={UserRole.COMERCIAL}
        label="Rol"
        name="role"
        options={Object.values(UserRole).map((role) => ({
          value: role,
          label: userRoleLabels[role],
        }))}
        required
      />
      <TextField
        label="Telefono (opcional, para reconocer sus mensajes de WhatsApp)"
        name="phone"
      />
      <TextField
        label="Contrasena inicial"
        name="password"
        required
        type="password"
      />
      <div className="md:col-span-2">
        <Button type="submit">Crear usuario</Button>
      </div>
    </form>
  );
}

export function UserPhoneForm({
  action,
  phone,
}: {
  action: (formData: FormData) => void | Promise<void>;
  phone: string | null;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <input
        className="h-9 rounded-md border border-slate-300 px-2 text-xs"
        defaultValue={phone ?? ""}
        name="phone"
        placeholder="+56912345678"
      />
      <button className="text-xs font-medium hover:underline" type="submit">
        Guardar
      </button>
    </form>
  );
}

export function UserRoleForm({
  action,
  role,
}: {
  action: (formData: FormData) => void | Promise<void>;
  role: UserRole;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <select
        className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
        defaultValue={role}
        name="role"
      >
        {Object.values(UserRole).map((value) => (
          <option key={value} value={value}>
            {userRoleLabels[value]}
          </option>
        ))}
      </select>
      <button className="text-xs font-medium hover:underline" type="submit">
        Guardar
      </button>
    </form>
  );
}

export function ResetPasswordForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="flex items-center gap-2">
      <input
        className="h-9 rounded-md border border-slate-300 px-2 text-xs"
        minLength={12}
        name="password"
        placeholder="Nueva contrasena"
        required
        type="password"
      />
      <button className="text-xs font-medium hover:underline" type="submit">
        Restablecer
      </button>
    </form>
  );
}
