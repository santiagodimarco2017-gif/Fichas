# Ficha Clínica · Animales de Compañía (FCV-UNR)

PWA mobile-first, offline-first, para digitalizar la Ficha Técnica de la
Cátedra de Clínica Médica y Quirúrgica de Animales de Compañía (FCV-UNR).
No requiere backend propio: todo el registro clínico vive en el dispositivo
(IndexedDB) y se respalda opcionalmente en OneDrive, Google Drive o un
webhook propio (n8n / Make / Power Automate).

Vive en `ficha-clinica/` dentro de este repositorio, como una app
independiente del tracker de correlativas que ya existía en la raíz.

## Arquitectura de archivos

```
ficha-clinica/
├── index.html          # shell de la PWA
├── manifest.json        # metadata instalable
├── sw.js                 # service worker (cache offline del app shell)
├── css/styles.css        # ajustes que Tailwind (CDN) no cubre + impresión
├── icons/                # íconos 192/512
└── js/
    ├── utils.js           # helpers: rutas anidadas, fechas, edad, dosis
    ├── db.js               # capa IndexedDB (pacientes, fichas, ajustes)
    ├── ficha-fcv.js        # estructura clínica troncal de cátedra
    ├── render.js           # generación de HTML por sección/pantalla
    ├── whatsapp.js         # resumen en lenguaje llano + enlace WhatsApp
    ├── pdf-export.js       # PDF membretado (jsPDF + autoTable)
    ├── cloud-sync.js       # OneDrive / Google Drive / Webhook
    └── app.js              # router, autoguardado y wiring de eventos
```

## Probarlo en la PC

No hace falta build ni instalar dependencias. Desde `ficha-clinica/`:

```bash
python3 -m http.server 8080
# o: npx serve .
```

Abrí `http://localhost:8080` en el navegador.

## Abrirlo desde el celular por Wi-Fi (misma red que la PC)

1. Con el servidor corriendo, buscá la IP local de tu PC:
   - Windows: `ipconfig` (campo "Dirección IPv4")
   - Mac/Linux: `ifconfig` o `ip addr` (algo como `192.168.x.x`)
2. En el celular (conectado al mismo Wi-Fi), abrí en el navegador:
   `http://192.168.x.x:8080`
3. **Agregar a pantalla de inicio:**
   - **Android (Chrome):** menú ⋮ → "Añadir a pantalla de inicio" → confirmar. Va a quedar como ícono nativo y abrir en modo standalone (sin barra del navegador).
   - **iPhone (Safari):** botón compartir (□↑) → "Agregar a inicio" → confirmar.

## Desplegar gratis en un clic

### GitHub Pages
1. En GitHub → **Settings → Pages**.
2. **Source:** rama `main` (o la que corresponda), carpeta `/ficha-clinica` si tu plan lo permite, o mové el contenido a una rama `gh-pages` dedicada.
3. Guardá; GitHub publica en `https://<usuario>.github.io/<repo>/ficha-clinica/`.

### Vercel
1. Importá el repositorio en [vercel.com/new](https://vercel.com/new).
2. **Root Directory:** `ficha-clinica`.
3. **Framework Preset:** "Other" (sitio estático, sin build).
4. Deploy. Cada push a la rama configurada re-despliega automáticamente.

Ambas opciones sirven el sitio por HTTPS, requisito para que el Service
Worker y el "Agregar a pantalla de inicio" funcionen correctamente.

## Configurar el respaldo en la nube

Entrá a **Ajustes (⚙️)** dentro de la app. Elegí uno de los tres conectores
(podés cambiarlo cuando quieras; las credenciales quedan solo en tu
dispositivo, en IndexedDB, nunca en un servidor de terceros):

### Opción rápida: Webhook (n8n / Make / Power Automate)
La app hace un `POST` con `{ carpeta, paciente, archivos: [{nombre, mime, base64}] }`
a la URL que configures. El flujo del lado del conector se encarga de crear
la carpeta y subir los archivos donde vos quieras (OneDrive, Drive, SharePoint, etc).

1. En n8n/Make/Power Automate, creá un flujo disparado por Webhook.
2. Decodificá cada `archivos[i].base64` y guardalo como archivo binario con el `nombre` indicado, dentro de la carpeta `carpeta` (creándola si no existe).
3. Copiá la URL pública del webhook y pegala en **Ajustes → Webhook → URL del Webhook**.

### OneDrive (Microsoft Graph / OAuth2 con MSAL)
1. Andá a [Azure Portal → App registrations → New registration](https://portal.azure.com).
2. Tipo de cuenta: "Cuentas en cualquier organización y cuentas Microsoft personales" (o el alcance que necesites).
3. **Redirect URI:** tipo "Single-page application (SPA)", con la URL exacta donde publicaste la app (ej. `https://tu-usuario.github.io/repo/ficha-clinica/index.html`).
4. En **API permissions**, agregá el permiso delegado `Files.ReadWrite` de Microsoft Graph.
5. Copiá el **Application (client) ID** y pegalo en **Ajustes → OneDrive → Client ID**.
6. La primera vez que uses "Respaldar en la nube" con OneDrive, se abre un popup de login de Microsoft.

### Google Drive (OAuth2 con Google Identity Services)
1. Andá a [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. Habilitá la **Google Drive API** en el proyecto.
3. Creá credenciales tipo **OAuth 2.0 Client ID**, aplicación tipo "Web application".
4. En **Authorized JavaScript origins**, agregá el dominio donde publicaste la app (ej. `https://tu-usuario.github.io`).
5. Copiá el **Client ID** y pegalo en **Ajustes → Google Drive → Client ID**.
6. La primera vez que uses "Respaldar en la nube" con Google Drive, se abre un popup de consentimiento.

En ambos casos, cada respaldo crea/usa la carpeta
`Historias_Clinicas/[Especie]_[NombrePaciente]_[Tutor]_[HC-ID]/` y sube
`historia_clinica.json` (respaldo estructurado) y `ficha_clinica.pdf`
(documento membretado).

## Funcionalidades clave

- **Autoguardado continuo** en IndexedDB: no hay botón "guardar", cada
  cambio se persiste localmente con debounce.
- **Modo offline-first:** el Service Worker cachea el app shell; funciona
  sin conexión (el respaldo en la nube obviamente requiere internet).
- **Semáforo clínico** en constantes vitales según rangos caninos/felinos.
- **Calculadora de dosis** integrada, basada en el peso cargado en la ficha.
- **Exportación a PDF** membretado de 3 páginas (jsPDF + autoTable).
- **Resumen para el tutor** en lenguaje llano, con envío directo por
  WhatsApp (`api.whatsapp.com/send`).
- **Modo oscuro** persistente para trabajar de noche.

## Notas

- Si tu red bloquea CDNs (Tailwind, jsPDF), la app puede fallar en
  cargar estilos o exportar PDF; en ese caso, descargá esos recursos y
  serví los `<script>`/`<link>` de `index.html` desde archivos locales.
- Los archivos adjuntos de métodos complementarios se guardan como
  `data:` URLs dentro de IndexedDB; para historiales con muchas fotos de
  alta resolución, considerá comprimir antes de adjuntar.
