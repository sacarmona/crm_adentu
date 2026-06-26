"use client";

import { InteractionType } from "@prisma/client";
import { useMemo, useState } from "react";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { Button } from "@/components/ui/button";
import { interactionTypeLabels } from "@/lib/labels";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; name: string; companyId: string | null };
type OpportunityOption = { id: string; name: string; companyId: string | null };
type ServiceOption = { id: string; name: string };

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
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyId, setCompanyId] = useState(defaults?.companyId ?? "");
  const [contactId, setContactId] = useState(defaults?.contactId ?? "");

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
      <TextField
        defaultValue={defaults?.date}
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
      <SelectField
        key={companyId}
        defaultValue={companyId ? undefined : defaults?.opportunityId}
        label="Oportunidad"
        name="opportunityId"
        options={options(filteredOpportunities)}
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
