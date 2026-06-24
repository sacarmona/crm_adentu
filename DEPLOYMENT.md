# Despliegue CRM ADENTU

## Requisitos

- Node.js 20 o superior.
- PostgreSQL administrado con SSL.
- Variables de entorno configuradas en el proveedor.
- Cuenta OpenAI con facturacion activa si se habilita IA.

## Variables obligatorias

```txt
DATABASE_URL
AUTH_SECRET
AUTH_URL
```

Variables opcionales:

```txt
OPENAI_API_KEY
OPENAI_MODEL=gpt-5.4-mini
```

No usar usuarios ni contrasenas demo en produccion.

## Flujo de despliegue

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm verify
pnpm db:deploy
ADMIN_EMAIL=admin@empresa.cl ADMIN_NAME="Administrador" ADMIN_PASSWORD="..." pnpm db:create-admin
pnpm start
```

Las migraciones deben ejecutarse una vez por despliegue antes de recibir
trafico. El comando `db:create-admin` crea o actualiza el primer administrador
y exige una contrasena de al menos 12 caracteres. No ejecutar `db:seed` en
produccion.

## Verificacion

1. Consultar `GET /api/health`; debe responder HTTP 200.
2. Iniciar sesion con un usuario productivo.
3. Verificar permisos `ADMIN`, `COMERCIAL` y `LECTURA`.
4. Crear y eliminar logicamente un registro de prueba.
5. Revisar el evento en `Configuracion > Auditoria`.
6. Si IA esta habilitada, analizar una interaccion de prueba y revisar el
   consumo en OpenAI Platform.

## Respaldo y operacion

- Habilitar backups diarios y point-in-time recovery en PostgreSQL.
- Rotar `AUTH_SECRET` y `OPENAI_API_KEY` ante cualquier exposicion.
- Monitorear `/api/health`, errores 5xx y uso de OpenAI.
- Mantener `.env.local` fuera de Git.
