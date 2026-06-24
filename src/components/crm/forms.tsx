import {
  Certainty,
  Company,
  CompanyStatus,
  Contact,
  ContactStatus,
  Currency,
  LeadSource,
  Opportunity,
  OpportunityStatus,
  Service,
  User,
} from "@prisma/client";

import { Button } from "@/components/ui/button";
import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import {
  certaintyLabels,
  companyStatusLabels,
  contactStatusLabels,
  currencyLabels,
  leadSourceLabels,
  opportunityStatusLabels,
} from "@/lib/labels";

type UserOption = Pick<User, "id" | "name">;
type CompanyOption = Pick<Company, "id" | "name">;
type ContactOption = Pick<Contact, "id" | "name">;
type ServiceOption = Pick<Service, "id" | "name" | "isActive">;

function enumOptions<T extends Record<string, string>>(
  values: T,
  labels?: Record<string, string>,
) {
  return Object.values(values).map((value) => ({
    value,
    label: labels?.[value] ?? value,
  }));
}

function userOptions(users: UserOption[]) {
  return users.map((user) => ({ value: user.id, label: user.name }));
}

function companyOptions(companies: CompanyOption[]) {
  return companies.map((company) => ({ value: company.id, label: company.name }));
}

function contactOptions(contacts: ContactOption[]) {
  return contacts.map((contact) => ({ value: contact.id, label: contact.name }));
}

function serviceOptions(services: ServiceOption[]) {
  return services.map((service) => ({
    value: service.id,
    label: `${service.name}${service.isActive ? "" : " (inactivo)"}`,
  }));
}

function dateValue(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export function CompanyForm({
  action,
  company,
  users,
}: {
  action: (formData: FormData) => void | Promise<void>;
  company?: Company | null;
  users: UserOption[];
}) {
  return (
    <form action={action} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2">
      <TextField defaultValue={company?.name} label="Nombre" name="name" required />
      <SelectField
        defaultValue={company?.status}
        label="Estado"
        name="status"
        options={enumOptions(CompanyStatus, companyStatusLabels)}
        required
      />
      <TextField defaultValue={company?.industry} label="Industria" name="industry" />
      <TextField defaultValue={company?.region} label="Region" name="region" />
      <TextField defaultValue={company?.size} label="Tamaño" name="size" />
      <SelectField
        defaultValue={company?.responsibleId}
        label="Responsable"
        name="responsibleId"
        options={userOptions(users)}
      />
      <TextArea defaultValue={company?.notes} label="Notas" name="notes" />
      <div className="md:col-span-2">
        <Button type="submit">Guardar empresa</Button>
      </div>
    </form>
  );
}

export function ContactForm({
  action,
  contact,
  companies,
  users,
}: {
  action: (formData: FormData) => void | Promise<void>;
  contact?: Contact | null;
  companies: CompanyOption[];
  users: UserOption[];
}) {
  return (
    <form action={action} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2">
      <TextField defaultValue={contact?.name} label="Nombre" name="name" required />
      <SelectField
        defaultValue={contact?.companyId}
        label="Empresa"
        name="companyId"
        options={companyOptions(companies)}
      />
      <TextField defaultValue={contact?.roleArea} label="Cargo/Area" name="roleArea" />
      <SelectField
        defaultValue={contact?.status}
        label="Estado"
        name="status"
        options={enumOptions(ContactStatus, contactStatusLabels)}
        required
      />
      <TextField defaultValue={contact?.email} label="Email" name="email" type="email" />
      <TextField defaultValue={contact?.phone} label="Telefono" name="phone" />
      <SelectField
        defaultValue={contact?.leadSource}
        label="Origen lead"
        name="leadSource"
        options={enumOptions(LeadSource, leadSourceLabels)}
      />
      <SelectField
        defaultValue={contact?.responsibleId}
        label="Responsable"
        name="responsibleId"
        options={userOptions(users)}
      />
      <TextArea defaultValue={contact?.notes} label="Notas" name="notes" />
      <div className="md:col-span-2">
        <Button type="submit">Guardar contacto</Button>
      </div>
    </form>
  );
}

export function OpportunityForm({
  action,
  opportunity,
  companies,
  contacts,
  services,
  users,
}: {
  action: (formData: FormData) => void | Promise<void>;
  opportunity?: Opportunity | null;
  companies: CompanyOption[];
  contacts: ContactOption[];
  services: ServiceOption[];
  users: UserOption[];
}) {
  return (
    <form action={action} className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2">
      <TextField defaultValue={opportunity?.name} label="Nombre" name="name" required />
      <SelectField
        defaultValue={opportunity?.status}
        label="Estado"
        name="status"
        options={enumOptions(OpportunityStatus, opportunityStatusLabels)}
        required
      />
      <SelectField defaultValue={opportunity?.companyId} label="Empresa" name="companyId" options={companyOptions(companies)} />
      <SelectField defaultValue={opportunity?.primaryContactId} label="Contacto principal" name="primaryContactId" options={contactOptions(contacts)} />
      <SelectField defaultValue={opportunity?.serviceId} label="Servicio" name="serviceId" options={serviceOptions(services)} />
      <SelectField defaultValue={opportunity?.certainty} label="Certeza" name="certainty" options={enumOptions(Certainty, certaintyLabels)} />
      <TextField defaultValue={opportunity?.probability?.toString() ?? "0"} label="Probabilidad (0 a 1)" name="probability" type="number" />
      <SelectField defaultValue={opportunity?.currency} label="Moneda" name="currency" options={enumOptions(Currency, currencyLabels)} required />
      <TextField defaultValue={opportunity?.price?.toString() ?? "0"} label="Precio" name="price" type="number" />
      <TextField defaultValue={opportunity?.exchangeRate?.toString() ?? "1"} label="Tipo de cambio" name="exchangeRate" type="number" />
      <TextField defaultValue={opportunity?.quantity?.toString() ?? "1"} label="Cantidad" name="quantity" type="number" />
      <TextField defaultValue={opportunity?.months ?? 1} label="Meses" name="months" type="number" />
      <TextField defaultValue={opportunity?.businessUnit} label="Unidad" name="businessUnit" />
      <SelectField defaultValue={opportunity?.responsibleId} label="Responsable" name="responsibleId" options={userOptions(users)} />
      <TextField defaultValue={dateValue(opportunity?.estimatedCloseDate)} label="Cierre estimado" name="estimatedCloseDate" type="date" />
      <TextField defaultValue={dateValue(opportunity?.estimatedStartDate)} label="Inicio estimado" name="estimatedStartDate" type="date" />
      <TextField defaultValue={dateValue(opportunity?.nextActionDate)} label="Proxima accion" name="nextActionDate" type="date" />
      <TextArea defaultValue={opportunity?.notes} label="Notas" name="notes" />
      <div className="md:col-span-2">
        <Button type="submit">Guardar oportunidad</Button>
      </div>
    </form>
  );
}
