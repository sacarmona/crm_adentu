"use client";

import { TaskStatus } from "@prisma/client";
import { useMemo, useState } from "react";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";
import { taskStatusLabels } from "@/lib/labels";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; name: string; companyId: string | null };
type OpportunityOption = {
  id: string;
  name: string;
  companyId: string | null;
  serviceId: string | null;
};
type ServiceOption = { id: string; name: string };
type UserOption = { id: string; name: string };

function options(items: { id: string; name: string }[]) {
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
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyId, setCompanyId] = useState(defaults?.companyId ?? "");
  const [contactId, setContactId] = useState(defaults?.contactId ?? "");
  const [opportunityId, setOpportunityId] = useState(defaults?.opportunityId ?? "");
  const [serviceId, setServiceId] = useState("");

  const filteredCompanies = useMemo(
    () =>
      companyQuery
        ? companies.filter((company) =>
            company.name.toLowerCase().includes(companyQuery.toLowerCase()),
          )
        : companies,
    [companies, companyQuery],
  );
  const filteredContacts = useMemo(
    () => (companyId ? contacts.filter((contact) => contact.companyId === companyId) : contacts),
    [companyId, contacts],
  );
  const filteredOpportunities = useMemo(
    () =>
      companyId
        ? opportunities.filter((opportunity) => opportunity.companyId === companyId)
        : opportunities,
    [companyId, opportunities],
  );

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
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Empresa</span>
        <input
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
          onChange={(event) => setCompanyQuery(event.target.value)}
          placeholder="Buscar empresa..."
          type="search"
          value={companyQuery}
        />
        <select
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="companyId"
          onChange={(event) => {
            setCompanyId(event.target.value);
            setContactId("");
            setOpportunityId("");
          }}
          value={companyId}
        >
          <option value="">Sin empresa</option>
          {filteredCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Contacto</span>
        <select
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="contactId"
          onChange={(event) => setContactId(event.target.value)}
          value={contactId}
        >
          <option value="">Sin contacto</option>
          {filteredContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </div>
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Oportunidad</span>
        <select
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="opportunityId"
          onChange={(event) => {
            const id = event.target.value;
            setOpportunityId(id);
            const opportunity = opportunities.find((item) => item.id === id);
            if (opportunity?.serviceId) {
              setServiceId(opportunity.serviceId);
            }
          }}
          value={opportunityId}
        >
          <option value="">Sin oportunidad</option>
          {filteredOpportunities.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.name}
            </option>
          ))}
        </select>
      </div>
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Servicio</span>
        <select
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="serviceId"
          onChange={(event) => setServiceId(event.target.value)}
          value={serviceId}
        >
          <option value="">Sin servicio</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </div>
      <TextArea label="Descripcion" name="description" />
      <TextArea label="Resultado" name="result" />
      <div className="md:col-span-2">
        <Button type="submit">Guardar tarea</Button>
      </div>
    </form>
  );
}
