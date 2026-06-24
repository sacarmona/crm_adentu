import {
  Company,
  Contact,
  InteractionType,
  Opportunity,
  Service,
  TaskStatus,
  User,
} from "@prisma/client";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";
import { interactionTypeLabels, taskStatusLabels } from "@/lib/labels";

type Option = { id: string; name: string };
type CompanyOption = Pick<Company, "id" | "name">;
type ContactOption = Pick<Contact, "id" | "name">;
type OpportunityOption = Pick<Opportunity, "id" | "name">;
type ServiceOption = Pick<Service, "id" | "name">;
type UserOption = Pick<User, "id" | "name">;

function options(items: Option[]) {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

function enumOptions(
  values: Record<string, string>,
  labels: Record<string, string>,
) {
  return Object.values(values).map((value) => ({
    value,
    label: labels[value] ?? value,
  }));
}

export function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function InteractionForm({
  action,
  companies,
  contacts,
  opportunities,
  services,
  defaults,
  submitLabel = "Registrar interaccion",
}: {
  action: (formData: FormData) => void | Promise<void>;
  companies: CompanyOption[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  services: ServiceOption[];
  defaults?: {
    date?: string;
    type?: InteractionType;
    companyId?: string;
    contactId?: string;
    opportunityId?: string;
    serviceId?: string;
    content?: string;
    nextAction?: string;
    nextActionDate?: string;
  };
  submitLabel?: string;
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField
        defaultValue={defaults?.date ?? localDateTimeValue()}
        label="Fecha y hora"
        name="date"
        required
        type="datetime-local"
      />
      <SelectField
        defaultValue={defaults?.type}
        label="Tipo"
        name="type"
        options={enumOptions(InteractionType, interactionTypeLabels)}
        required
      />
      <SelectField
        defaultValue={defaults?.companyId}
        label="Empresa"
        name="companyId"
        options={options(companies)}
      />
      <SelectField
        defaultValue={defaults?.contactId}
        label="Contacto"
        name="contactId"
        options={options(contacts)}
      />
      <SelectField
        defaultValue={defaults?.opportunityId}
        label="Oportunidad"
        name="opportunityId"
        options={options(opportunities)}
      />
      <SelectField
        defaultValue={defaults?.serviceId}
        label="Servicio"
        name="serviceId"
        options={options(services)}
      />
      <TextArea
        defaultValue={defaults?.content}
        label="Contenido de la interaccion"
        name="content"
      />
      <TextField
        defaultValue={defaults?.nextAction}
        label="Proxima accion"
        name="nextAction"
      />
      <TextField
        defaultValue={defaults?.nextActionDate}
        label="Fecha proxima accion"
        name="nextActionDate"
        type="datetime-local"
      />
      <div className="self-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}

export function TaskForm({
  action,
  companies,
  contacts,
  opportunities,
  services,
  users,
  currentUserId,
  defaults,
}: {
  action: (formData: FormData) => void | Promise<void>;
  companies: CompanyOption[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  services: ServiceOption[];
  users: UserOption[];
  currentUserId?: string;
  defaults?: {
    companyId?: string;
    contactId?: string;
    opportunityId?: string;
  };
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField label="Titulo" name="title" required />
      <SelectField
        defaultValue={TaskStatus.PENDING}
        label="Estado"
        name="status"
        options={enumOptions(TaskStatus, taskStatusLabels)}
        required
      />
      <TextField label="Fecha limite" name="dueDate" type="datetime-local" />
      <SelectField
        defaultValue={currentUserId}
        label="Asignada a"
        name="assignedToId"
        options={options(users)}
      />
      <SelectField
        defaultValue={defaults?.companyId}
        label="Empresa"
        name="companyId"
        options={options(companies)}
      />
      <SelectField
        defaultValue={defaults?.contactId}
        label="Contacto"
        name="contactId"
        options={options(contacts)}
      />
      <SelectField
        defaultValue={defaults?.opportunityId}
        label="Oportunidad"
        name="opportunityId"
        options={options(opportunities)}
      />
      <SelectField
        label="Servicio"
        name="serviceId"
        options={options(services)}
      />
      <TextArea label="Descripcion" name="description" />
      <TextArea label="Resultado" name="result" />
      <div className="md:col-span-2">
        <Button type="submit">Guardar tarea</Button>
      </div>
    </form>
  );
}
