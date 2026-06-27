"use client";

import { useMemo, useState } from "react";

type Option = { id: string; name: string };
type ContactOption = Option & { companyId: string | null };
type OpportunityOption = Option & { companyId: string | null; serviceId: string | null };

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <label>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <select
        className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Sin vincular</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TaskLinkFields({
  companies,
  contacts,
  opportunities,
  interactions,
  services,
  defaults,
}: {
  companies: Option[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  interactions: Option[];
  services: Option[];
  defaults: {
    companyId: string | null;
    contactId: string | null;
    opportunityId: string | null;
    interactionId: string | null;
    serviceId: string | null;
  };
}) {
  const [companyId, setCompanyId] = useState(defaults.companyId ?? "");
  const [contactId, setContactId] = useState(defaults.contactId ?? "");
  const [opportunityId, setOpportunityId] = useState(defaults.opportunityId ?? "");
  const [serviceId, setServiceId] = useState(defaults.serviceId ?? "");
  const [interactionId, setInteractionId] = useState(defaults.interactionId ?? "");

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
    <>
      <SelectField
        label="Empresa"
        name="companyId"
        onChange={(value) => {
          setCompanyId(value);
          setContactId("");
          setOpportunityId("");
        }}
        options={companies}
        value={companyId}
      />
      <SelectField
        label="Contacto"
        name="contactId"
        onChange={setContactId}
        options={filteredContacts}
        value={contactId}
      />
      <SelectField
        label="Oportunidad"
        name="opportunityId"
        onChange={(value) => {
          setOpportunityId(value);
          const opportunity = opportunities.find((item) => item.id === value);
          if (opportunity?.serviceId) {
            setServiceId(opportunity.serviceId);
          }
        }}
        options={filteredOpportunities}
        value={opportunityId}
      />
      <SelectField
        label="Interaccion"
        name="interactionId"
        onChange={setInteractionId}
        options={interactions}
        value={interactionId}
      />
      <SelectField label="Servicio" name="serviceId" onChange={setServiceId} options={services} value={serviceId} />
    </>
  );
}
