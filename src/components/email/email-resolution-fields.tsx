"use client";

import { useMemo, useState } from "react";

import { SelectField, TextField } from "@/components/crm/form-controls";

type Option = { id: string; name: string };
type ScopedOption = Option & { companyId: string | null };

export function EmailResolutionFields({
  showCompany,
  companies,
  suggestedCompanyIds,
  showContact,
  contacts,
  defaultContactName,
  defaultContactEmail,
  showOpportunity,
  opportunities,
  services,
}: {
  showCompany: boolean;
  companies: Option[];
  suggestedCompanyIds: string[];
  showContact: boolean;
  contacts: ScopedOption[];
  defaultContactName: string;
  defaultContactEmail: string;
  showOpportunity: boolean;
  opportunities: ScopedOption[];
  services: Option[];
}) {
  const [companyId, setCompanyId] = useState("");

  const filteredContacts = useMemo(
    () =>
      companyId ? contacts.filter((contact) => contact.companyId === companyId) : contacts,
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
      {showCompany ? (
        <div className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-2">
          <p className="text-sm font-medium text-slate-700 md:col-span-2">Empresa</p>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Empresa existente</span>
            <select
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
              name="companyId"
              onChange={(event) => setCompanyId(event.currentTarget.value)}
              value={companyId}
            >
              <option value="">Sin seleccionar</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {suggestedCompanyIds.includes(company.id)
                    ? `${company.name} (sugerido)`
                    : company.name}
                </option>
              ))}
            </select>
          </label>
          <TextField label="O crear nueva empresa" name="newCompanyName" />
        </div>
      ) : null}

      {showContact ? (
        <div className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-2">
          <p className="text-sm font-medium text-slate-700 md:col-span-2">
            Contacto
            {showCompany && companyId ? (
              <span className="ml-2 font-normal text-slate-500">
                (filtrado por la empresa seleccionada)
              </span>
            ) : null}
          </p>
          <label className="block" key={`contact-${companyId}`}>
            <span className="text-sm font-medium text-slate-700">Contacto existente</span>
            <select
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
              defaultValue=""
              name="contactId"
            >
              <option value="">Sin seleccionar</option>
              {filteredContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3">
            <TextField
              defaultValue={defaultContactName}
              label="O crear nuevo contacto: nombre"
              name="newContactName"
            />
            <TextField
              defaultValue={defaultContactEmail}
              label="Correo del nuevo contacto"
              name="newContactEmail"
              type="email"
            />
          </div>
        </div>
      ) : null}

      {showOpportunity ? (
        <div className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-2">
          <p className="text-sm font-medium text-slate-700 md:col-span-2">
            Oportunidad (opcional)
            {showCompany && companyId ? (
              <span className="ml-2 font-normal text-slate-500">
                (filtrada por la empresa seleccionada)
              </span>
            ) : null}
          </p>
          <label className="block" key={`opportunity-${companyId}`}>
            <span className="text-sm font-medium text-slate-700">Oportunidad existente</span>
            <select
              className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
              defaultValue=""
              name="opportunityId"
            >
              <option value="">Sin seleccionar</option>
              {filteredOpportunities.map((opportunity) => (
                <option key={opportunity.id} value={opportunity.id}>
                  {opportunity.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3">
            <TextField label="O crear nueva oportunidad" name="newOpportunityName" />
            <SelectField
              label="Servicio"
              name="newOpportunityServiceId"
              options={services.map((service) => ({ value: service.id, label: service.name }))}
              placeholder="Sin servicio"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
