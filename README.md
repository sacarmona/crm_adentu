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

Fase 8 completada:

- Carga de archivos Excel `.xlsx` con limite de tamano y filas.
- Reconocimiento de hojas Empresas/EMPR, Contactos/CONT y Oportunidades/OPOR.
- Normalizacion de encabezados, textos, enums, porcentajes, numeros y fechas.
- Validacion fila a fila con errores y advertencias visibles.
- Deteccion de duplicados y referencias no encontradas.
- Previsualizacion antes de incorporar datos al CRM.
- Importacion transaccional ordenada por dependencias.
- Historial de lotes y trazabilidad de filas importadas u omitidas.
- Permisos de carga y confirmacion restringidos al rol `ADMIN`.
- Pruebas unitarias para reglas de normalizacion y validacion.

Fase 9 completada:

- Inventario de activos y unidades relevantes del mercado.
- Vinculacion de propietario, constructora y empresa de operacion/mantenimiento.
- Asociacion de servicios potenciales, cantidades y contexto comercial.
- Busqueda y filtros por texto y servicio.
- Registro de hitos, proyectos y movimientos de mercado.
- Fichas de activo con navegacion hacia empresas relacionadas.
- Conversion guiada de una senal de mercado en oportunidad.
- Calculos, scoring y auditoria del origen aplicados automaticamente.
- Permisos de lectura y escritura segun rol.
- Pruebas unitarias para nombres de oportunidad y cobertura de relaciones.

Fase 10 completada:

- Administracion de servicios con nombre, descripcion, orden y vigencia.
- Slugs estables y unicos generados automaticamente.
- Conteo de referencias antes de desactivar servicios.
- Conservacion de servicios inactivos en registros historicos.
- Administracion de diccionarios por tipo, clave, etiqueta y orden.
- Claves historicas inmutables durante la edicion.
- Activacion y desactivacion no destructiva de valores.
- Acceso de escritura restringido al rol `ADMIN`.
- Auditoria de altas, cambios y activaciones.
- Pruebas unitarias para slugs y agrupacion de diccionarios.

Fase 11 completada:

- Integracion server-side con OpenAI Responses API.
- Structured Outputs validados con Zod antes de persistir.
- Analisis de interacciones con resumen, intereses, objeciones, compromisos y riesgos.
- Sugerencias de siguientes pasos, probabilidad y etapa comercial.
- Bandeja de revision con estados propuesto, aprobado y rechazado.
- Aprobacion humana obligatoria antes de aplicar cambios.
- Aplicacion controlada de probabilidad y creacion de tareas sugeridas.
- Limite persistente de 10 analisis por usuario y hora.
- Auditoria de generacion, aprobacion y rechazo.
- Desactivacion limpia cuando `OPENAI_API_KEY` no esta configurada.
- Modelo configurable mediante `OPENAI_MODEL`.
- Pruebas unitarias del contrato estructurado, prompts y probabilidades.
- Validacion real completada con `gpt-5.4-mini`: salida estructurada,
  persistencia, aprobacion, tarea y auditoria verificadas.

Fase 12 completada:

- Playbooks generales o asociados a servicios.
- Preguntas clave y criterios de calificacion.
- Objeciones frecuentes y siguientes pasos sugeridos.
- Checklist de propuesta y documentos recomendados.
- Orden administrable de elementos por tipo.
- Activacion y eliminacion logica de guias.
- Integracion contextual en la ficha de oportunidad segun servicio.
- Acceso de lectura para todos los roles y edicion para `ADMIN`/`COMERCIAL`.
- Auditoria de playbooks y sus elementos.
- Pruebas unitarias para agrupacion y cobertura de tipos.

Fase 13 completada:

- Autorizacion centralizada para todos los server actions.
- Escritura restringida a `ADMIN` y `COMERCIAL`; administracion reservada a `ADMIN`.
- Rutas y controles de edicion ocultos o redirigidos para `LECTURA`.
- Visor de auditoria con filtros por accion, entidad y usuario.
- Endpoint `GET /api/health` para configuracion y conectividad PostgreSQL.
- Encabezados HTTP de seguridad y ocultamiento de `X-Powered-By`.
- Validacion de variables obligatorias para produccion.
- Comando `pnpm verify` para pruebas, tipos, lint y build.
- Comando `pnpm db:deploy` para migraciones de produccion.
- Aprovisionamiento seguro del primer administrador sin seed demo.
- Guia de despliegue, verificacion, respaldo y rotacion de secretos.
- Pruebas unitarias de autorizacion y readiness operativo.

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
- IA: SDK oficial de OpenAI con Structured Outputs validados por Zod antes de guardar en `AiInsight`.
- Jobs async: Inngest o QStash para IA, importacion grande y notificaciones.
- Importador Excel: `exceljs` o `xlsx`, con procesamiento por lotes si los archivos crecen.
- Adjuntos: Vercel Blob o Cloudflare R2; no filesystem local en serverless.
- Env vars: validar con Zod o `@t3-oss/env-nextjs`.
- Testing: Vitest para calculos comerciales y Playwright opcional para pipeline.
- Data fetching: TanStack Query para cache, filtros persistentes y revalidacion.
- Seguridad IA: rate limiting por usuario antes de exponer acciones con costo.
- Multi-tenant: no requerido hoy; el schema deja anotada la expansion futura a `tenantId`.

## Estado de implementacion

Las fases 0 a 13 estan completadas. El siguiente hito es desplegar un entorno
staging, cargar usuarios reales controlados y ejecutar pruebas de aceptacion
con datos no sensibles.
