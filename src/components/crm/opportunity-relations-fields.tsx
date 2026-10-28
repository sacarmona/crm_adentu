"use client";

import { useMemo, useState } from "react";

import { SearchableSelectField } from "@/components/crm/searchable-select-field";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; name: string; companyId: string | null };

export function OpportunityRelationsFields({
  companies,
  contacts,
  defaultCompanyId,
  defaultContactId,
}: {
  companies: CompanyOption[];
  contacts: ContactOption[];
  defaultCompanyId?: string | null;
  defaultContactId?: string | null;
}) {
  const [companyId, setCompanyId] = useState(defaultCompanyId ?? "");

  const filteredContacts = useMemo(
    () =>
      companyId
        ? contacts.filter((contact) => contact.companyId === companyId)
        : contacts,
    [companyId, contacts],
  );

  // Conserva el contacto actual si pertenece a la empresa seleccionada.
  const defaultContact =
    defaultContactId &&
    filteredContacts.some((contact) => contact.id === defaultContactId)
      ? defaultContactId
      : "";

  return (
    <>
      <SearchableSelectField
        label="Empresa"
        name="companyId"
        onChange={setCompanyId}
        options={companies.map((company) => ({ value: company.id, label: company.name }))}
        placeholder="Sin empresa"
        searchPlaceholder="Buscar empresa..."
        value={companyId}
      />
      <label className="block" key={`contact-${companyId}`}>
        <span className="text-sm font-medium text-slate-700">
          Contacto principal
          {companyId ? (
            <span className="ml-2 font-normal text-slate-500">(filtrado por la empresa)</span>
          ) : null}
        </span>
        <select
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-950"
          defaultValue={defaultContact}
          name="primaryContactId"
        >
          <option value="">Sin contacto</option>
          {filteredContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
