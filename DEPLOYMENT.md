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
ANTHROPIC_API_KEY
ANTHROPIC_MODEL=claude-sonnet-4-6
EMAIL_TOKEN_ENCRYPTION_KEY
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_TENANT_ID=common
CRON_SECRET
EMAIL_AUTO_CLASSIFY=false
EMAIL_AUTO_CLASSIFY_LIMIT=5
```

Un ADMIN puede elegir cual proveedor usa el modulo de Inteligencia Comercial
desde Configuracion > Inteligencia Comercial, sin redeploy. Configura al
menos una de las dos claves.

Para correo, registre estas URL de retorno en cada proveedor:

```txt
https://SU_DOMINIO/api/email/oauth/gmail/callback
https://SU_DOMINIO/api/email/oauth/microsoft/callback
```

`EMAIL_TOKEN_ENCRYPTION_KEY` debe ser independiente de `AUTH_SECRET`, tener alta
entropia y mantenerse estable; su rotacion requiere reconectar los buzones.

`CRON_SECRET` debe tener al menos 16 caracteres. Vercel lo envia como
`Authorization: Bearer ...` al endpoint `/api/cron/email`. El repositorio
programa una ejecucion diaria a las 08:00 UTC, compatible con Vercel Hobby.

La sincronizacion automatica siempre esta activa cuando existe el cron. La
clasificacion con IA permanece apagada mientras `EMAIL_AUTO_CLASSIFY=false`.
Al activarla, `EMAIL_AUTO_CLASSIFY_LIMIT` limita el numero de correos nuevos
analizados por usuario en cada ejecucion.

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
7. Conectar un buzon de prueba, sincronizar mensajes no sensibles y aprobar
   una clasificacion comercial desde `Correo`.
8. Revisar `Settings > Cron Jobs` y confirmar una respuesta `ok` o `partial`
   de `/api/cron/email`.
9. Registrar una captura de LinkedIn con una URL y contenido no sensible.
10. Generar un borrador desde un correo comercial, editarlo y aprobarlo.

## Borradores de correo

Los borradores se generan con el proveedor de IA activo y requieren revision
humana. El estado `APPROVED` significa que el texto esta listo para copiar; la
aplicacion no envia mensajes ni llama endpoints de envio de Gmail o Microsoft.

## LinkedIn

La aplicacion no usa credenciales ni APIs privadas de LinkedIn. Tampoco realiza
scraping, lectura automatica de mensajes, invitaciones o envios. El usuario
registra manualmente el enlace y el contexto que tiene autorizacion para usar.

## Respaldo y operacion

- Habilitar backups diarios y point-in-time recovery en PostgreSQL.
- Rotar `AUTH_SECRET`, `OPENAI_API_KEY` y `ANTHROPIC_API_KEY` ante cualquier exposicion.
- Monitorear `/api/health`, errores 5xx y uso de OpenAI.
- Mantener `.env.local` fuera de Git.
