import { ContactMedium, Lead, LeadStatus, User } from "@prisma/client";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";
import { contactMediumLabels, leadStatusLabels } from "@/lib/labels";

type UserOption = Pick<User, "id" | "name">;

function dateValue(value?: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function LeadForm({
  action,
  lead,
  users,
}: {
  action: (formData: FormData) => void | Promise<void>;
  lead?: Lead | null;
  users: UserOption[];
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField defaultValue={lead?.contactName} label="Nombre de contacto" name="contactName" required />
      <TextField defaultValue={lead?.companyName} label="Empresa" name="companyName" />
      <TextField defaultValue={lead?.email} label="Email" name="email" type="email" />
      <TextField defaultValue={lead?.phone} label="Telefono" name="phone" />
      <SelectField
        defaultValue={lead?.medium ?? ContactMedium.TELEFONO}
        label="Medio de contacto"
        name="medium"
        options={Object.values(ContactMedium).map((value) => ({
          value,
          label: contactMediumLabels[value],
        }))}
        required
      />
      <SelectField
        defaultValue={lead?.status ?? LeadStatus.NUEVO}
        label="Estado"
        name="status"
        options={Object.values(LeadStatus).map((value) => ({
          value,
          label: leadStatusLabels[value],
        }))}
        required
      />
      <TextField
        defaultValue={dateValue(lead?.lastContactAt)}
        label="Fecha del ultimo contacto"
        name="lastContactAt"
        type="date"
      />
      <SelectField
        defaultValue={lead?.responsibleId}
        label="Responsable"
        name="responsibleId"
        options={users.map((user) => ({ value: user.id, label: user.name }))}
        placeholder="Sin responsable"
      />
      <TextArea defaultValue={lead?.notes} label="Notas" name="notes" />
      <div className="md:col-span-2">
        <Button type="submit">Guardar lead</Button>
      </div>
    </form>
  );
}
