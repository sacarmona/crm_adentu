"use client";

import { Company, Contact, Opportunity, Service } from "@prisma/client";
import { Bot, FileUp, Share2 } from "lucide-react";
import { useRef, useState } from "react";

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

function setFieldValue(
  form: HTMLFormElement | null,
  name: string,
  value: string | null,
) {
  if (!form || value == null) return;
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    field.value = value;
  }
}

export function LinkedInCaptureForm({
  action,
  analyzeAction,
  aiAvailable,
  companies,
  contacts,
  opportunities,
  services,
}: {
  action: (formData: FormData) => void | Promise<void>;
  analyzeAction: (formData: FormData) => Promise<{
    personName: string | null;
    organizationName: string | null;
    sourceUrl: string | null;
    content: string;
  }>;
  aiAvailable: boolean;
  companies: CompanyOption[];
  contacts: ContactOption[];
  opportunities: OpportunityOption[];
  services: ServiceOption[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    const fileInput = formRef.current?.elements.namedItem("profilePdf");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : null;
    if (!file) {
      setError("Selecciona primero un PDF del perfil.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("profilePdf", file);
      const suggestion = await analyzeAction(formData);
      setFieldValue(formRef.current, "personName", suggestion.personName);
      setFieldValue(formRef.current, "organizationName", suggestion.organizationName);
      setFieldValue(formRef.current, "sourceUrl", suggestion.sourceUrl);
      setFieldValue(formRef.current, "content", suggestion.content);
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "No fue posible analizar el PDF.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
      ref={formRef}
    >
      <TextField
        defaultValue={localDateTimeValue()}
        label="Fecha y hora"
        name="date"
        required
        type="datetime-local"
      />
      <div className="block">
        <span className="text-sm font-medium text-slate-700">
          URL de LinkedIn (opcional)
        </span>
        <input
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
          name="sourceUrl"
          type="url"
        />
      </div>
      {aiAvailable ? (
        <div className="md:col-span-2 flex flex-wrap items-end gap-3 rounded-md border border-dashed border-slate-300 p-3">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              PDF del perfil de LinkedIn
            </span>
            <input
              accept="application/pdf"
              className="mt-2 block text-sm"
              name="profilePdf"
              type="file"
            />
          </label>
          <Button disabled={pending} onClick={handleAnalyze} type="button" variant="outline">
            <Bot className="h-4 w-4" aria-hidden />
            {pending ? "Analizando..." : "Analizar con IA"}
          </Button>
          <p className="w-full text-xs text-slate-500">
            Exporta el PDF desde LinkedIn (Perfil &gt; Más &gt; Guardar como PDF) y
            sube el archivo aqui para completar los campos automaticamente.
          </p>
          {error ? <p className="w-full text-xs text-rose-600">{error}</p> : null}
        </div>
      ) : (
        <div className="md:col-span-2 flex items-center gap-2 rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500">
          <FileUp className="h-4 w-4" aria-hidden />
          Configura un proveedor de IA en Configuracion para completar estos
          campos automaticamente desde un PDF de LinkedIn.
        </div>
      )}
      <TextField label="Persona" name="personName" />
      <TextField label="Organizacion mencionada" name="organizationName" />
      <p className="md:col-span-2 -mb-2 text-xs text-slate-500">
        Selecciona al menos una empresa, contacto u oportunidad para poder
        registrar la captura.
      </p>
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
      <TextArea
        label="Contenido relevante"
        minLength={10}
        name="content"
        required
      />
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
