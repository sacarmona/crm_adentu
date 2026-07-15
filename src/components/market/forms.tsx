import {
  CommercialMilestone,
  Company,
  MarketAsset,
  Service,
  User,
} from "@prisma/client";

import { SelectField, TextArea, TextField } from "@/components/crm/form-controls";
import { SearchableSelectField } from "@/components/crm/searchable-select-field";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };
type CompanyOption = Pick<Company, "id" | "name">;
type ServiceOption = Pick<Service, "id" | "name" | "isActive">;
type UserOption = Pick<User, "id" | "name">;

function options(items: Option[]) {
  return items.map((item) => ({ value: item.id, label: item.name }));
}

function serviceOptions(items: ServiceOption[]) {
  return items.map((item) => ({
    value: item.id,
    label: `${item.name}${item.isActive ? "" : " (inactivo)"}`,
  }));
}

export function MarketAssetForm({
  action,
  asset,
  companies,
  services,
}: {
  action: (formData: FormData) => void | Promise<void>;
  asset?: MarketAsset | null;
  companies: CompanyOption[];
  services: ServiceOption[];
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField
        defaultValue={asset?.unitName}
        label="Unidad o activo"
        name="unitName"
        required
      />
      <SelectField
        defaultValue={asset?.serviceId}
        label="Servicio potencial"
        name="serviceId"
        options={serviceOptions(services)}
      />
      <TextField
        defaultValue={asset?.quantity?.toString() ?? "1"}
        label="Cantidad"
        name="quantity"
        required
        type="number"
      />
      <TextField
        defaultValue={asset?.ownerName}
        label="Propietario (texto)"
        name="ownerName"
      />
      <SearchableSelectField
        defaultValue={asset?.ownerCompanyId}
        label="Empresa propietaria"
        name="ownerCompanyId"
        options={options(companies)}
        placeholder="Sin empresa"
        searchPlaceholder="Buscar empresa..."
      />
      <TextField
        defaultValue={asset?.constructionCompany}
        label="Constructora (texto)"
        name="constructionCompany"
      />
      <SearchableSelectField
        defaultValue={asset?.constructionCompanyId}
        label="Empresa constructora"
        name="constructionCompanyId"
        options={options(companies)}
        placeholder="Sin empresa"
        searchPlaceholder="Buscar empresa..."
      />
      <TextField
        defaultValue={asset?.operationMaintenance}
        label="Operacion y mantenimiento (texto)"
        name="operationMaintenance"
      />
      <SearchableSelectField
        defaultValue={asset?.omCompanyId}
        label="Empresa O&M"
        name="omCompanyId"
        options={options(companies)}
        placeholder="Sin empresa"
        searchPlaceholder="Buscar empresa..."
      />
      <TextField
        defaultValue={asset?.otherRole}
        label="Otro rol"
        name="otherRole"
      />
      <TextArea
        defaultValue={asset?.comment}
        label="Comentario comercial"
        name="comment"
      />
      <div className="md:col-span-2">
        <Button type="submit">Guardar activo</Button>
      </div>
    </form>
  );
}

export function CommercialMilestoneForm({
  action,
  milestone,
  companies,
  users,
  currentUserId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  milestone?: CommercialMilestone | null;
  companies: CompanyOption[];
  users: UserOption[];
  currentUserId?: string;
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <TextField
        defaultValue={milestone?.date?.toISOString().slice(0, 10)}
        label="Fecha"
        name="date"
        required
        type="date"
      />
      <TextField
        defaultValue={milestone?.project}
        label="Proyecto o hito"
        name="project"
        required
      />
      <SearchableSelectField
        defaultValue={milestone?.companyId}
        label="Empresa relacionada"
        name="companyId"
        options={options(companies)}
        placeholder="Sin empresa"
        searchPlaceholder="Buscar empresa..."
      />
      <TextField
        defaultValue={milestone?.industry}
        label="Industria"
        name="industry"
      />
      <SelectField
        defaultValue={milestone?.ownerId ?? currentUserId}
        label="Responsable"
        name="ownerId"
        options={options(users)}
      />
      <div className="md:col-span-2">
        <Button type="submit">Guardar hito</Button>
      </div>
    </form>
  );
}

export function MarketOpportunityForm({
  action,
  defaults,
  companies,
  services,
  users,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults: {
    assetId: string;
    name: string;
    companyId?: string | null;
    serviceId?: string | null;
    quantity: string;
    notes?: string | null;
    responsibleId?: string;
  };
  companies: CompanyOption[];
  services: ServiceOption[];
  users: UserOption[];
}) {
  return (
    <form
      action={action}
      className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 md:grid-cols-2"
    >
      <input name="assetId" type="hidden" value={defaults.assetId} />
      <TextField defaultValue={defaults.name} label="Nombre" name="name" required />
      <SearchableSelectField
        defaultValue={defaults.companyId}
        label="Empresa"
        name="companyId"
        options={options(companies)}
        placeholder="Sin empresa"
        searchPlaceholder="Buscar empresa..."
      />
      <SelectField
        defaultValue={defaults.serviceId}
        label="Servicio"
        name="serviceId"
        options={serviceOptions(services)}
      />
      <SelectField
        defaultValue={defaults.responsibleId}
        label="Responsable"
        name="responsibleId"
        options={options(users)}
      />
      <TextField
        defaultValue={0.2}
        label="Probabilidad (0 a 1)"
        name="probability"
        required
        type="number"
      />
      <TextField defaultValue={0} label="Precio CLP" name="price" type="number" />
      <TextField
        defaultValue={1}
        label="Tipo de cambio"
        name="exchangeRate"
        type="number"
      />
      <TextField
        defaultValue={defaults.quantity}
        label="Cantidad"
        name="quantity"
        type="number"
      />
      <TextField defaultValue={1} label="Meses" name="months" type="number" />
      <TextField
        label="Cierre estimado"
        name="estimatedCloseDate"
        type="date"
      />
      <TextArea defaultValue={defaults.notes} label="Notas" name="notes" />
      <div className="md:col-span-2">
        <Button type="submit">Crear oportunidad</Button>
      </div>
    </form>
  );
}
