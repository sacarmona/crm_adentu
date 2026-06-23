# CRM ADENTU

Aplicacion web CRM para ADENTU Ingenieria SpA. El objetivo es reemplazar la planilla comercial actual por una plataforma modular para empresas, contactos, oportunidades, interacciones, tareas, mercado, dashboards e inteligencia comercial asistida por IA.

## Stack

- Next.js App Router
- TypeScript
- PostgreSQL
- Prisma ORM
- Tailwind CSS
- shadcn/ui
- TanStack Table
- Recharts
- Zod
- React Hook Form

## Estado actual

Fase 0 completada:

- Proyecto Next.js creado.
- Dependencias principales instaladas.
- Layout base con sidebar y navegacion de modulos.
- Prisma configurado para PostgreSQL.
- Estructura modular inicial creada.
- Variables de entorno documentadas en `.env.example`.

Fase 1 completada:

- Schema Prisma CRM ampliado con entidades comerciales principales.
- Migracion SQL inicial generada desde el schema Prisma.
- Enums de estados, roles, monedas, interacciones, importacion, IA y auditoria.
- Soft delete en modelos de negocio.
- Indices para busqueda, filtros y relaciones frecuentes.
- Seed ficticio sin datos reales sensibles.

Fase 2 completada:

- Auth.js / NextAuth v5 integrado con Prisma Adapter.
- Login con credenciales demo y contrasenas hasheadas con bcrypt.
- Roles `ADMIN`, `COMERCIAL` y `LECTURA` expuestos en la sesion JWT.
- Rutas internas protegidas por middleware.
- Dashboard movido a una ruta protegida.
- Shell interno muestra usuario, correo, rol y cierre de sesion.

Fase 3 completada:

- CRUD funcional para empresas, contactos y oportunidades.
- Listados protegidos con busqueda y filtro por estado.
- Formularios server-side validados con Zod.
- Fichas detalle con relaciones principales.
- Edicion y eliminacion logica con `deletedAt`.
- Audit log basico para creacion, edicion, cambio de etapa y soft delete.
- Calculos comerciales de oportunidad centralizados en servicio reutilizable.

Fase 4 completada:

- Calculo automatico de precio CLP, monto mensual, total y ponderado.
- Redondeo monetario controlado a dos decimales.
- Scoring automatico de completitud para empresas, contactos y oportunidades.
- Indicadores visuales de completitud en listados y ficha de oportunidad.
- Pruebas unitarias Vitest para reglas comerciales y scoring.

Fase 5 completada:

- Pipeline Kanban con las seis etapas comerciales.
- Movimiento de oportunidades con mouse, tacto o teclado.
- Actualizacion optimista con reversion ante errores.
- Totales, montos ponderados y cantidad de oportunidades por etapa.
- Filtros por responsable y servicio.
- Cambio de etapa autorizado para roles `ADMIN` y `COMERCIAL`.
- Vista de solo lectura para rol `LECTURA`.
- Auditoria transaccional de cada cambio de etapa.

Fase 6 completada:

- Registro cronologico de interacciones comerciales.
- Asociacion con empresa, contacto, oportunidad, servicio y ejecutor.
- Creacion automatica de tareas desde la proxima accion.
- Actualizacion de ultima interaccion sin reemplazar fechas mas recientes.
- Agenda de tareas con filtros por estado, responsable y tareas propias.
- Deteccion visual de tareas vencidas.
- Cambios rapidos entre pendiente, ejecutada y cerrada.
- Sincronizacion del estado con la proxima accion de origen.
- Acciones contextuales desde fichas comerciales y permisos por rol.
- Pruebas unitarias para fechas, ejecucion y vencimientos.

Fase 7 completada:

- Dashboard comercial con filtros por responsable y cartera propia.
- KPIs de pipeline abierto, ponderado, ganado y tareas vencidas.
- Grafico comparativo de montos por etapa.
- Distribucion de oportunidades por servicio.
- Alertas de tareas vencidas y oportunidades sin seguimiento por 14 dias.
- Timeline de actividad comercial reciente.
- Accesos directos a pipeline, tareas, oportunidades e interacciones.
- Pruebas unitarias para agregados, vencimientos y deteccion de inactividad.

## Estructura inicial

```txt
src/app              Rutas App Router
src/components       Componentes UI y layout
src/lib              Utilidades compartidas, env y Prisma
src/schemas          Schemas Zod
src/server/actions   Server actions
src/server/services  Logica de negocio
src/types            Tipos compartidos
prisma               Schema y futuras migraciones
```

## Configuracion local

1. Instalar dependencias:

```bash
pnpm install
```

2. Crear `.env` desde `.env.example` y ajustar `DATABASE_URL`:

```bash
cp .env.example .env
```

Para desarrollo local, define tambien `AUTH_SECRET`. Puedes generar uno con:

```bash
openssl rand -base64 32
```

3. Generar cliente Prisma:

```bash
pnpm db:generate
```

4. Ejecutar desarrollo:

```bash
pnpm dev
```

5. Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev          Ejecuta Next.js en desarrollo
pnpm build        Compila la aplicacion
pnpm start        Ejecuta la build de produccion
pnpm lint         Ejecuta ESLint
pnpm typecheck    Verifica TypeScript
pnpm test         Ejecuta las pruebas unitarias
pnpm db:generate  Genera Prisma Client
pnpm db:push      Sincroniza schema con la base
pnpm db:migrate   Crea migraciones Prisma
pnpm db:seed      Carga datos ficticios de ejemplo
pnpm db:studio    Abre Prisma Studio
```

## Usuarios demo

El seed crea usuarios ficticios para validar roles:

```txt
admin.demo@adentu.cl      ADMIN
comercial.demo@adentu.cl  COMERCIAL
lectura.demo@adentu.cl    LECTURA
```

Contrasena demo para todos:

```txt
AdentuDemo2026!
```

## Recomendaciones tecnicas adoptadas

- Auth: Auth.js / NextAuth v5 con Prisma Adapter en Fase 2.
- IA: Vercel AI SDK con respuestas validadas por Zod antes de guardar en `AiInsight`.
- Jobs async: Inngest o QStash para IA, importacion grande y notificaciones.
- Importador Excel: `exceljs` o `xlsx`, con procesamiento por lotes si los archivos crecen.
- Adjuntos: Vercel Blob o Cloudflare R2; no filesystem local en serverless.
- Env vars: validar con Zod o `@t3-oss/env-nextjs`.
- Testing: Vitest para calculos comerciales y Playwright opcional para pipeline.
- Data fetching: TanStack Query para cache, filtros persistentes y revalidacion.
- Seguridad IA: rate limiting por usuario antes de exponer acciones con costo.
- Multi-tenant: no requerido hoy; el schema deja anotada la expansion futura a `tenantId`.

## Proxima fase de implementacion

Iniciar Fase 8: importador de datos Excel con validacion, previsualizacion y trazabilidad por lote.
