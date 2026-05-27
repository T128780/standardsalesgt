# Checkpoint estable - Standard Sales GT

Fecha del checkpoint: 2026-05-26

Esta version queda marcada como estable:

- Diseno morado/azul correcto de StandardSales GT Guatemala.
- Formulario comprador funcional.
- Envio del formulario comprador a Google Apps Script operativo.
- Google Sheets recibiendo filas completas correctamente.
- Dominios `www.standardsalesgt.com` y `standardsalesgt.com` apuntando a la misma version publicada.

No modificar sin validar de nuevo:

- `app.js`
- `GOOGLE_SCRIPT_URL`
- Google Apps Script
- Google Sheets
- Logica de envio del formulario comprador

Regla para cambios futuros:

Cualquier cambio visual, de contenido, dominio, cache, Cloudflare o GitHub debe conservar el envio correcto del formulario comprador a Google Sheets. Antes de publicar cambios futuros, probar una solicitud real y confirmar que Google Sheets recibe una fila completa.
