# F1Fan: apertura offline del shell, Etapa 2

## Alcance y base

Repositorio: C:\Users\nikol\Documents\GitHub\F1FAN-pwa-investigacion.
Rama: feature/pwa-offline-shell. Base revisada: 1fc8768c8a34c54b567d97f3afdb9609b2faabc6.
Fecha: 23 de noviembre de 2026. La Etapa 1 es el antecedente histórico documentado en [Instalacion-Etapa1.md](./Instalacion-Etapa1.md).

Esta etapa prepara la interfaz estática para abrirse sin red tras una carga online y un precache completos. No incorpora datos deportivos offline nuevos, autenticación offline ni sincronización. Las pantallas, React Navigation, servicios, cachés de datos y AsyncStorage conservan su código.

La apertura offline en un navegador y la reapertura desde un icono instalado son comprobaciones distintas. Los resultados se registran al final; una prueba de Jest con mocks no demuestra instalación ni apertura real offline.

## Solución elegida

Service worker propio y generador pequeño con módulos incluidos en Node, sin añadir dependencias ni actualizar Expo/RN. Workbox también permite precache, pero para este alcance acotado se opta por una lista estricta y comprobaciones explícitas de integridad. La exportación sigue usando el CLI instalado de Expo SDK 51 y Metro.

Archivos:

- package.json: build:web exporta con Expo y luego ejecuta scripts/generate-sw.cjs.
- vercel.json: utiliza ese mismo comando, establece cabeceras de worker/manifiesto y limita el fallback SPA.
- public/index.html: añade un script web de registro, conservando la plantilla y la entrada de Expo.
- public/register-sw.js: registra /sw.js, con scope / y updateViaCache none, tras cargar una exportación de producción en contexto seguro compatible. No intenta registrarlo en el servidor de desarrollo de Metro.
- scripts/generate-sw.cjs: obtiene las rutas reales de dist, calcula SHA-256, valida referencias y escribe sw.js y pwa-precache.json.
- scripts/pwa/sw-template.js: lógica revisable de instalación, activación y lectura del shell.
- scripts/check-pwa.cjs: conserva las comprobaciones de Etapa 1 y verifica inventario, worker y reglas de Vercel.
- serve.pwa.json: configura el servidor local para entregar archivos sin redirecciones automáticas ni listado de directorios.
- __tests__/pwa/OfflineShell.test.js: prueba generación, integridad, aislamiento de red, fallos y registro con dependencias externas simuladas.

dist es una salida regenerable e ignorada por Git. No editar ni publicar un sw.js fabricado manualmente en public.

## Inventario y límites de caché

Se generan rutas desde los archivos reales exportados, incluidos los nombres con hash de Expo. Se incluyen index.html, registro web, manifiesto, favicon y extensiones estáticas admitidas dentro de /_expo/, /assets/ e /icons/: JS, CSS, imágenes, fuentes y medios/wasm. No se incluyen mapas de código fuente, archivos de entorno, JSON de datos, metadata.json ni el informe o worker generados.

Cada entrada contiene URL, tamaño y SHA-256. La versión se calcula a partir del inventario y del código de la plantilla; también cambia si solo se corrige el worker. Repetir la generación sin cambiar entradas conserva la misma versión. El informe pwa-precache.json permite inspeccionarlo; no es una base de datos ni contiene preferencias o sesiones.

Solo se responde a GET del mismo origen, sin parámetros, Authorization o Range, y para rutas que están en el inventario. / abre el index.html de esa compilación. La navegación interna actual ocurre en React Navigation, sin nuevas URL enlazadas.

No se interceptan Jolpica, OpenF1, Supabase, POST, rutas /api o /auth, solicitudes de cuentas o archivos desconocidos. No se agrega caché de respuestas de estas API ni se modifica su almacenamiento existente.

## Instalación, integridad y versiones

1. install descarga cada recurso con credenciales omitidas, sin redirecciones y evitando la caché HTTP.
2. Comprueba HTTP 200, URL final, tipo de contenido cuando corresponde y SHA-256 de los bytes. Solo después lo guarda.
3. Si falla un recurso, elimina únicamente la nueva caché parcial y falla la instalación. Una versión anterior permanece disponible.
4. Con el precache completo, el navegador puede activar la primera instalación.
5. Una versión posterior queda waiting mientras existan ventanas controladas por la anterior. No se usan skipWaiting ni clients.claim.
6. Al cerrar todas esas ventanas, el navegador puede activar la nueva versión. activate elimina solo cachés anteriores con el prefijo f1fan-shell-v1-.
7. Las lecturas usan primero la caché de esa versión. Si falta una entrada y hay red, solo se recupera si sus bytes coinciden con el inventario de la misma compilación. No se mezcla un bundle nuevo con HTML viejo.

La consola informa el registro activo o un fallo de preparación. Cuando detecta una actualización preparada, indica cerrar todas las ventanas de F1Fan. No hay un botón que fuerce recargar una sesión abierta.

La huella protege contra HTML de login de Vercel, fallback SPA servido para un JS inexistente, despliegues incoherentes y otros cambios de bytes. No sustituye HTTPS ni representa una protección de datos de usuario.

## Sin copia disponible

Una primera visita sin internet no puede instalar el worker ni descargar la aplicación. Hay que realizar primero una carga online completa y esperar su activación.

Si el worker sigue registrado pero falta el HTML cacheado y no se puede recuperar su versión, devuelve HTTP 503 con un mensaje para reconectar y preparar la copia. Un recurso estático ausente también devuelve 503; no se fabrica una respuesta de API ni se combina con otra versión.

Si el navegador elimina tanto almacenamiento como registro, aparecerá su propia página de falta de conexión. Cuotas, modo privado, limpieza manual y políticas del sistema pueden impedir conservar la copia. No hay garantía de almacenamiento indefinido.

## Compilación y verificación

Desde la raíz:

~~~powershell
npm run build:web
npm run pwa:check
npm test -- --runInBand
git diff --check
git status --short
~~~

No instalar nuevos paquetes. El build falla si no puede completar la generación. pwa:check vuelve a calcular el inventario y compara el worker generado con los archivos actuales, detectando salidas obsoletas.

## Servidor local de pruebas

Desde la raíz del repositorio, utilizar serve.pwa.json:

~~~json
{
  "cleanUrls": false,
  "directoryListing": false
}
~~~

Detener la instancia anterior de serve con Ctrl+C antes de ejecutar el comando corregido:

~~~powershell
npx serve dist -l 8080 --config "C:\Users\nikol\Documents\GitHub\F1FAN-pwa-investigacion\serve.pwa.json"
~~~

Mantener esta terminal abierta y acceder a http://localhost:8080. El archivo de configuración es exclusivamente para el servidor local; no cambia el build ni las reglas de Vercel. La ruta absoluta evita ambigüedades al resolver el archivo de configuración desde la carpeta servida.

cleanUrls false permite entregar /index.html directamente como HTTP 200, sin redirigirlo a /index y luego a /. Es necesario porque el precache rechaza redirecciones mediante redirect error y verifica la URL final y SHA-256.

No añadir -s: su fallback global devuelve el HTML de F1Fan para recursos inexistentes. Con este comando, un recurso estático ausente debe devolver 404. React Navigation mantiene su navegación local actual, sin nuevas rutas URL.

La instancia de serve ya utilizada en las pruebas puede reutilizarse; no se añade una dependencia a package.json. El comando Node de [la guía de Etapa 1](./Instalacion-Etapa1.md#reproducción-local) sigue siendo una alternativa. No utilizar npm run web para comprobar el worker de producción y no abrir con file://.

Después de iniciar el servidor corregido, comprobar /index.html sin redirecciones y las 30 entradas del inventario. Si Chrome conserva el registro fallido en estado redundant, usar Unregister solo sobre ese worker y recargar con internet. No borrar todos los datos del sitio: los favoritos y sesiones deben conservarse. Mantener el mismo origen localhost:8080 durante la comprobación.

## Vercel y protección de Preview

Vercel debe ejecutar npm run build:web. Su salida sigue siendo dist. Así, la generación no queda omitida por utilizar únicamente npx expo export -p web.

- /sw.js: JavaScript y Cache-Control no-store, max-age=0.
- /register-sw.js, HTML e informe: revalidación mediante no-cache.
- /manifest.webmanifest: application/manifest+json y no-cache.
- El fallback a index.html solo se conserva para rutas sin extensión que no sean carpetas reservadas de recursos/API. Un sw.js, JS, icono o manifiesto inexistente debe devolver 404, sin transformarse en HTML.
- La instalación se mantiene en la raíz del origen; no se añade soporte para subdirectorios.
- Verificar estos comportamientos en un despliegue HTTPS real. La configuración local no demuestra que el CDN o las opciones del panel coincidan.

No se desactiva ni modifica Deployment Protection. Las descargas del precache omiten credenciales: un Preview protegido puede responder 401, redirigir o devolver una página de acceso. En ese caso el precache debe fallar, conservando el funcionamiento online habitual, y no se debe declarar lista la apertura offline. Usar un origen de pruebas autorizado que sirva los archivos públicos sin protección para esta validación.

Si una barra de Preview o un intermediario modifica el HTML exportado, la comprobación de huella también puede rechazarlo. Distinguir este caso de un fallo de React o de la lógica de caché; no eliminar la verificación para aceptar una página distinta. No insertar tokens de bypass en las URL ni en el inventario.

Cada origen tiene sus propios registros y almacenamiento. Probar dos compilaciones sobre el mismo origen estable para verificar actualizaciones; dos URL de Preview distintas no verifican la sustitución A → B.

## Protocolo manual de Chrome o Edge

Registrar sistema, navegador/versión, origen, fecha y compilación; no borrar favoritos existentes.

1. Servir la exportación por localhost o HTTPS. Abrir con internet, comprobar la interfaz y la navegación habitual.
2. En DevTools → Application → Service Workers, revisar /sw.js y esperar activated. En la consola debe aparecer el mensaje de copia estática preparada.
3. En Network verificar que /sw.js devuelve JavaScript real, y /manifest.webmanifest JSON. En Application → Cache Storage comprobar f1fan-shell-v1-..., sus entradas HTML, JS con hash, fuentes e iconos y ausencia de API o datos privados.
4. En la primera visita no es obligatorio que la página ya esté controlada: recargar con internet una vez y confirmar navigator.serviceWorker.controller. No confundir registro con precache completo.
5. Instalar desde el menú del navegador, si la plataforma lo permite. Cerrar todas las ventanas y pestañas de F1Fan. Para una prueba local, detener también el servidor con Ctrl+C: desconectar Wi-Fi no impide acceder a localhost. Desconectar realmente la red del equipo y abrir desde el icono instalado.
6. Confirmar que aparece la interfaz, recargar sin red y probar la navegación local. Anotar los errores/estados de falta de datos que presenten las pantallas. No esperar datos nuevos ni inicio de sesión válido sin Supabase.
7. Reconectar la red y, en una prueba local, reiniciar el servidor con el mismo comando. Usar los controles de consulta/Reintentar existentes o recargar. Comprobar que vuelven las llamadas a Jolpica/Supabase cuando la función lo requiera.
8. Capturar evidencias de activación, Cache Storage, apertura offline, recarga y recuperación.

El selector Offline de DevTools sirve para recargar la misma pestaña, pero no equivale a desconectar el equipo al cerrar y volver a abrir la aplicación. No usar “Update on reload”, “Bypass for network” ni el botón skipWaiting durante la prueba normal del ciclo de actualización.

## Segunda compilación y pruebas negativas

- A → B: preparar A online y mantener una ventana abierta. Publicar B en el mismo origen de pruebas; recargar la ventana A para disparar comprobación. Confirmar que B está instalada/waiting y que la ventana A mantiene sus recursos. Cerrar todas las ventanas A, volver a abrir y verificar B activa y limpieza de la caché A. Repetir una apertura sin red con B.
- B incompleta/404: en un entorno de pruebas controlado, provocar un recurso ausente. La instalación nueva debe fallar y A conservarse. No publicar intencionadamente una exportación rota en producción.
- Protección Preview: verificar que una respuesta 401/redirect/HTML de acceso no termina cacheada como index.html o JS de F1Fan.
- Primera visita sin red: usar un perfil de pruebas sin copia preparada; la apertura completa no es esperable.
- Copia eliminada: borrar solo Cache Storage del perfil de pruebas, sin tocar AsyncStorage/favoritos; observar el mensaje de preparación cuando corresponda.
- Métodos y orígenes: comprobar que las consultas API siguen siendo solicitudes de red y no aparecen en Cache Storage.
- Repetir en otros navegadores/sistemas compatibles después de Chrome/Edge. No extrapolar resultados entre plataformas.

## Limitaciones y Etapa 3

La interfaz puede navegar si sus módulos estáticos están preparados, pero Calendario, Clasificación y otras pantallas pueden mostrar sus estados existentes de error/carga si necesitan red y no disponen de caché deportiva previa. Cualquier recuperación automática depende del comportamiento ya implementado en esos servicios. No se añaden temporizadores ni reintentos de negocio.

No se garantiza autenticación offline, actualización de sesión, restauración de pantalla/temporada después de cerrar, persistencia indefinida de caché ni instalación equivalente en todos los sistemas. No se cambian los datos o la sincronización de favoritos.

Para Etapa 3 habrá que acordar qué datos deportivos pueden leerse offline, su antigüedad visible, expiración, diferencias entre temporadas y estados de error. Eso pertenece a los servicios de dominio y necesita pruebas de integridad separadas; no ampliar el fetch del worker a todas las API.

## Resultados de esta implementación

Verificaciones realizadas el 23 de noviembre de 2026:

- `npm run build:web`: aprobado. Expo exportó 600 módulos y el generador produjo `dist/sw.js` (11 577 bytes) y `dist/pwa-precache.json` (7 379 bytes).
- Inventario: **30 recursos, 5 516 280 bytes**. Incluye 2 JS (bundle Expo y registro), 19 fuentes TTF, 6 PNG, 1 ICO, 1 HTML y 1 manifiesto. No hubo CSS separado en esta exportación; los estilos forman parte del HTML/bundle.
- Compilación: `6c04fc8d3c40a3e75a55bf7d7ff016c12a843849109395c9e1d7ec1ed9e5e4a0`. El inventario contiene nombres reales exportados y sus huellas.
- `npm run pwa:check`: aprobado; manifiesto, iconos, entrada de Expo, copia pública, worker e inventario coherentes con la salida actual.
- Servidor HTTP local de la guía: `/sw.js` devuelve 200 y `text/javascript`, con código JavaScript válido; informe y manifiesto devuelven 200 y sus tipos JSON correspondientes. Las 30 respuestas estáticas coinciden con sus SHA-256. Dos rutas de JS inexistentes devuelven 404 en ese servidor local.
- `npm test -- --runInBand`: **476 pruebas aprobadas en 40 suites**, 0 snapshots. Incluye las 446 anteriores y 30 nuevas de PWA. Tiempo informado por Jest: 40,479 s; no es una medición de rendimiento de la aplicación.
- `git diff --check`: sin errores en la revisión del código aplicado.
- Sin cambios en `src/`, `App.js`, `app.json`, lockfile o configuración de Jest. Sin dependencias nuevas.
- Las pruebas del worker simulan red y CacheStorage. **No se ha registrado o activado el worker en un navegador durante esta ejecución ni se ha comprobado Cache Storage real, instalación, cierre/reapertura offline o actualización A → B**.
- Los resultados HTTP son locales; no representan un despliegue en Vercel ni una validación de su protección de Preview.
- No hay publicación, commit, push ni merge realizados por esta tarea.

## Referencias técnicas

- [Expo: PWA y exportación Metro](https://docs.expo.dev/guides/progressive-web-apps/). El soporte concreto de plantilla se comprobó además en el CLI instalado de SDK 51.
- [Ciclo de vida del service worker](https://web.dev/articles/service-worker-lifecycle): espera de nuevas versiones y activación sin sustituir clientes abiertos.
- [MDN: digest SHA-256](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest).
- [Vercel: configuración, rewrites y headers](https://vercel.com/docs/project-configuration/vercel-json).
