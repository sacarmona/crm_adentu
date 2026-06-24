import {
  Playbook,
  PlaybookItem,
  PlaybookItemType,
  Service,
} from "@prisma/client";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";
import { playbookItemLabels } from "@/server/services/playbooks";

type ServiceOption = Pick<Service, "id" | "name" | "isActive">;

export function PlaybookForm({
  action,
  playbook,
  services,
}: {
  action: (formData: FormData) => void | Promise<void>;
  playbook?: Playbook | null;
  services: ServiceOption[];
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField
        defaultValue={playbook?.name}
        label="Nombre"
        name="name"
        required
      />
      <SelectField
        defaultValue={playbook?.serviceId}
        label="Servicio"
        name="serviceId"
        options={services.map((service) => ({
          value: service.id,
          label: `${service.name}${service.isActive ? "" : " (inactivo)"}`,
        }))}
      />
      <TextArea
        defaultValue={playbook?.description}
        label="Descripcion"
        name="description"
      />
      <label className="flex h-10 items-center gap-3 self-end rounded-md border border-slate-300 px-3">
        <input
          className="h-4 w-4"
          defaultChecked={playbook?.isActive ?? true}
          name="isActive"
          type="checkbox"
        />
        <span className="text-sm font-medium">Activo</span>
      </label>
      <div className="self-end">
        <Button type="submit">Guardar playbook</Button>
      </div>
    </form>
  );
}

export function PlaybookItemForm({
  action,
  item,
}: {
  action: (formData: FormData) => void | Promise<void>;
  item?: PlaybookItem | null;
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <SelectField
        defaultValue={item?.type}
        label="Tipo"
        name="type"
        options={Object.values(PlaybookItemType).map((type) => ({
          value: type,
          label: playbookItemLabels[type],
        }))}
        required
      />
      <TextField
        defaultValue={item?.sortOrder ?? 0}
        label="Orden"
        name="sortOrder"
        required
        type="number"
      />
      <TextField
        defaultValue={item?.title}
        label="Titulo"
        name="title"
        required
      />
      <TextArea
        defaultValue={item?.content}
        label="Contenido"
        name="content"
      />
      <div className="md:col-span-2">
        <Button type="submit">Guardar elemento</Button>
      </div>
    </form>
  );
}
