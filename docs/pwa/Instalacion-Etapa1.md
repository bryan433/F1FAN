# F1Fan: PWA instalable, Etapa 1

## Alcance

Preparación de instalación mediante Web App Manifest y metadatos HTML, con Expo SDK 51, Metro y React Native Web. Se conserva React Navigation y no se modifican pantallas, servicios, autenticación ni almacenamiento.

Instalable no significa disponible sin conexión. Esta etapa no agrega service worker, caché de recursos, sincronización en segundo plano ni telemetría. No se depende de `beforeinstallprompt`: se utilizan los mecanismos del navegador. La compatibilidad de instalación varía por navegador y sistema operativo.

Repositorio: `C:\Users\nikol\Documents\GitHub\F1FAN-pwa-investigacion`.
Rama: `feature/pwa-instalable`. Base inspeccionada: `96d11126a8be1eda26ddcd787c0d3622ca24176a`.
Fecha de comprobación: 17 de noviembre de 2026.

## Archivos y decisiones

| Archivo | Función |
| --- | --- |
| `public/manifest.webmanifest` | Nombre F1Fan, ID estable, inicio y alcance en `/`, idioma español, modo `standalone`, colores e iconos estándar. |
| `public/index.html` | Plantilla derivada del CLI instalado: mantiene `#root`, resets de React Native Web y los marcadores que Expo sustituye; agrega enlaces al manifiesto/icono Apple y metadatos. Expo sigue inyectando sus scripts de producción. |
| `public/icons/icon-192.png`, `icon-512.png` | PNG reales de 192 × 192 y 512 × 512, declarados con propósito `any`. |
| `public/icons/apple-touch-icon.png` | PNG de 180 × 180 para dispositivos Apple. |
| `public/icons/favicon-32.png` | PNG de 32 × 32 usado por la configuración web de Expo. |
| `app.json` | Nombre web, idioma, descripción, color de tema y favicon web válido. No cambia los iconos nativos. |
| `package.json` | Comandos de exportación y comprobación; no cambia versiones de dependencias. |
| `scripts/check-pwa.cjs` | Comprueba el manifiesto exportado, cabeceras/dimensiones PNG, copia de recursos, metadatos y scripts/punto de entrada de Expo. No certifica instalación en un sistema operativo. |

Los iconos son **provisionales**: monograma F1/FAN, fondo `#0D0F12`, rojo `#E10600` y blanco. No son un logotipo oficial de Fórmula 1. Deben sustituirse por la identidad definitiva antes de una publicación que lo requiera. No se declaran `maskable` porque no se ha diseñado ni validado una variante con ese propósito.

Se verificó el soporte de `public/index.html` en `node_modules/@expo/cli/build/src/start/server/webTemplate.js` y la plantilla en `node_modules/@expo/cli/static/template/index.html`, del CLI 0.18.31 instalado con Expo 51.0.39. El CLI resuelve los marcadores y añade el bundle; no hay rutas de JavaScript de producción escritas a mano.

## Reproducción local

Desde la raíz del repositorio:

```powershell
npm ci --no-audit --no-fund
npm run build:web
npm run pwa:check
npm test -- --runInBand
git diff --check
```

`npm ci` instala las versiones del lockfile. No es necesario si ya están instaladas. No hay nuevas dependencias para la PWA.

Para revisar el desarrollo se conserva `npm run web`. Para validar instalación hay que **servir la carpeta exportada `dist/` por HTTP en localhost o publicarla en HTTPS**; abrir `index.html` mediante `file://` no sirve. Puede utilizarse un servidor estático que ya esté disponible en el equipo. No sustituir esta comprobación por la del servidor de desarrollo.

En Windows/PowerShell, esta alternativa utiliza el Node ya requerido por Expo, sin instalar paquetes. Ejecutarla desde la raíz después de exportar, mantener la terminal abierta y detenerla con Ctrl+C:

```powershell
@'
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve('dist');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf'
};
http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403); return res.end();
    }
    if (pathname.endsWith('/')) file = path.join(file, 'index.html');
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  } catch { res.writeHead(400); res.end(); }
}).listen(8080, '127.0.0.1', () => console.log('F1Fan: http://127.0.0.1:8080'));
'@ | node
```

Abrir `http://127.0.0.1:8080`. Es un servidor de revisión local, sin despliegue ni configuración de producción; si el puerto está ocupado, cambiarlo. No representa una prueba de Vercel.

## Despliegue y Vercel

La configuración existente usa `npx expo export -p web`, salida `dist` y una reescritura de navegación a `index.html`. Se conserva: los archivos públicos exportados deben servirse como recursos estáticos y la navegación debe conservar su entrada SPA.

El manifiesto y los enlaces están preparados para publicar en la **raíz del dominio**. Un despliegue en un subdirectorio requiere revisar conjuntamente `id`, `start_url`, `scope`, rutas de iconos y la base de Expo; no está validado en esta etapa.

No se ha publicado ni modificado un proyecto de Vercel. Después de publicar, comprobar en Network:

- `/manifest.webmanifest`: HTTP 200, contenido JSON de este manifiesto y tipo de contenido de manifiesto/JSON; no el HTML del fallback SPA.
- `/icons/icon-192.png`, `/icons/icon-512.png` y `/icons/apple-touch-icon.png`: HTTP 200, tipo `image/png`, imágenes válidas.
- `/index.html` y el bundle `/_expo/...`: HTTP 200, sin errores que impidan montar React.
- HTTPS válido, sin contenido mixto.

Si el servidor no reconoce `.webmanifest`, configurar su tipo `application/manifest+json`. No es necesario cambiar la reescritura sin comprobar primero su comportamiento real.

## Resultados comprobados

- Instalación inicial de dependencias con el lockfile: completada, sin nuevas versiones.
- Línea base de Jest antes de los cambios: **446 pruebas aprobadas en 39 suites**.
- `npm run build:web`: **aprobado**, salida en `dist/`, con entrada HTML procesada por Expo y bundle JavaScript de producción presente.
- `npm run pwa:check`: **aprobado**. Manifiesto, recursos públicos y referencias del HTML exportados correctamente.
- PNG decodificados con System.Drawing: **192 × 192, 512 × 512, 180 × 180 y 32 × 32**, según su función. Los nombres coinciden con el manifiesto, HTML y `app.json`; las copias exportadas coinciden con los originales.
- `npm test -- --runInBand` después de aplicar los cambios: **446 pruebas aprobadas en 39 suites; 0 snapshots**. Tiempo informado por Jest: 32,943 s; no es una medida de rendimiento de la aplicación.
- `git diff --check`: **sin errores**.
- Revisión del alcance: sin cambios en `src/`, tests, lockfile, configuración Jest o `vercel.json`. Calendario, Clasificación, Jolpica y Supabase conservan su implementación.
- La exportación emitió avisos sobre `NO_COLOR`/`FORCE_COLOR`, sin impedir la compilación. No hay un fallo de PWA confirmado en las comprobaciones ejecutadas.
- No se ha ejecutado una instalación desde el menú de un navegador, una regresión visual de la web exportada ni una validación HTTPS de Vercel. El verificador estructural no ejecuta React en un navegador.
- Instalación real en Windows, Android, macOS o iOS: **pendiente**. Las comprobaciones de archivos o una ejecución headless no equivalen a una instalación.

## Matriz de compatibilidad y comprobación

La tabla distingue soporte documentado de resultados realmente ejecutados. No se promete el mismo menú o experiencia en todos los sistemas.

| Navegador / sistema | Instalación prevista según la plataforma | Resultado en esta etapa |
| --- | --- | --- |
| Chrome / escritorio Windows, macOS y Linux compatibles | Menú de instalación de página/aplicación o icono de instalación si el navegador lo ofrece. Ventana independiente cuando se instala como app. | Instalación manual pendiente. |
| Chrome / Android | Menú Instalar aplicación o Añadir a pantalla de inicio, según la versión y las condiciones del sitio. | Dispositivo e instalación pendientes. |
| Edge / escritorio | Menú Aplicaciones → Instalar este sitio como una aplicación; icono de instalación cuando esté disponible. | Instalación manual pendiente. |
| Edge / móvil | Las opciones dependen del sistema y de la versión; comprobar el menú. En iOS puede utilizarse Safari. | No probado; no se garantiza instalación equivalente al escritorio. |
| Firefox / Windows | Firefox ofrece aplicaciones web en Windows: desde 143 para la distribución estándar y 150 para Microsoft Store, según Mozilla. Revisar la opción de aplicaciones web de la versión instalada. | Firefox no está instalado en este equipo; pendiente. |
| Firefox / macOS y Linux | La función de aplicaciones web descrita por Mozilla para Windows no se extiende automáticamente a estos sistemas. Mantener acceso web normal si no existe instalación. | Pendiente validar navegación web; no se promete ventana instalada. |
| Firefox / Android | Revisar el menú Instalar/Añadir a pantalla de inicio. La forma de acceso depende de si reconoce una app instalable o un acceso directo. | Dispositivo e instalación pendientes. |
| Firefox / iOS | Revisar opciones del sistema/navegador; Safari es la ruta de referencia documentada para añadir una web app al inicio. | Pendiente; no asumir soporte idéntico a Android. |
| Safari / macOS Sonoma 14 o posterior | Archivo o Compartir → Añadir al Dock; abrir la web app desde el Dock. | No hay macOS disponible; pendiente. |
| Safari / iPhone y iPad | Compartir → Añadir a pantalla de inicio; activar Abrir como app web si la versión ofrece esa opción. | Dispositivo e instalación pendientes. |
| Otros navegadores | Utilizar manifiesto estándar y menús nativos cuando sean compatibles. Si no ofrecen instalación, conservar la web normal. | Sin verificación específica. |

Chrome/Edge pueden ofrecer instalación desde sus menús sin un service worker. No se añade uno solo para provocar un aviso. Los criterios de los avisos automáticos y su disponibilidad varían: su ausencia no demuestra por sí sola que el manifiesto sea inválido.

## Guía de validación manual

1. Abrir el despliegue HTTPS o la exportación servida en `http://localhost`. Registrar navegador, versión, sistema, URL y fecha.
2. Antes de instalar, abrir Calendario y Clasificación, cambiar temporada, abrir un GP, usar Comparador y Favoritos. Confirmar que conservan su funcionamiento. Probar la autenticación Supabase con una cuenta de prueba cuando esté autorizada, sin incluir credenciales en las evidencias.
3. Revisar el manifiesto y los iconos en las herramientas del navegador. En Chrome/Edge: Application → Manifest. Registrar errores/advertencias; no confundir sugerencias opcionales como capturas o un icono maskable con campos obligatorios.
4. Usar el menú correspondiente a la tabla. En Chrome escritorio/Android o Edge, si no se ofrece instalación, revisar primero HTTPS, manifiesto, iconos y las limitaciones de esa versión. No exigir un botón propio basado en `beforeinstallprompt`.
5. Abrir desde el icono instalado. Confirmar nombre F1Fan, icono provisional, ventana independiente cuando el sistema lo permita y navegación sin desbordamientos. En Safari iOS, comprobar el área superior y el regreso entre pantallas.
6. Cerrar y volver a abrir; comprobar favoritos y sesión con datos de prueba. Registrar lo observado, sin asumir que el almacenamiento se comparte entre Safari y una app instalada en iOS.
7. Recargar la página de inicio. React Navigation no incorpora nuevas rutas URL en esta etapa; no se promete restaurar la pantalla o temporada tras cerrar la aplicación.
8. Sin instalar, comprobar que la web sigue funcionando. En plataformas sin instalación, esta es la alternativa prevista.
9. Desactivar la red solo para constatar la limitación: esta etapa **no garantiza arranque offline**. No atribuir al manifiesto las respuestas que provengan de la caché ya existente de servicios o del navegador.
10. Guardar capturas y resultados por plataforma; marcar como pendiente aquello que no se haya realizado. No borrar datos de favoritos existentes para hacer estas pruebas.

Una URL HTTP de la red local (por ejemplo, una IP del equipo para probar con el teléfono) no equivale a localhost seguro del dispositivo: utilizar HTTPS para verificar instalación móvil.

## Datos, autenticación y almacenamiento

- Jolpica conserva su cliente y caché actuales. Una PWA no elimina CORS, fallos HTTP, límites de la API ni la necesidad de conexión para datos nuevos.
- Supabase conserva su cliente y configuración. La instalación no crea un modo offline de autenticación. Al cambiar de dominio u origen, revisar las URLs de retorno admitidas y probar los flujos realmente utilizados. No se modifica el flujo de sesión ni se garantiza traslado automático de sesiones a todos los modos instalados.
- AsyncStorage en web depende del almacenamiento del navegador y de su origen. Dominios de preview y producción, protocolos y puertos distintos no comparten automáticamente datos. Navegación privada, borrado de datos y políticas del sistema pueden afectar su persistencia. No hay migración de datos entre orígenes en esta etapa.
- No se han agregado SQLite, PowerSync ni otro sistema paralelo de almacenamiento.

## Pendientes para la Etapa 2

Primero completar las instalaciones y regresiones manuales de la matriz sobre HTTPS. Después acordar, como un trabajo separado, el alcance offline: shell estático, datos de solo lectura con antigüedad visible, estrategia de actualización del service worker, exclusiones de autenticación/datos privados, errores de red, cuotas y pruebas de actualización. No interceptar ni almacenar indiscriminadamente solicitudes de Jolpica o Supabase.

No hay notificaciones push, instalación guiada propia, restauración de rutas, pruebas E2E de instalación ni validación de rendimiento/accesibilidad añadidas en esta etapa.

## Referencias

Consultadas para compatibilidad; no sustituyen las pruebas en dispositivos:

- [Expo: Progressive web apps](https://docs.expo.dev/guides/progressive-web-apps/).
- [Expo: personalización de Metro y public](https://docs.expo.dev/guides/customizing-metro/).
- [MDN: hacer una PWA instalable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
- [Chrome: cambios en los criterios de instalación](https://developer.chrome.com/blog/update-install-criteria).
- [Chrome DevTools: depurar PWA](https://developer.chrome.com/docs/devtools/progressive-web-apps).
- [Mozilla: aplicaciones web en Firefox para Windows](https://support.mozilla.org/en-US/kb/web-apps-firefox-windows).
- [Mozilla: acceso web desde la pantalla de inicio en Android](https://support.mozilla.org/en-US/kb/add-website-shortcut-your-home-screen-android).
- [Apple: usar sitios como apps en Mac](https://support.apple.com/en-ca/104996).
- [Apple: añadir sitios a la pantalla de inicio del iPhone](https://support.apple.com/guide/iphone/iphea86e5236/ios).
