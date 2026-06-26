"use client";

import { Send } from "lucide-react";
import { useMemo, useState } from "react";

import { SelectField } from "@/components/crm/form-controls";
import { SubmitButton } from "@/components/ui/submit-button";

type CompanyOption = { id: string; name: string };
type ContactOption = { id: string; name: string; companyId: string | null; phone: string | null };
type OpportunityOption = { id: string; name: string; companyId?: string | null };

export function WhatsAppComposer({
  action,
  companies,
  contacts,
  opportunities,
}: {
  action: (formData: FormData) => void | Promise<void>;
  companies: CompanyOption[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
}) {
  const [companyId, setCompanyId] = useState("");
  const [contactId, setContactId] = useState("");
  const [to, setTo] = useState("");

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
    <form action={action} className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="block">
        <span className="text-sm font-medium text-slate-700">
          Numero (con codigo de pais)
        </span>
        <input
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
          name="to"
          onChange={(event) => setTo(event.target.value)}
          required
          value={to}
        />
      </div>
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Empresa (opcional)</span>
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
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>
      <div className="block">
        <span className="text-sm font-medium text-slate-700">Contacto (opcional)</span>
        <select
          className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          name="contactId"
          onChange={(event) => {
            const id = event.target.value;
            setContactId(id);
            const contact = contacts.find((item) => item.id === id);
            if (contact?.phone) {
              setTo(contact.phone);
            }
          }}
          value={contactId}
        >
          <option value="">Sin contacto</option>
          {filteredContacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
              {contact.phone ? "" : " (sin numero)"}
            </option>
          ))}
        </select>
      </div>
      <SelectField
        key={companyId}
        defaultValue=""
        label="Oportunidad (opcional)"
        name="opportunityId"
        options={filteredOpportunities.map((opportunity) => ({
          value: opportunity.id,
          label: opportunity.name,
        }))}
        placeholder="Sin oportunidad"
      />
      <div className="md:col-span-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Mensaje</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-950"
            name="body"
            required
          />
        </label>
      </div>
      <div>
        <SubmitButton pendingLabel="Enviando">
          <Send className="h-4 w-4" aria-hidden />
          Enviar
        </SubmitButton>
      </div>
    </form>
  );
}
