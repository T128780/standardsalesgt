# 🚀 GUÍA COMPLETA PARA PRINCIPIANTES
## Cómo publicar Standard Repuestos GT en standardsalesgt.com

---

## ¿Qué vamos a hacer?

Vamos a poner tu página web en internet usando:
- **Cloudflare Pages** → donde se guarda y ejecuta tu página (gratis)
- **Tu dominio** → standardsalesgt.com (que ya tienes en Cloudflare)
- **GitHub** → donde subimos los archivos (gratis, solo es un paso intermedio)

El proceso completo toma unos 20 minutos la primera vez.

---

# PARTE 1 — Crear cuenta en GitHub

GitHub es donde guardamos los archivos de tu página.
Es gratis y solo lo necesitas como paso intermedio.

### Paso 1.1 — Ir a GitHub
- Abre tu navegador
- Ve a: **https://github.com**
- Clic en **"Sign up"** (esquina superior derecha)

### Paso 1.2 — Crear cuenta
- Escribe tu correo electrónico
- Crea una contraseña
- Elige un nombre de usuario (puede ser algo como `alfredogt` o `standardsalesgt`)
- Verifica tu correo cuando llegue el mensaje de GitHub

### Paso 1.3 — Crear un repositorio (carpeta en GitHub)
- Una vez dentro de GitHub, clic en el botón verde **"New"** o **"+ New repository"**
- En **"Repository name"** escribe: `standardsalesgt`
- Deja todo lo demás como está
- Clic en el botón verde **"Create repository"**

---

# PARTE 2 — Subir los archivos a GitHub

### Paso 2.1 — Abrir la carpeta del proyecto
- Descomprime el archivo ZIP que descargaste: `standardsalesgt.zip`
- Se creará una carpeta llamada `standardsalesgt` con todos los archivos

### Paso 2.2 — Subir archivos a GitHub
- En la página de tu repositorio recién creado en GitHub
- Busca el texto que dice **"uploading an existing file"** y haz clic ahí
- Se abrirá una pantalla para subir archivos

### Paso 2.3 — Arrastrar los archivos
- Abre la carpeta `standardsalesgt` en tu computadora
- Selecciona TODOS los archivos y carpetas (Ctrl+A en Windows, Cmd+A en Mac)
- Arrástralos al área que dice **"Drag files here"** en GitHub
- Espera que suban (puede tomar 1-2 minutos)

### Paso 2.4 — Confirmar la subida
- Baja al final de la página
- Verás un botón verde que dice **"Commit changes"**
- Haz clic en ese botón
- ✅ Tus archivos ya están en GitHub

---

# PARTE 3 — Conectar GitHub con Cloudflare Pages

### Paso 3.1 — Ir a Cloudflare
- Ve a: **https://dash.cloudflare.com**
- Inicia sesión con tu cuenta de Cloudflare (la misma donde está tu dominio)

### Paso 3.2 — Ir a Pages
- En el menú de la izquierda busca **"Workers & Pages"**
- Haz clic ahí
- Luego clic en la pestaña **"Pages"**
- Clic en el botón **"Create a project"**

### Paso 3.3 — Conectar con GitHub
- Verás dos opciones: **"Connect to Git"** y "Direct Upload"
- Clic en **"Connect to Git"**
- Clic en **"Connect GitHub"**
- Se abrirá una ventana de GitHub pidiendo permiso → clic en **"Authorize Cloudflare Pages"**
- Vuelves a Cloudflare automáticamente

### Paso 3.4 — Seleccionar tu repositorio
- Busca en la lista el repositorio **"standardsalesgt"** que creaste
- Clic en él para seleccionarlo
- Clic en **"Begin setup"**

### Paso 3.5 — Configurar el proyecto
Verás un formulario. Llénalo así:
- **Project name:** `standardsalesgt` (se llenará solo)
- **Production branch:** `main` (se llenará solo)
- **Framework preset:** selecciona **"None"**
- **Build command:** déjalo **vacío** (borra lo que haya)
- **Build output directory:** escribe `/` o déjalo vacío
- Clic en **"Save and Deploy"**

### Paso 3.6 — Esperar el deploy
- Cloudflare procesará tu página (30-60 segundos)
- Verás una animación de progreso
- Cuando termine verás ✅ **"Success"**
- Te dará una URL temporal como: `standardsalesgt.pages.dev`
- Puedes abrirla para verificar que funciona

---

# PARTE 4 — Conectar tu dominio standardsalesgt.com

Esta es la parte más importante. Así tu página se verá en tu dominio propio.

### Paso 4.1 — Ir a la configuración de tu proyecto en Pages
- En Cloudflare Pages, clic en tu proyecto **"standardsalesgt"**
- Clic en la pestaña **"Custom domains"**
- Clic en **"Set up a custom domain"**

### Paso 4.2 — Agregar tu dominio
- Escribe: `standardsalesgt.com`
- Clic en **"Continue"**
- Cloudflare te mostrará un mensaje — clic en **"Activate domain"**

### Paso 4.3 — También agregar www
- Repite el proceso pero con: `www.standardsalesgt.com`
- Clic en **"Continue"** → **"Activate domain"**

### Paso 4.4 — Esperar activación
- Cloudflare configurará todo automáticamente (puede tomar 5-30 minutos)
- Verás el estado cambiar de **"Initializing"** a **"Active"** ✅

### Paso 4.5 — Verificar
- Abre tu navegador
- Ve a: **https://standardsalesgt.com**
- ¡Tu página debe aparecer! 🎉

---

# PARTE 5 — Actualizar la página en el futuro

Cuando necesites hacer cambios (texto, precios, etc.):

1. Ve a tu repositorio en GitHub: `github.com/TU_USUARIO/standardsalesgt`
2. Haz clic en el archivo que quieres cambiar
3. Clic en el ícono de lápiz ✏️ (esquina superior derecha del archivo)
4. Haz los cambios
5. Clic en **"Commit changes"**
6. Cloudflare detecta el cambio automáticamente y actualiza tu página en 30 segundos

---

# RESUMEN RÁPIDO

```
Tu computadora → GitHub → Cloudflare Pages → standardsalesgt.com
   (archivos)    (almacén)   (servidor web)      (tu dominio)
```

1. ✅ Crear cuenta GitHub
2. ✅ Crear repositorio "standardsalesgt"
3. ✅ Subir todos los archivos del ZIP
4. ✅ Conectar GitHub con Cloudflare Pages
5. ✅ Agregar dominio personalizado
6. ✅ ¡Listo para recibir compradores en Guatemala!

---

# PREGUNTAS FRECUENTES

**¿Cuánto cuesta todo esto?**
- GitHub: GRATIS
- Cloudflare Pages: GRATIS (hasta 500 deploys/mes, más que suficiente)
- Tu dominio: ya lo tienes pagado

**¿Mi página funcionará en celulares?**
Sí. Está diseñada mobile-first y se puede instalar como app en Android.

**¿Puedo cambiar el número de WhatsApp del vendedor de prueba?**
Sí. En el archivo `app.js`, línea 4:
```javascript
const WA_VENDEDOR_PRUEBA = "50246494710";
```
Cambia ese número por el tuyo.

**¿Dónde se guardan las solicitudes?**
En el MVP, se guardan en el navegador (localStorage).
Para la versión real con base de datos, conectamos Supabase.

**¿Cuándo llega alguien a la página, yo lo veo?**
Por WhatsApp sí — cada solicitud abre WhatsApp al vendedor de prueba.
Para ver estadísticas de visitas, podemos agregar Google Analytics.
