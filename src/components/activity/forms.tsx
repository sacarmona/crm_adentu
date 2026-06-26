import {
  Company,
  Contact,
  Opportunity,
  Service,
  TaskStatus,
  User,
} from "@prisma/client";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";
import { taskStatusLabels } from "@/lib/labels";

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
