# Gmail Push + Pub/Sub

Esta integracion permite que Gmail avise al CRM cuando cambia un buzon, evitando
polling frecuente en Vercel Hobby.

## Variables Vercel

Configurar en Production y Preview si corresponde:

- `GMAIL_PUBSUB_TOPIC_NAME`: topic completo, por ejemplo
  `projects/crm-adentu/topics/gmail-crm-adentu`.
- `GMAIL_PUSH_TOKEN`: secreto aleatorio de al menos 16 caracteres.
- `CRON_SECRET`: se mantiene para el cron diario.

## Google Cloud

1. Crear un topic Pub/Sub, por ejemplo `gmail-crm-adentu`.
2. Dar permiso de publicador al servicio de Gmail:
   `gmail-api-push@system.gserviceaccount.com`
   con rol `Pub/Sub Publisher` sobre el topic.
3. Crear una suscripcion Push hacia:
   `https://crm-adentu.vercel.app/api/email/gmail/push?token=GMAIL_PUSH_TOKEN`
4. Mantener habilitada Gmail API en el mismo proyecto OAuth.

## Operacion

- El cron diario `/api/cron/email` sincroniza como respaldo y renueva el
  `watch` de cada cuenta Gmail conectada.
- Cada notificacion Pub/Sub llama `/api/email/gmail/push`.
- El CRM usa `historyId` para leer solo mensajes agregados desde el ultimo
  cursor guardado en `EmailConnection.syncCursor`.
- Si Gmail informa que el historial expiro, el CRM ejecuta una sincronizacion
  completa de respaldo y actualiza el cursor.

## Costos y control IA

El push no consume tokens de IA por si solo. El consumo de tokens depende de
`EMAIL_AUTO_CLASSIFY` y `EMAIL_AUTO_CLASSIFY_LIMIT`, igual que en el cron.
