import { Company, Contact, Opportunity, Service } from "@prisma/client";
import { Share2 } from "lucide-react";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };
type CompanyOption = Pick<Company, "id" | "name">;
type ContactOption = Pick<Contact, "id" | "name">;
type OpportunityOption = Pick<Opportunity, "id" | "name">;
type ServiceOption = Pick<Service, "id" | "name">;

function options(items: Option[]) {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function LinkedInCaptureForm({
  action,
  companies,
  contacts,
  opportunities,
  services,
}: {
  action: (formData: FormData) => void | Promise<void>;
  companies: CompanyOption[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  services: ServiceOption[];
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField
        defaultValue={localDateTimeValue()}
        label="Fecha y hora"
        name="date"
        required
        type="datetime-local"
      />
      <TextField
        label="URL de LinkedIn"
        name="sourceUrl"
        required
        type="url"
      />
      <TextField label="Persona" name="personName" />
      <TextField label="Organizacion mencionada" name="organizationName" />
      <SelectField
        label="Empresa CRM"
        name="companyId"
        options={options(companies)}
      />
      <SelectField
        label="Contacto CRM"
        name="contactId"
        options={options(contacts)}
      />
      <SelectField
        label="Oportunidad CRM"
        name="opportunityId"
        options={options(opportunities)}
      />
      <SelectField
        label="Servicio"
        name="serviceId"
        options={options(services)}
      />
      <TextArea label="Contenido relevante" name="content" />
      <TextField label="Proxima accion" name="nextAction" />
      <TextField
        label="Fecha proxima accion"
        name="nextActionDate"
        type="datetime-local"
      />
      <div className="self-end">
        <Button type="submit">
          <Share2 className="h-4 w-4" aria-hidden />
          Registrar captura
        </Button>
      </div>
    </form>
  );
}
