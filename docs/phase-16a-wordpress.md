# Fase 16A: formulario WordPress a CRM

El formulario de `adentu.cl` mantiene el correo a `contacto@adentu.cl` como respaldo. Despues de un envio exitoso, WordPress envia una copia estructurada a:

`POST https://crm-adentu.vercel.app/api/web-leads`

La peticion debe incluir `X-Web-Lead-Secret`, con el mismo valor de `WEB_LEAD_SECRET` en Vercel.

## Datos aceptados

- `externalId`: identificador unico para evitar duplicados.
- `name`, `email`, `message`: obligatorios.
- `phone`, `companyName`, `roleArea`, `subject`: opcionales.
- `sourcePage`, `campaignSource`, `campaignMedium`, `campaignName`: atribucion.
- `consent`: consentimiento informado.

Tambien reconoce aliases comunes: `nombre`, `correo`, `telefono`, `empresa`, `asunto`, `mensaje`, `your-name`, `your-email`, `your-phone` y `your-message`.

## Ejemplo Contact Form 7

Agregar mediante un plugin de snippets o un plugin propio, no directamente en el tema.

```php
add_action('wpcf7_mail_sent', function ($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;
    $data = $submission->get_posted_data();
    $payload = [
        'externalId' => wp_generate_uuid4(),
        'name' => sanitize_text_field($data['your-name'] ?? $data['nombre'] ?? ''),
        'email' => sanitize_email($data['your-email'] ?? $data['correo'] ?? ''),
        'phone' => sanitize_text_field($data['your-phone'] ?? $data['telefono'] ?? ''),
        'companyName' => sanitize_text_field($data['empresa'] ?? ''),
        'subject' => sanitize_text_field($data['your-subject'] ?? $data['asunto'] ?? ''),
        'message' => sanitize_textarea_field($data['your-message'] ?? $data['mensaje'] ?? ''),
        'sourcePage' => wp_get_referer(),
        'consent' => !empty($data['acepta_privacidad']),
    ];
    wp_remote_post('https://crm-adentu.vercel.app/api/web-leads', [
        'timeout' => 8,
        'headers' => [
            'Content-Type' => 'application/json',
            'X-Web-Lead-Secret' => defined('ADENTU_CRM_WEBHOOK_SECRET') ? ADENTU_CRM_WEBHOOK_SECRET : '',
        ],
        'body' => wp_json_encode($payload),
    ]);
});
```

En `wp-config.php`:

```php
define('ADENTU_CRM_WEBHOOK_SECRET', 'mismo-valor-configurado-en-vercel');
```

## Puesta en produccion

1. Crear `WEB_LEAD_SECRET` como variable Sensitive en Vercel para Production y Preview.
2. Ejecutar `pnpm prisma migrate deploy` con la `DATABASE_URL` de produccion.
3. Desplegar el CRM.
4. Instalar el snippet y ajustar los nombres reales de los campos.
5. Enviar una consulta de prueba y confirmar que llega al correo y a `Leads web`.
6. Convertir el lead y verificar empresa, contacto, oportunidad e interaccion.
