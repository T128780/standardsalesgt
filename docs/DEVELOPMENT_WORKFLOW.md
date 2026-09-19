# Flujo seguro de desarrollo

## Base estable

- Producción (`main`): `2fe17149dda0d11d00bb6da49af08f2a34712085`
- Tag: `stable-formularios-simplificados-20260918`
- Apps Script: versión 51
- Catálogo: 63 marcas / 770 modelos
- Match: Marca + Línea + Categoría

`main` representa producción estable. Nunca se desarrolla directamente sobre `main`.

## Ramas

Todo cambio nuevo debe nacer desde `main` actualizado y realizarse en una rama independiente:

- `feature/nombre`: funcionalidad nueva.
- `fix/nombre`: corrección de un defecto.
- `chore/nombre`: mantenimiento, documentación o tareas internas.

No usar `force push`.

## Requisitos antes del merge

1. Actualizar la rama con los cambios recientes de `main`.
2. Revisar el diff completo y confirmar que no incluya archivos ajenos.
3. Ejecutar `docs/REGRESSION_CHECKLIST.md`.
4. Corregir cualquier fallo en la rama y repetir el checklist.
5. Hacer merge únicamente cuando todo el checklist tenga PASS.

Las funciones grandes o de alto riesgo, como Luna, deben usar un *feature flag* cuando sea posible para poder desactivarlas sin revertir cambios no relacionados.

## Apps Script

- Cada publicación debe crear una nueva versión.
- Nunca cambiar el Deployment ID ni la URL del Web App sin autorización expresa.
- Registrar el número de versión de Apps Script asociado a cada commit o versión frontend.
- Publicar backend y frontend coordinadamente cuando dependan entre sí.

## Google Sheets y datos

- No borrar columnas históricas.
- No modificar datos reales durante pruebas.
- Usar únicamente registros controlados e identificables cuando una prueba E2E requiera escritura.
- Preservar vendedores, solicitudes e históricos existentes.

## Seguridad

- No tocar, copiar ni registrar secretos, API keys o credenciales.
- Mantener intactas las configuraciones de Gupshup salvo autorización específica.
- No incluir credenciales en commits, logs, capturas o documentación.

## Rollback

- Preferir `git revert` de commits específicos.
- Evitar regresar todo el proyecto a commits antiguos.
- Confirmar el alcance del rollback y ejecutar nuevamente el checklist de regresión.
