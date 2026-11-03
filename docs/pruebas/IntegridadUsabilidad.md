# Pruebas de Integridad y Usabilidad — F1Fan

| Control | Valor |
|---|---|
| Rama | `test/integridad-usabilidad`, creada desde `feature/testing-plan-maestro` (`febc994`) |
| Corte | 2026-11-02, America/Santiago |
| Alcance | Consistencia de estado, almacenamiento, navegación, accesibilidad y comportamiento ante errores |
| Suites | [`__tests__/integridad-usabilidad/`](../../__tests__/integridad-usabilidad/) |
| Regresiones | [`__tests__/regresiones/CorreccionesIntegridadUsabilidad.test.js`](../../__tests__/regresiones/CorreccionesIntegridadUsabilidad.test.js) |
| Referencia visual | Mockups de Claude Design `F1FAN - Pantallas.dc.html` (16 pantallas estáticas) |
| Correcciones aplicadas | Primera ronda: IU-01 a IU-05 (P1/P2). Segunda ronda: cierre de IU-03, IU-08 e IU-14 (interruptores y escuderías) y registro de diagnóstico en `ErrorBoundary`. El resto queda propuesto, no aplicado |

## 1. Cómo ejecutar

```powershell
npm test
npm run test:qa -- --runInBand
npm run test:qa -- --runInBand __tests__/integridad-usabilidad/Accesibilidad.test.js
```

| Comando | Configuración | Alcance | Resultado esperado |
|---|---|---|---|
| `npm test` | `jest.config.js` | Pruebas originales y regresiones de `__tests__/regresiones/`; ignora `__tests__/integridad-usabilidad/` | Todo aprobado. Un fallo es una regresión real |
| `npm run test:qa` | `jest.qa.config.js` (reutiliza la configuración base) | Solo `__tests__/integridad-usabilidad/` | Fallan únicamente las pruebas marcadas con `// DEFECTO:` |

`jest.unit.config.js` conserva su alcance (componentes, modelos, utilidades, servicios y almacenamiento).

## 2. Resultados

| Suite | Pruebas | Fallidas iniciales | Fallidas tras corregir IU-01 a IU-05 | Fallidas tras la segunda ronda |
|---|---|---|---|---|
| `EstadoConsistencia.test.js` | 31 | 1 | 1 | 1 |
| `Almacenamiento.test.js` | 41 | 11 | 7 | 5 |
| `Navegacion.test.js` | 22 | 1 | 0 | 0 |
| `Accesibilidad.test.js` | 122 | 84 | 83 | 83 |
| `ManejoErrores.test.js` | 76 | 14 | 12 | 8 |
| **Total `npm run test:qa`** | **292** | **111** | **103** | **97** |

- `npm test`: 365 pruebas en 32 suites (349 originales + 16 de regresión), todas aprobadas. Las 349 originales siguen aprobadas tras ambas rondas.
- La segunda ronda hizo pasar 6 pruebas de la carpeta de calidad: 2 de `Almacenamiento.test.js` (IU-08, fallo de `getItem` y de `setItem` en `toggleEscuderiaFavorita`) y 4 de `ManejoErrores.test.js` (IU-14: escudería en Clasificación, escudería en Favoritos e interruptores de Favoritos y Perfil).
- Las pruebas fallidas son **intencionales**: verifican el comportamiento esperado y fallan por un defecto real del producto. Cada bloque fallido (`test` o `test.each`) tiene un comentario `// DEFECTO:` encima: 17 marcadores cubren los 97 casos fallidos y ningún caso falla fuera de un bloque marcado. En 12 bloques fallan todos los casos; los 5 barridos de `Accesibilidad.test.js` (controles, objetivos táctiles, tamaño de texto, encabezados y contraste) recorren todas las pantallas o pares de colores, y su marcador describe solo los casos que fallan. Cuando una corrección hace pasar un bloque, su marcador se reemplaza por un comentario `// Regresión IU-xx:`. No se usan `skip`, `todo` ni `test.failing`.
- Las regresiones de `__tests__/regresiones/` fijan con aserciones positivas el comportamiento corregido (IU-01 a IU-05, IU-08 e IU-14).
- Determinismo: la carpeta de calidad y el archivo de regresiones dieron resultados idénticos en dos ejecuciones, sin advertencias `act()` ni `console.error`.
- **Flakiness preexistente:** en 1 de 5 ejecuciones de la suite original falló una prueba que en las otras 4 pasó. No se reprodujo ni se identificó. Se recomienda revisar los tiempos de espera de las pruebas de pantallas bajo carga.

Utilidades en `helpers/`: `contrast.js` (razón de contraste WCAG 2.1), `arbolAccesible.js` (recorre el árbol renderizado: roles, nombres accesibles, tamaños de fuente y áreas táctiles) y `entorno.js` (fetch simulado, modos de fallo, navegación simulada y reinicio de servicios). La navegación se prueba con el `<AppNavigator />` real. El archivo de regresiones reutiliza `entorno.js`.

## 3. Defectos encontrados

Severidad según la matriz 4.2 del [Plan Maestro](PlanMaestro-F1Fan.md). Los IDs `IU-xx` son provisionales; pueden renumerarse como DEF-009 en adelante en [Defectos.md](Defectos.md). I = integridad, U = usabilidad, A = accesibilidad, N = navegación.

### 3.1. Críticos y mayores (P1/P2)

| ID | Sev. | Tipo | Ubicación | Defecto | Corrección propuesta |
|---|---|---|---|---|---|
| IU-01 | P1 | U | `App.js:9-23` | No hay error boundary: si una pantalla falla al renderizar, se desmonta toda la app sin interfaz alternativa | Envolver el navegador en un `ErrorBoundary` con mensaje en español y botón "Volver a intentar" |
| IU-02 | P2 | I | `LocalStorageManager.js:246-253` | Si la lectura de escuderías falla o el JSON está corrupto, devuelve `['mercedes','mclaren']` y Favoritos las muestra como elegidas por el usuario | Devolver `[]` o propagar el error; nunca valores inventados |
| IU-03 | P2 | I | `LocalStorageManager.js:320-330`, `:343-353`; `PerfilScreen.js:35-45`; `FavoritosScreen.js:77-83` | `guardarAjustes`/`guardarAlertas` sobrescriben las preferencias reales con valores por defecto si la lectura previa falla (pérdida de datos). Perfil y Favoritos envían su estado completo, que tras una carga fallida contiene los valores por defecto | Si la lectura falla, no escribir; devolver `null` y avisar. Enviar solo la clave modificada |
| IU-04 | P2 | I | `PerfilPilotoScreen.js:11`, `:14-19` | Sin parámetros muestra a George Russell (`?? 63`) y permite guardarlo como favorito | Quitar el ID por defecto; mostrar el estado "Piloto no disponible" y deshabilitar el favorito |
| IU-05 | P2 | A | `PerfilPilotoScreen.js:85`, `PerfilScreen.js:50`, `DriverCard.js:47-49`, `Switch` en `FavoritosScreen.js:192-246` y `PerfilScreen.js:110-140` | Controles con solo ícono o interruptores sin nombre accesible: el lector de pantalla no puede anunciarlos | `accessibilityRole` + `accessibilityLabel` (p. ej., "Volver", "Marcar favorito", nombre del ajuste) |
| IU-06 | P2 | U | `PerfilScreen.js:110-158` | "Evitar spoilers", "Modo experto" y "Hora Local de Chile" se guardan, pero ninguna otra pantalla los lee: la interfaz promete un efecto que no ocurre | Consumir los ajustes en Clasificación, DetalleGP y horarios, o rotularlos como "Próximamente" |
| IU-07 | P2 | U | `FavoritosScreen.js:178-253` | Las alertas prometen "Aviso inmediato", pero el proyecto no incluye `expo-notifications` ni otro mecanismo de aviso | Implementar las notificaciones o rotular la sección como demostración |

#### Estado de las correcciones

| ID | Estado | Cambio aplicado |
|---|---|---|
| IU-01 | Corregido | Nuevo `src/components/ErrorBoundary.js`, que envuelve `<AppNavigator />` en `App.js`. Muestra un mensaje en español con `role="alert"` y un botón "Volver a intentar" que reinicia el contenido. En la segunda ronda se añadió `componentDidCatch`, que registra el error y `info.componentStack` con `console.warn` y el prefijo `[ErrorBoundary]` (no `console.error`, porque `EstadoConsistencia.test.js` exige que `console.error` quede en silencio) |
| IU-02 | Corregido | `obtenerEscuderiasFavoritas` ya no inventa favoritas: si la lectura falla o el dato es inválido, rechaza con un mensaje en español. Favoritos y Clasificación capturan el rechazo, muestran el aviso y mantienen visible el resto del contenido |
| IU-03 | Corregido | Primera ronda: nueva lectura interna `_leerPreferencia`; si `getItem` falla, `guardarAjustes`/`guardarAlertas` no escriben y devuelven `null`. Segunda ronda: Perfil (interruptores y unidades) y Favoritos (alertas) envían solo la clave modificada, de modo que los valores por defecto mostrados tras una carga fallida ya no pisan las claves guardadas. `obtenerAjustes`/`obtenerAlertas` conservan su contrato |
| IU-04 | Corregido | Sin parámetros, PerfilPiloto muestra "Piloto no disponible" con el botón Volver operativo y el favorito deshabilitado |
| IU-05 | Corregido en los elementos indicados | Rol y nombre accesible en los botones Volver de PerfilPiloto y Perfil, en la estrella de `DriverCard` y en los 7 `Switch`. Cinco pruebas de `Accesibilidad.test.js` siguen fallando por otros controles de esas pantallas (IU-16, IU-17) |
| IU-06, IU-07 | Pendiente | Requieren una decisión de producto: implementar la funcionalidad o rotularla como "Próximamente" o demostración |
| IU-08 | Corregido | `toggleEscuderiaFavorita` ya no informa `[]` ante un fallo: si falla la lectura, rechaza con un mensaje en español; si falla la escritura, devuelve la lista guardada sin cambios. Si lo guardado no es JSON legible o tiene forma inválida, un cambio explícito del usuario lo reemplaza por una lista válida (`[]` más la escudería elegida) y el aviso desaparece al recargar |
| IU-14 | Corregido (interruptores y escuderías) | Perfil y Favoritos revierten el interruptor y muestran un `Alert` en español si el guardado devuelve `null`. Clasificación (`handleToggleTeamFavorite`) y Favoritos (`removeFavTeam`) detectan el rechazo o la lista sin cambios, muestran un `Alert` en español y recargan lo guardado |

Pruebas existentes actualizadas:

| Prueba | Antes | Ahora |
|---|---|---|
| `LocalStorageManager.test.js:299-312` ("informa el fallo sin inventar escuderías si los datos están corruptos", IU-02) | Esperaba `['mercedes','mclaren']` | Espera el rechazo con el mensaje en español |
| `LocalStorageManager.test.js:314-344` ("maneja errores al modificar escuderías favoritas", IU-08) | Esperaba `[]` si fallaba `setItem` | Si falla `setItem`, espera la lista guardada (`['mclaren']`); si falla `getItem`, espera el rechazo; lo guardado no cambia |
| `FavoritesCompatibility.test.js:89-93` (IU-08) | "no sobrescribe escuderías corruptas al intentar modificarlas": esperaba `[]` y el valor corrupto intacto | "un cambio explícito repara escuderías corruptas…": espera `['ferrari']` y `'["ferrari"]'` guardado |

### 3.2. Menores (P3)

| ID | Tipo | Ubicación | Defecto | Corrección propuesta |
|---|---|---|---|---|
| IU-08 | I | `LocalStorageManager.js:262-292` | `toggleEscuderiaFavorita` devuelve `[]` ante un error, aunque lo guardado no cambió; con el valor guardado corrupto no hay forma de repararlo desde la interfaz | Propagar el error o devolver la lista previa con indicador de fallo |
| IU-09 | I | `LocalStorageManager.js:303` (`_leerPreferencia`, usada por `obtenerAjustes` y `obtenerAlertas`) | Ajustes y alertas guardados no se completan con valores por defecto ni se valida su forma (`null`, `[]` o texto se devuelven tal cual) | `{ ...DEFAULTS, ...parsed }` solo si `parsed` es un objeto |
| IU-10 | I | `LocalStorageManager.js:320-353` | Guardados parciales concurrentes de ajustes o alertas pierden un cambio (no usan la cola `updatePreferences`) | Ejecutarlos dentro de `updatePreferences` |
| IU-11 | I | `LocalStorageManager.js:114-120` | Una entrada de caché sin `timestamp` numérico nunca expira (`NaN`) | Validar `typeof payload.timestamp === 'number'` y la presencia de `data` |
| IU-12 | I | `F1DataService.js:125`, `:241`; `HomeScreen.js:43-45`, `:78` | Un HTTP 404 en Calendario hace que Inicio anuncie un problema de conexión aunque sus datos estén vigentes | Activar el modo sin conexión solo ante `TypeError`/`AbortError` |
| IU-13 | I | `LiveScreen.js:87`, `:99`, `:174`; `mockData.js:87` | En Vivo marca a Russell como favorito sin importar la elección del usuario | Derivar la estrella de los favoritos guardados |
| IU-14 | U | `ClasificacionScreen.js:95-105`; `FavoritosScreen.js:77-83`, `:95-103`; `PerfilScreen.js:35-45` | Si falla guardar una escudería o un interruptor, la interfaz cambia igual y no avisa | Revisar el resultado; si falla, revertir el estado y mostrar `Alert` |
| IU-15 | U/A | `ClasificacionScreen.js:158`, `ComparadorScreen.js:148`, `FavoritosScreen.js:129` | "Reintentar" sin rol accesible; en Favoritos el error no ofrece reintento | Botón "Reintentar" con `accessibilityRole="button"` en todos los estados de error |
| IU-16 | A | `Header.js:14`, `StandingsTable.js:33-51`, `:99`, `LiveScreen.js:51-66`, `:89`, `MasScreen.js:72`, `:93`, `:108`, `ComparadorScreen.js:92`, `FavoritosScreen.js:133`, `:158` | Controles táctiles sin `accessibilityRole`; segmentos sin `accessibilityState.selected` | Añadir el rol y el estado seleccionado |
| IU-17 | A | Avatar 38×38, flechas 34×34, limpiar búsqueda en Historial 16×16, "+ Añadir", filtros de Calendario | Áreas táctiles menores a 44×44 | `minWidth`/`minHeight` 44 o `hitSlop` |
| IU-18 | A | `Header.js:11` y títulos de cada pantalla | Títulos sin `accessibilityRole="header"` (solo AR lo usa) | Añadir el rol a títulos y encabezados de sección |
| IU-19 | A | `ClasificacionScreen.js:118-120`, `:145`, `ComparadorScreen.js:105`, `FavoritosScreen.js:129`, `OfflineBanner.js:10-12` | Errores y el aviso sin conexión no se anuncian | `accessibilityRole="alert"` y `accessibilityLiveRegion="polite"` |
| IU-20 | A | `colors.js:10`, `:12` | Contraste insuficiente: `textMuted` 3,63–4,14:1 y `primaryRed` como texto 3,53–4,03:1 (mínimo 4,5:1). El mockup usaba `#FF2A00` (~5,1:1) | `textMuted` → `#8B93A1` (≥5,19:1); rojo de texto → `#FF4D4D` (≥4,91:1) o el `#FF2A00` del mockup |
| IU-21 | U | `RaceCard.js:9`; `JolpicaCalendarAdapter.js` | Las carreras pasadas se ven como próximas: `RaceCard` exige `estado === 'Finalizado'` y el adaptador nunca lo asigna | Asignar el estado según la fecha UTC o compararla en `RaceCard` |
| IU-22 | N | `DetalleGPScreen.js:30`, `:35`, `:88` | "Seguir" un circuito es estado local: se pierde al salir | Persistirlo en `LocalStorageManager` o retirar el control |

IU-08 e IU-14 se corrigieron en la segunda ronda (ver "Estado de las correcciones" en 3.1). El resto de los defectos P3 sigue pendiente.

### 3.3. Triviales (P4)

| ID | Tipo | Ubicación | Defecto | Corrección propuesta |
|---|---|---|---|---|
| IU-23 | U | `ClasificacionScreen.js:120`, `ComparadorScreen.js:105`, `DetalleGPScreen.js:201` | Se muestran mensajes técnicos en inglés ("Network request failed") | Traducir los errores a mensajes en español |
| IU-24 | A | `BottomTabNavigator.js:30` (10 px), `TrackMap.js` (8 px) y otros 21 casos | Textos menores a 12 px | Mínimo 12 px; 11 px solo en rótulos secundarios |
| IU-25 | A | `LoadingScreen.js:8`, `HistorialWebScreen.js:156` | Indicador de carga sin nombre ni estado ocupado | `accessibilityLabel="Cargando"` y `accessibilityState={{ busy: true }}` |
| IU-26 | A | `colors.js:24` | `statusFinished` 2,54:1 (no se usa todavía: defecto latente) | `#6B7785` |

## 4. Diferencias con los mockups

El mockup es estático: no define estados de carga, error, vacío ni sin conexión (en eso la app está más completa) y no tiene atributos de accesibilidad. Diferencias relevantes para navegación y usabilidad:

| Severidad | Diferencia |
|---|---|
| P3 | La 4.ª pestaña del mockup es **STATS** (Comparador); en la app es **Calendario**. El Comparador queda accesible solo desde Inicio y Tablas |
| P3 | En el mockup la barra de pestañas se mantiene en las pantallas de detalle (Piloto, Circuito, Comparador, Favoritos, Perfil); en la app desaparece porque son pantallas del stack |
| P3 | Falta el acceso a RA desde En Vivo ("VER EN AR") |
| P3 | Falta el selector de temporada "2026 ▾" en Tablas y Calendario |
| P3 | Falta la tarjeta "Tu piloto favorito" en Inicio |
| P3 | Favoritos no admite circuitos ("EQUIPOS Y CIRCUITOS" en el mockup) |
| P4 | Copys distintos: "CAMBIAR PILOTOS" frente a "INTERCAMBIAR PILOTOS", y RESULTADOS frente a ANTERIORES |

La pestaña STATS y la barra en las pantallas de detalle son decisiones de diseño: conviene confirmarlas con el equipo antes de tratarlas como defectos.

## 5. Antes de aplicar correcciones

- Las pruebas existentes que fijaban los defectos corregidos ya se actualizaron (ver 3.1). Queda una que fija el comportamiento actual: `LocalStorageManager.test.js:173-178` (valores por defecto en la primera ejecución).
- **Decisión de producto pendiente:** un usuario nuevo ve Mercedes y McLaren como escuderías favoritas (`LocalStorageManager.js:44`). Una prueba existente lo trata como intencional, por eso no se escribió una prueba fallida.

## 6. Límites de esta evidencia

- No sustituye pruebas con TalkBack/VoiceOver: se verifica la presencia de propiedades, no el anuncio real. `role="alert"` no se anuncia solo en Android y las regiones vivas son solo de Android.
- Jest no ejecuta el layout de Yoga: las áreas táctiles se estiman desde los estilos (altura de línea de 1,35×) y se omiten los controles con tamaño flexible.
- No cubre escalado de fuentes del sistema, fondos semitransparentes compuestos, gesto o botón físico de retroceso, áreas seguras, desconexión real, cuota real de AsyncStorage ni la cámara de RA.
- No constituye una auditoría WCAG 2.1 AA ni una evaluación con participantes.
