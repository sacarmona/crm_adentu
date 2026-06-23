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

Fase 0 iniciada:

- Proyecto Next.js creado.
- Dependencias principales instaladas.
- Layout base con sidebar y navegacion de modulos.
- Prisma configurado para PostgreSQL.
- Estructura modular inicial creada.
- Variables de entorno documentadas en `.env.example`.

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
pnpm db:generate  Genera Prisma Client
pnpm db:push      Sincroniza schema con la base
pnpm db:migrate   Crea migraciones Prisma
pnpm db:studio    Abre Prisma Studio
```

## Proxima fase

Fase 1: completar el modelo de datos CRM con empresas, contactos, oportunidades, interacciones, tareas, mercado, playbooks, importacion, IA y auditoria.
