"use client";

import { useMemo, useState } from "react";

import { SearchableSelectField } from "@/components/crm/searchable-select-field";
import { SubmitButton } from "@/components/ui/submit-button";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; name: string; companyId: string | null };
type OpportunityOption = { id: string; name: string; companyId: string | null };
type ServiceOption = { id: string; name: string };

type MeetingDefaults = {
  companyId?: string | null;
  contactId?: string | null;
  opportunityId?: string | null;
  serviceId?: string | null;
  minutes?: string | null;
};

function matches(value: string, query: string) {
  return value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}

export function MeetingContextForm({
  action,
  companies,
  contacts,
  opportunities,
  services,
  defaults,
  canEdit,
}: {
  action: (formData: FormData) => void | Promise<void>;
  companies: CompanyOption[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  services: ServiceOption[];
  defaults: MeetingDefaults;
  canEdit: boolean;
}) {
  const [companyId, setCompanyId] = useState(defaults.companyId ?? "");
  const [contactId, setContactId] = useState(defaults.contactId ?? "");
  const [opportunityId, setOpportunityId] = useState(defaults.opportunityId ?? "");
  const [contactQuery, setContactQuery] = useState("");
  const [opportunityQuery, setOpportunityQuery] = useState("");

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          (!companyId || contact.companyId === companyId) &&
          matches(contact.name, contactQuery),
      ),
    [companyId, contactQuery, contacts],
  );
  const filteredOpportunities = useMemo(
    () =>
      opportunities.filter(
        (opportunity) =>
          (!companyId || opportunity.companyId === companyId) &&
          matches(opportunity.name, opportunityQuery),
      ),
    [companyId, opportunities, opportunityQuery],
  );

  return (
    <form action={action} className="mt-4 grid gap-3 lg:grid-cols-4">
      <SearchableSelectField
        controlClassName="mt-1 h-10 text-sm"
        label="Empresa"
        labelClassName="text-xs font-medium text-slate-600"
        name="companyId"
        onChange={(value) => {
          setCompanyId(value);
          setContactId("");
          setOpportunityId("");
        }}
        options={companies.map((company) => ({ value: company.id, label: company.name }))}
        placeholder="Sin asociar"
        searchPlaceholder="Buscar empresa..."
        value={companyId}
      />
      <label className="lg:col-span-3">
        <span className="text-xs font-medium text-slate-600">Nueva empresa</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          name="newCompanyName"
          placeholder="Crear empresa si no existe"
        />
      </label>

      <label>
        <span className="text-xs font-medium text-slate-600">Buscar contacto</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          onChange={(event) => setContactQuery(event.target.value)}
          placeholder="Filtrar contactos"
          value={contactQuery}
        />
      </label>
      <label>
        <span className="text-xs font-medium text-slate-600">Contacto</span>
        <select
          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="contactId"
          onChange={(event) => setContactId(event.target.value)}
          value={contactId}
        >
          <option value="">Sin asociar</option>
          {filteredContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </label>
      <label className="lg:col-span-2">
        <span className="text-xs font-medium text-slate-600">Nuevo contacto</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          name="newContactName"
          placeholder="Crear contacto para la empresa seleccionada"
        />
      </label>

      <label>
        <span className="text-xs font-medium text-slate-600">Buscar oportunidad</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          onChange={(event) => setOpportunityQuery(event.target.value)}
          placeholder="Filtrar oportunidades"
          value={opportunityQuery}
        />
      </label>
      <label>
        <span className="text-xs font-medium text-slate-600">Oportunidad</span>
        <select
          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="opportunityId"
          onChange={(event) => setOpportunityId(event.target.value)}
          value={opportunityId}
        >
          <option value="">Sin asociar</option>
          {filteredOpportunities.map((opportunity) => (
            <option key={opportunity.id} value={opportunity.id}>
              {opportunity.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="text-xs font-medium text-slate-600">Nueva oportunidad</span>
        <input
          className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
          name="newOpportunityName"
          placeholder="Crear oportunidad"
        />
      </label>
      <label>
        <span className="text-xs font-medium text-slate-600">Servicio</span>
        <select
          className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          defaultValue={defaults.serviceId ?? ""}
          name="serviceId"
        >
          <option value="">Sin asociar</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
      </label>

      <label className="lg:col-span-4">
        <span className="text-xs font-medium text-slate-600">Minuta</span>
        <textarea
          className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          defaultValue={defaults.minutes ?? ""}
          name="minutes"
          placeholder="Acuerdos, necesidades detectadas, objeciones, proximos pasos..."
        />
      </label>
      {canEdit ? (
        <div className="flex flex-wrap gap-2 lg:col-span-4">
          <SubmitButton pendingLabel="Guardando" size="sm" variant="outline">
            Guardar minuta
          </SubmitButton>
        </div>
      ) : null}
    </form>
  );
}
