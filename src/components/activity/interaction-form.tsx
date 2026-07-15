"use client";

import { InteractionType } from "@prisma/client";
import { useMemo, useState } from "react";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { SearchableSelectField } from "@/components/crm/searchable-select-field";
import { Button } from "@/components/ui/button";
import { interactionTypeLabels } from "@/lib/labels";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; name: string; companyId: string | null };
type OpportunityOption = {
  id: string;
  name: string;
  companyId: string | null;
  serviceId: string | null;
};
type ServiceOption = { id: string; name: string };

function todayAtSameTime(value: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const datePart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timePart = value.includes("T") ? value.split("T")[1] : `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${datePart}T${timePart}`;
}

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
  const [companyId, setCompanyId] = useState(defaults?.companyId ?? "");
  const [contactId, setContactId] = useState(defaults?.contactId ?? "");
  const [opportunityId, setOpportunityId] = useState(defaults?.opportunityId ?? "");
  const [serviceId, setServiceId] = useState(defaults?.serviceId ?? "");
  const [nextActionDate, setNextActionDate] = useState(defaults?.nextActionDate ?? "");

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
      <SearchableSelectField
        label="Empresa"
        name="companyId"
        onChange={(value) => {
          setCompanyId(value);
          setContactId("");
          setOpportunityId("");
        }}
        options={options(companies)}
        placeholder="Sin empresa"
        searchPlaceholder="Buscar empresa..."
        value={companyId}
      />
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
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Fecha proxima accion</span>
        <div className="mt-2 flex gap-2">
          <input
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
            name="nextActionDate"
            onChange={(event) => setNextActionDate(event.target.value)}
            type="datetime-local"
            value={nextActionDate}
          />
          <Button
            onClick={() => setNextActionDate(todayAtSameTime(nextActionDate))}
            type="button"
            variant="outline"
          >
            Urgente
          </Button>
        </div>
      </div>
      <div className="self-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
