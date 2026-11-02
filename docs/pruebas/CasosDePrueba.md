# Casos de prueba de F1Fan

Versión 0.3 — actualización posterior a DEF-008, corte documental 2026-11-02, America/Santiago. Véanse el [plan](PlanMaestro-F1Fan.md), los [resultados](InformeResultados.md), los [defectos](Defectos.md), las [actas](ActasPruebasManuales.md) y las [evidencias de integración](EvidenciasIntegracion.md).

AUT-001 a AUT-048 son identificadores de documentación QA, no identificadores de requisitos ni 48 pruebas nuevas. Cada ficha resume uno o varios tests existentes; las variantes test.each cuentan como ejecuciones separadas en Jest. Este catálogo de casos principales no enumera individualmente las **330 pruebas aprobadas en 29 suites**. El subconjunto unitario contiene **225 pruebas en 22 suites**; su cobertura es **85,71% instrucciones, 84,41% ramas, 87,81% funciones y 85,71% líneas**: mínimo del 80% superado en las cuatro métricas del alcance unitario configurado.

Precondición común automatizada: dependencias existentes instaladas, configuración Jest actual y estado aislado según beforeEach/afterEach de la suite. Todos los resultados AUT indicados como APROBADO se sustentan en las ejecuciones repetidas el **2026-11-02 durante esta actualización documental**, con código 0 y sin omisiones. Los tests AUT usan respuestas controladas; no realizan HTTP externo real. Los nombres de requisitos se limitan a la trazabilidad respaldada en la sección 1.3 del plan; donde falta un identificador se indica expresamente. La selección múltiple es una exigencia explícita del usuario, sin ID nuevo de requisito asignado.

## Casos automatizados principales

### AUT-001 — Mensajes de LoadingScreen

- **Requisito:** sin ID formal verificado; comportamiento del componente.
- **Tipo / fuente:** funcional, componente; [LoadingScreen.test.js](../../__tests__/components/LoadingScreen.test.js).
- **Precondiciones:** render de LoadingScreen, sin servicios externos.
- **Pasos:** renderizar con message; consultar texto; en el otro caso renderizar sin message y consultar el predeterminado.
- **Datos:** `Cargando calendario...`; ausencia de message.
- **Resultado esperado:** muestra el mensaje recibido o `Cargando datos de F1...` según corresponda.
- **Resultado real:** **APROBADO**, ambas variantes existentes.

### AUT-002 — Visibilidad de OfflineBanner

- **Requisito:** sin ID formal verificado para el componente; apoyo a la presentación offline.
- **Tipo / fuente:** funcional, componente; [OfflineBanner.test.js](../../__tests__/components/OfflineBanner.test.js).
- **Precondiciones:** componente real, sin consultar el estado real de la red.
- **Pasos:** render sin visible; comprobar ausencia; rerender con visible=true; comprobar texto; rerender con false y comprobar ausencia.
- **Datos:** `Modo sin conexión - Mostrando datos guardados en caché`.
- **Resultado esperado:** la advertencia depende de visible y no queda en pantalla tras ocultarla.
- **Resultado real:** **APROBADO**. No demuestra detección real de desconexión.

### AUT-003 — Pulsación de SessionCard

- **Requisito:** sin ID formal verificado; contrato session/onPress.
- **Tipo / fuente:** funcional, componente; [SessionCard.test.js](../../__tests__/components/SessionCard.test.js), `ejecuta onPress una vez al pulsar la tarjeta`.
- **Precondiciones:** sesión válida y callback jest.fn().
- **Pasos:** renderizar la tarjeta; pulsar `Practice 2` mediante fireEvent.press; comprobar el contador de llamadas.
- **Datos:** tipo=Practice 2, dia=Viernes, horaChile=12:00, estado=En curso, esLive=true, vueltaActual=12.
- **Resultado esperado:** onPress se invoca exactamente una vez.
- **Resultado real:** **APROBADO**. La sesión es controlada, no una confirmación de carrera actual.

### AUT-004 — Contenido, datos ausentes y estados de SessionCard

- **Requisito:** sin ID formal verificado; no completar datos desconocidos ni inferir estado oficial.
- **Tipo / fuente:** funcional e integridad; [SessionCard.test.js](../../__tests__/components/SessionCard.test.js).
- **Precondiciones:** sesiones controladas con estados explícitos, reloj independiente de una API.
- **Pasos:** renderizar variantes completas/incompletas; consultar horario, estado y vuelta; comprobar ausencia de respaldos; contrastar fechas pasadas/futuras con el estado recibido.
- **Datos:** vueltaActual=0 y null; sesión sin dia/hora; date=2026-11-08; Programado/Programada; Estado no confirmado; Finalizado; En curso.
- **Resultado esperado:** conserva vuelta cero y estados confirmados; no inventa Hoy, 09:00 ni VUELTA 12; una fecha por sí sola no activa EN VIVO/FINALIZADO.
- **Resultado real:** **APROBADO** para las variantes implementadas.

### AUT-005 — Contador con instante conocido o desconocido

- **Requisito:** sin ID formal verificado; comportamiento de CountdownTimer.
- **Tipo / fuente:** funcional y límites; [CountdownTimer.test.js](../../__tests__/components/CountdownTimer.test.js).
- **Precondiciones:** fake timers y reloj fijo en 2026-11-01T12:00:00Z.
- **Pasos:** renderizar con objetivo a 61 segundos; avanzar 2 segundos; alcanzar otro objetivo de 1 segundo; rerender con nueva fecha; probar targetDate=null.
- **Datos:** GP/circuito sintéticos, round=3, totalRounds=22; objetivos a 61, 1 y 120 segundos.
- **Resultado esperado:** cuenta y se actualiza; al llegar informa inicio programado alcanzado sin confirmar estado; sin fecha no muestra contador ficticio.
- **Resultado real:** **APROBADO**. No mide precisión del reloj de un dispositivo real.

### AUT-006 — Conversión UTC a Santiago y fechas inválidas

- **Requisito:** HU-02, respaldado por README y timezone.
- **Tipo / fuente:** funcional e integridad temporal; [timezone.test.js](../../__tests__/utils/timezone.test.js).
- **Precondiciones:** utilidades reales; Intl real salvo el caso que simula su fallo.
- **Pasos:** convertir instantes de verano/invierno y cruces de fecha; combinar fechas/horas UTC; validar bisiestos; simular Intl no disponible.
- **Datos:** 2026-01-15T15:00:00Z → 12:00; 2026-07-15T15:00:00Z → 11:00; 2026-07-15T02:30:00Z → 2026-07-14 22:30; fecha imposible y hora 25:00:00Z.
- **Resultado esperado:** respeta America/Santiago y fecha local; rechaza datos inválidos y deja desconocido cuando no puede convertir.
- **Resultado real:** **APROBADO**. No se contrastó con una sesión de API real durante esta ejecución.

### AUT-007 — Identidad del GP en el adaptador

- **Requisito:** sin ID formal verificado para identidad; HU-02 solo para su comprobación horaria complementaria.
- **Tipo / fuente:** integridad; [JolpicaCalendarAdapter.test.js](../../__tests__/services/JolpicaCalendarAdapter.test.js).
- **Precondiciones:** adaptador y modelos reales; fixture calendarRace.
- **Pasos:** adaptar ronda 07; comprobar modelos, identificadores y asociación de sesiones; intentar adaptar una temporada diferente a la solicitada.
- **Datos:** season=2026, round='07', ID esperado=jolpica:2026:07; respuesta incompatible season=2025.
- **Resultado esperado:** conserva temporada y ronda originales y rechaza una identidad incompatible; cada sesión corresponde al GP correcto.
- **Resultado real:** **APROBADO**.

### AUT-008 — Sesiones opcionales y separación entre GP

- **Requisito:** sin ID formal verificado; contrato de calendario/sesiones.
- **Tipo / fuente:** integridad y límites; [JolpicaCalendarAdapter.test.js](../../__tests__/services/JolpicaCalendarAdapter.test.js).
- **Precondiciones:** raw races controlados con prácticas, clasificación y sprint opcionales.
- **Pasos:** adaptar y ordenar sesiones; probar SprintQualifying/SprintShootout; retirar prácticas y horas; adaptar dos GP y comparar sus sesiones.
- **Datos:** fixtures de noviembre de 2026, prácticas fuera de orden, hora ausente, dos rondas distintas.
- **Resultado esperado:** orden cronológico, sin duplicar sprint ni agregar prácticas ausentes; horas/duración/vueltas desconocidas; sin sesiones de respaldo de otro GP.
- **Resultado real:** **APROBADO**.

### AUT-009 — Temporadas disponibles de Jolpica

- **Requisito:** sin ID formal verificado; función pública getSeasons.
- **Tipo / fuente:** funcional, servicio con API simulada; [JolpicaService.test.js](../../__tests__/services/JolpicaService.test.js).
- **Precondiciones:** fetch y LocalStorageManager simulados según la suite.
- **Pasos:** responder seasons.json con la fixture; invocar getSeasons; comprobar lista y URL solicitada.
- **Datos:** temporadas 1950, 2023 y 2024 de seasonsResponse.
- **Resultado esperado:** años únicos ordenados del más reciente al antiguo; consulta /seasons.json?limit=100.
- **Resultado real:** **APROBADO**. No acredita qué temporadas publica la API hoy.

### AUT-010 — Calendario UTC original

- **Requisito:** sin ID formal verificado; contrato getSeasonCalendar. Apoya HU-02 al preservar la entrada UTC.
- **Tipo / fuente:** integridad, API simulada; [JolpicaService.test.js](../../__tests__/services/JolpicaService.test.js), bloque getSeasonCalendar.
- **Precondiciones:** fetch y caché simulados; fixtures bahrainSchedule y sprintSchedule.
- **Pasos:** consultar 2024; comparar respuesta íntegra, URL y escritura de caché; repetir con fixture sin horas y con SprintShootout.
- **Datos:** sesiones UTC de fixtures; temporada 1950 sin hora; clave jolpica_v1_calendar_2024.
- **Resultado esperado:** conserva campos y horarios publicados, no inventa opcionales ni consulta resultados; caché separada del Historial.
- **Resultado real:** **APROBADO** con respuestas simuladas.

### AUT-011 — Error HTTP y recuperación del calendario desde caché

- **Requisito:** RNF-PER-02 para recuperación de copia; el manejo HTTP se documenta sin ID adicional.
- **Tipo / fuente:** integridad y manejo de errores; [JolpicaService.test.js](../../__tests__/services/JolpicaService.test.js).
- **Precondiciones:** ausencia de copia o última copia del mismo año simuladas.
- **Pasos:** devolver HTTP 503 sin respaldo y comprobar rechazo; rechazar fetch con copia disponible y comprobar datos/aviso; ofrecer caché vigente y comprobar ausencia de fetch.
- **Datos:** Jolpica HTTP 503; Error('Sin conexión'); bahrainSchedule en caché.
- **Resultado esperado:** propaga error sin copia; recupera copia del año correcto con advertencia; no usa caché del Historial.
- **Resultado real:** **APROBADO**; la red y el almacenamiento son simulados.

### AUT-012 — Transformación y filtrado del Historial

- **Requisito:** sin ID formal verificado; transformRaces/filterHistoricalRaces.
- **Tipo / fuente:** funcional e integridad; [JolpicaService.test.js](../../__tests__/services/JolpicaService.test.js).
- **Precondiciones:** fixtures de carreras, resultados y clasificación separados.
- **Pasos:** unir por ronda; comparar ganador y primero de clasificación; probar ausencia de resultados y victoria compartida; filtrar con espacios y distintas mayúsculas.
- **Datos:** bahrain, monza, winners2024, qualifying2024; búsqueda ` leCLerc `.
- **Resultado esperado:** no confunde ganador con clasificación, no inventa estadísticas y filtra sin distinguir mayúsculas.
- **Resultado real:** **APROBADO** con datos controlados, no resultados oficiales consultados en línea.

### AUT-013 — Temporada y búsqueda en HistorialWebScreen

- **Requisito:** sin ID formal verificado; comportamiento de pantalla.
- **Tipo / fuente:** funcional, integración interna con API simulada; [HistorialWebScreen.test.js](../../__tests__/screens/HistorialWebScreen.test.js).
- **Precondiciones:** fetch/caché simulados y pantalla renderizada mediante RNTL.
- **Pasos:** esperar carga; seleccionar 1950; comprobar reemplazo de filas; en el caso de búsqueda escribir ` leCLerc `, luego `sin coincidencias` y limpiar.
- **Datos:** temporadas 1950/2023/2024; British Grand Prix e Italian Grand Prix de fixtures.
- **Resultado esperado:** carga solo la temporada elegida, distingue vacíos y búsqueda sin coincidencias y filtra sin nuevas peticiones.
- **Resultado real:** **APROBADO**. La suite también cubre reintentos, datos parciales y respuesta tardía de otro año.

### AUT-014 — Selección del próximo GP

- **Requisito:** sin ID formal verificado para selección; HU-02 para elección del año de Santiago.
- **Tipo / fuente:** funcional e integridad; [F1DataService.test.js](../../__tests__/services/F1DataService.test.js).
- **Precondiciones:** servicio/adaptador reales, AsyncStorage simulado, fetch simulado y reloj fijo.
- **Pasos:** responder carreras pasadas/futuras desordenadas; pedir próximo GP; avanzar el reloj con caché; probar cambio de año UTC y búsqueda en temporadas futuras publicadas.
- **Datos:** reloj 2026-11-01T12:00:00Z; carreras 25 de octubre, 8 y 15 de noviembre; 2027 vacío y 2028 con carrera en la variante adicional.
- **Resultado esperado:** selecciona el futuro más cercano por fecha, recalcula desde la caché y no impone 2024 ni consulta todos los años al inicio.
- **Resultado real:** **APROBADO** con red simulada.

### AUT-015 — Próxima carrera ausente, calendario incompleto y copia vencida

- **Requisito:** RNF-PER-02 para la copia; estados de disponibilidad sin ID formal adicional.
- **Tipo / fuente:** integridad y errores; [F1DataService.test.js](../../__tests__/services/F1DataService.test.js).
- **Precondiciones:** reloj controlado, API y AsyncStorage simulados.
- **Pasos:** ofrecer solo carreras pasadas o calendario vacío; retirar fecha/hora; simular fallo de red con/sin copia del año; comprobar disponible, estadoConsulta y warning.
- **Datos:** sin_proxima_carrera, calendario_incompleto y antiguas claves simuladas next_race_meeting/calendar_2026.
- **Resultado esperado:** ausencia explícita sin GP ficticio; aviso al recuperar copia Jolpica; error si no existe copia válida para ese servicio.
- **Resultado real:** **APROBADO**. Una carrera pasada guardada no se convierte en próxima.

### AUT-016 — Filtros de Calendario

- **Requisito:** sin ID formal verificado; filtros de fechas programadas.
- **Tipo / fuente:** funcional y límites; [CalendarioScreen.test.js](../../__tests__/screens/CalendarioScreen.test.js).
- **Precondiciones:** servicios reales, fetch/AsyncStorage simulados; reloj 2026-11-02T12:00:00Z.
- **Pasos:** cargar GP anterior, futuro y sin fecha; alternar TODO/PRÓXIMAS/ANTERIORES; probar carreras sin hora del día anterior, actual y siguiente.
- **Datos:** fechas 2026-11-01, 2026-11-02 y 2026-11-03 sin hora; variantes con instante conocido.
- **Resultado esperado:** filtra sin repetir consultas ni declarar resultados oficiales; el día UTC ambiguo y fechas desconocidas siguen visibles en TODO.
- **Resultado real:** **APROBADO**.

### AUT-017 — Identidad al navegar desde Calendario e Inicio

- **Requisito:** sin ID formal verificado para navegación; apoyo de integridad de identidad.
- **Tipo / fuente:** integración interna; [CalendarioScreen.test.js](../../__tests__/screens/CalendarioScreen.test.js).
- **Precondiciones:** servicio/adaptador reales; fetch, AsyncStorage y navigation simulados.
- **Pasos:** renderizar origen; pulsar GP/Ver detalle del GP; inspeccionar parámetros de navigate; desmontar origen y renderizar DetalleGP con esos mismos parámetros.
- **Datos:** season='2026', round='07', id/idMeeting='jolpica:2026:07'; variante desde Inicio con ronda 1.
- **Resultado esperado:** objeto GranPremio intacto, ruta DetalleGP, sesiones y circuito del GP elegido; sin consulta extra para renderizar Detalle.
- **Resultado real:** **APROBADO**. No es un recorrido E2E con navegador real.

### AUT-018 — Regresión de pantalla blanca en DetalleGP

- **Requisito:** sin ID formal verificado; regresión DEF-001.
- **Tipo / fuente:** funcional, regresión; [DetalleGPScreen.test.js](../../__tests__/screens/DetalleGPScreen.test.js), `se renderiza sin errores con el meeting recibido`.
- **Precondiciones:** componente real, iconos simulados y meeting mínimo; el mock CURRENT_MEETING=null impide respaldos.
- **Pasos:** renderizar DetalleGP dentro de expect(...).not.toThrow(); consultar nombre del GP, circuito y SEGUIR.
- **Datos:** nombreCorto='GP de prueba', round='1', circuito sintético y sesiones=[].
- **Resultado esperado:** renderiza sin ReferenceError ni pantalla vacía y muestra el contenido recibido.
- **Resultado real:** **APROBADO**. La observación original en Chrome fue informada por el usuario; captura histórica pendiente.

### AUT-019 — Seguimiento visual, regreso y datos ausentes en DetalleGP

- **Requisito:** sin ID formal verificado; navegación y protección del renderizado. SEGUIR no equivale a CU-06 de favoritos de pilotos.
- **Tipo / fuente:** funcional y límites; [DetalleGPScreen.test.js](../../__tests__/screens/DetalleGPScreen.test.js).
- **Precondiciones:** isFollowing real y navegación simulada.
- **Pasos:** pulsar SEGUIR dos veces; pulsar regreso; probar route/meeting/circuito/sesiones ausentes; cambiar el GP recibido en la ruta.
- **Datos:** meeting mínimo, null, {}, sesiones=null y arreglo con entradas nulas.
- **Resultado esperado:** SEGUIR → SIGUIENDO → SEGUIR; goBack una vez; mensajes informativos sin respaldos ni selección del GP anterior.
- **Resultado real:** **APROBADO**. No se comprueban notificaciones ni persistencia de seguimiento, que no implementa este botón.

### AUT-020 — Integridad de TEAMS al construir Escuderia

- **Requisito:** CU-02 según comentario del servicio; regresión DEF-002 de transformación.
- **Tipo / fuente:** integridad, regresión; [F1DataService.test.js](../../__tests__/services/F1DataService.test.js), `conserva identidad, nombre y puntos del respaldo local`.
- **Precondiciones:** AsyncStorage vacío, OpenF1Client.getTeamStandings simulado con []; modelos y servicio reales.
- **Pasos:** llamar getTeamStandings; comprobar cantidad y tipo de objetos; comparar identificador, nombre y puntos de todos los equipos con TEAMS.
- **Datos:** respaldo local id/name/points; McLaren con 592 puntos y Kick Sauber con cero, según archivo local existente.
- **Resultado esperado:** id→idEscuderia, name→nombre, points→puntos, incluido cero; no pérdida de información.
- **Resultado real:** **APROBADO como test normal**, sin test.failing. Los puntos son del respaldo local, no un resultado actual de API.

### AUT-021 — Clasificación de pilotos y favorito persistido, contrato legado

- **Requisito:** CU-02 y CU-06; RNF-PER-02 para recuperación de copia.
- **Tipo / fuente:** funcional e integridad; [F1DataService.test.js](../../__tests__/services/F1DataService.test.js).
- **Precondiciones:** consultas OpenF1 simuladas, AsyncStorage simulado, modelos reales.
- **Pasos:** probar caché vigente; responder con formatos admitidos; ordenar puntos; cambiar favorito; ofrecer respuesta vacía/inválida o error con copia vencida; probar campos opcionales.
- **Datos:** driverRecord, apiDriverRecord, IDs 101/102, puntos 10/'35'/0 y favoritos como número/texto.
- **Resultado esperado:** modelos Piloto, orden por puntos, favorito actualizado aun con caché, datos originales guardados y respaldo/estado offline según el caso.
- **Resultado real:** **APROBADO**. Se caracteriza el método legado que consulta 2024; Clasificación y Comparador ya no lo consumen. El contrato vigente se documenta en AUT-040 a AUT-044; no se valida OpenF1 real en línea.

### AUT-022 — Caché y respuestas alternativas de escuderías, contrato legado

- **Requisito:** CU-02 y RNF-PER-02, conforme a comentarios existentes.
- **Tipo / fuente:** funcional e integridad; [F1DataService.test.js](../../__tests__/services/F1DataService.test.js).
- **Precondiciones:** consultas OpenF1 simuladas y caché controlada.
- **Pasos:** recuperar caché vigente; devolver respuesta compatible con Escuderia y comprobar guardado; probar [], null, {} y rechazo con copia vencida.
- **Datos:** teamRecord con puntos 50, 20, 12 y 0; copia vencida al avanzar dos horas.
- **Resultado esperado:** modelos coherentes, sin repetir consulta al reutilizar caché; última copia ordenada por puntos; error activa offline y respuesta inválida no reemplaza la copia.
- **Resultado real:** **APROBADO como caracterización legada**. Respuestas sintéticas compatibles con el modelo; no certifica el formato de la API real. La clasificación vigente usa getChampionshipStandings y se documenta en AUT-040 a AUT-042.

### AUT-023 — Suscripciones de conexión

- **Requisito:** sin ID formal verificado; contrato subscribeConnectionChange/setOfflineMode.
- **Tipo / fuente:** funcional y estado; [F1DataService.test.js](../../__tests__/services/F1DataService.test.js).
- **Precondiciones:** estado inicial false y callbacks jest.fn().
- **Pasos:** registrar dos suscriptores; establecer false/true/true/false; cancelar uno dos veces; cambiar estado y comprobar llamadas.
- **Datos:** estados booleanos y dos listeners.
- **Resultado esperado:** solo notifica cambios efectivos; cancelar uno no elimina al otro y es repetible.
- **Resultado real:** **APROBADO**. No prueba conectividad física.

### AUT-024 — Expiración, última copia y errores de caché

- **Requisito:** RNF-PER-01/02, con alcance parcial según fuentes del plan.
- **Tipo / fuente:** integridad y límites; [LocalStorageManager.test.js](../../__tests__/storage/LocalStorageManager.test.js).
- **Precondiciones:** AsyncStorage simulado y Date.now controlado en los casos temporales.
- **Pasos:** guardar datos; leer a 30 minutos, justo a una hora y un milisegundo después; recuperar última copia a dos horas; probar clave inexistente, JSON corrupto y setItem rechazado.
- **Datos:** TTL=3.600.000 ms; claves calendario/limite/roto; payloads de prueba.
- **Resultado esperado:** caché vigente hasta el límite exacto, null después, última copia recuperable y fallos manejados sin propagación inesperada.
- **Resultado real:** **APROBADO** con almacenamiento simulado; durabilidad real pendiente.

### AUT-025 — Persistencia lógica de favoritos

- **Requisito:** CU-06; RNF-PER-01 como referencia parcial de persistencia.
- **Tipo / fuente:** funcional e integridad; [LocalStorageManager.test.js](../../__tests__/storage/LocalStorageManager.test.js).
- **Precondiciones:** AsyncStorage simulado vacío.
- **Pasos:** guardar dos pilotos, consultar la pertenencia de ambos, intentar eliminar otro ID y eliminar uno de los guardados; alternar escuderías y probar fallos de almacenamiento.
- **Datos:** pilotos 1/4; IDs como texto; escuderías mercedes/mclaren/ferrari.
- **Resultado esperado:** conserva ambos pilotos hasta su eliminación individual; las operaciones no eliminan otro; las escuderías cambian según la selección; errores tienen retorno controlado.
- **Resultado real:** **APROBADO**. El CU-06 se relaciona directamente con piloto; su extensión a escuderías requiere confirmar el SRS.

### AUT-026 — Ajustes y alertas

- **Requisito:** sin ID formal específico verificado para estas preferencias.
- **Tipo / fuente:** integridad y errores; [LocalStorageManager.test.js](../../__tests__/storage/LocalStorageManager.test.js).
- **Precondiciones:** AsyncStorage simulado; spies de error en las variantes negativas.
- **Pasos:** recuperar valores predeterminados; cambiar un campo y comprobar los demás; guardar JSON corrupto o rechazar escritura.
- **Datos:** ajustes de modoExperto/unidades y alertas de boxes/radio/safetyCar de la suite.
- **Resultado esperado:** actualización parcial conserva preferencias restantes; corrupción recupera predeterminados y error de escritura devuelve null.
- **Resultado real:** **APROBADO**. Almacenar preferencias de alertas no demuestra envío de notificaciones.

### AUT-027 — Claridad de la simulación AR

- **Requisito:** sin ID formal verificado; presentación explícita de demostración.
- **Tipo / fuente:** funcional de presentación; [ARScreen.test.js](../../__tests__/screens/ARScreen.test.js).
- **Precondiciones:** ARScreen y TrackMap reales; iconos y Alert simulados; fake timers.
- **Pasos:** revisar aviso inicial; seleccionar escala y colocar; alternar modos; volver a colocar y cerrar; simular clip y avanzar 3 segundos.
- **Datos:** GP sintético distinto de Marina Bay, escalas 1:50/1:200 y datos de demostración existentes.
- **Resultado esperado:** mantiene SIMULACIÓN AR — DATOS DE DEMOSTRACIÓN, explica independencia del GP y etiqueta vueltas/velocidad/posiciones; no afirma EN VIVO/TIEMPO REAL ni guardar un video real.
- **Resultado real:** **APROBADO**. No es evaluación de comprensión con usuarios, AR nativa ni prueba de telemetría real.

### AUT-028 — LiveTiming heredado y respaldo simulado

- **Requisito:** sin ID formal verificado; caracterización del servicio todavía consumido por LiveScreen.
- **Tipo / fuente:** funcional y estados alternativos; [F1DataService.test.js](../../__tests__/services/F1DataService.test.js).
- **Precondiciones:** getSessionResults simulado y servicio real.
- **Pasos:** resolver respuesta no vacía con sesión explícita o predeterminada; resolver [], null, {}; rechazar consulta.
- **Datos:** sessionId=12345; predeterminado heredado=9157; LIVE_TIMING_DATA como respaldo existente.
- **Resultado esperado:** conserva respuesta no vacía; variantes sin datos retornan el respaldo simulado; rechazo activa offline sin excepción al consumidor.
- **Resultado real:** **APROBADO como caracterización**, no confirmación de sesión actual ni de datos oficiales. La presentación heredada de LiveScreen requiere revisión independiente.

### AUT-029 — Carga, vacío, error y reintento de Calendario

- **Requisito:** sin ID formal verificado para estados de pantalla; RNF-PER-02 para copia con advertencia.
- **Tipo / fuente:** funcional, integración interna; [CalendarioScreen.test.js](../../__tests__/screens/CalendarioScreen.test.js).
- **Precondiciones:** servicio/adaptador reales, red y AsyncStorage simulados.
- **Pasos:** renderizar y esperar carga; responder calendario vacío, HTTP 503 o rechazo; reintentar; probar copia vencida y actualización fallida.
- **Datos:** fixture calendarRace, [], copia de jolpica_v1_calendar_2026 y Error('Sin conexión').
- **Resultado esperado:** getCalendar sin 2024 fijo, carga informativa, vacío diferenciado, reintento operativo y advertencia solo cuando corresponde a una copia real del mock.
- **Resultado real:** **APROBADO**. No hay consulta de API real en la prueba.

### AUT-030 — Paginación y timeout de Jolpica

- **Requisito:** sin ID formal específico verificado; robustez del cliente Jolpica. No se atribuye al RNF-02 de OpenF1.
- **Tipo / fuente:** integridad y errores; [JolpicaService.test.js](../../__tests__/services/JolpicaService.test.js).
- **Precondiciones:** páginas de fetch simuladas; fake timers y AbortSignal en el caso timeout.
- **Pasos:** entregar dos páginas de temporadas o calendario; comprobar offset y unión; en getSeasonHistory mantener consulta pendiente hasta abortar a 10.000 ms.
- **Datos:** total=2, una entrada por página; respuesta pendiente que rechaza con Tiempo agotado al abortar.
- **Resultado esperado:** recupera todas las páginas y preserva UTC; timeout propaga error sin copia.
- **Resultado real:** **APROBADO** con reloj/red simulados, no medición de latencia real.

### AUT-031 — Presentación del próximo GP y estados de Inicio

- **Requisito:** sin ID formal verificado para estos estados; HU-02 como apoyo del horario construido por el adaptador.
- **Tipo / fuente:** funcional, pantalla; [HomeScreen.test.js](../../__tests__/screens/HomeScreen.test.js).
- **Precondiciones:** getNextRace simulado; modelos construidos con adaptador real y reloj fijo.
- **Pasos:** renderizar GP futuro; probar ausencia/incompleto, hora desconocida y error; reintentar; comprobar rutas y ausencia de vueltas de respaldo.
- **Datos:** GP de prueba, disponible=false, sin_proxima_carrera, calendario_incompleto y time ausente.
- **Resultado esperado:** contenido y contador solo con datos suficientes; mensajes de estado y reintento sin Singapur/2024 ni vueltas inventadas.
- **Resultado real:** **APROBADO**. La integración con servicio real desde Inicio también se comprueba en AUT-017.

### AUT-032 — RaceCard sin respaldos ficticios

- **Requisito:** sin ID formal verificado; contrato de tarjeta de GP.
- **Tipo / fuente:** funcional y límites; [RaceCard.test.js](../../__tests__/components/RaceCard.test.js).
- **Precondiciones:** tarjeta real con callbacks controlados.
- **Pasos:** renderizar race={}; probar estado Finalizado con/sin ganador; pulsar tarjeta y acceso de sesión confirmada En curso.
- **Datos:** propiedades ausentes, ganador='Piloto confirmado', callbacks jest.fn().
- **Resultado esperado:** informa fecha/hora/circuito desconocidos; no inventa VER ni septiembre; respeta ganador recibido y ejecuta callbacks.
- **Resultado real:** **APROBADO**; no confirma un ganador ni una sesión actuales.

### AUT-033 — DriverCard, datos recibidos y favorito

- **Requisito:** sin ID formal para la tarjeta; CU-06 como apoyo al evento de favorito.
- **Tipo / fuente:** funcional, componente; [DriverCard.test.js](../../__tests__/components/DriverCard.test.js).
- **Precondiciones:** modelo Piloto real, callbacks e iconos simulados; sin HTTP.
- **Pasos:** renderizar posición explícita y del modelo; omitir apellido; conservar cero puntos; pulsar tarjeta y favorito; rerender con favorito activo.
- **Datos:** piloto de prueba, posición 4/6/8, puntos 37/0, código PRB y esFavorito true/false.
- **Resultado esperado:** presenta datos recibidos, prioriza posición explícita y transmite el piloto al callback; estrella coherente con las props.
- **Resultado real:** **APROBADO**. El callback no acredita persistencia física.

### AUT-034 — Nombre de Escuderia en StandingsTable (DEF-003)

- **Requisito:** sin ID formal verificado para el contrato visual; regresión DEF-003.
- **Tipo / fuente:** integridad y presentación; [StandingsTable.test.js](../../__tests__/components/StandingsTable.test.js).
- **Precondiciones:** tabla real y new Escuderia con nombre/puntos; iconos simulados.
- **Pasos:** renderizar; abrir CONSTRUCTORES; comprobar nombre y puntos; contrastar formatos heredados usados por los consumidores.
- **Datos:** nombre='Equipo del modelo', puntos=50; formato alternativo fullName/points de la suite.
- **Resultado esperado:** reconoce nombre del modelo sin perder compatibilidad con name/fullName.
- **Resultado real:** **APROBADO como test normal**, incluida la regresión originalmente fallida.

### AUT-035 — Comparación insuficiente en StandingsTable (DEF-004)

- **Requisito:** sin ID formal verificado; integridad de participantes, regresión DEF-004.
- **Tipo / fuente:** funcional y límites; [StandingsTable.test.js](../../__tests__/components/StandingsTable.test.js).
- **Precondiciones:** tabla real con cero o un piloto; sin servicios.
- **Pasos:** renderizar []; repetir con un piloto; buscar etiquetas de puntuaciones comparativas.
- **Datos:** [], [piloto de prueba].
- **Resultado esperado:** informa que se necesitan dos pilotos; no fabrica rival, nombre ni puntuación.
- **Resultado real:** **APROBADO**, las dos regresiones permanecen normales.

### AUT-036 — Puntos cero y proporciones de StandingsTable (DEF-005)

- **Requisito:** sin ID formal verificado; cálculo proporcional, regresión DEF-005.
- **Tipo / fuente:** integridad y límites; [StandingsTable.test.js](../../__tests__/components/StandingsTable.test.js).
- **Precondiciones:** dos pilotos reales del modelo con puntuaciones controladas.
- **Pasos:** comparar 30/10; repetir con 0/0; comprobar etiquetas porcentuales.
- **Datos:** 30 y 10 → 75%/25%; 0 y 0.
- **Resultado esperado:** proporciones correctas con total positivo; con total cero no atribuye 100% al segundo ni divide por cero.
- **Resultado real:** **APROBADO como test normal**. Los porcentajes representan reparto de puntos, no probabilidad de ganar.

### AUT-037 — Modelos de dominio, identidad y valores opcionales

- **Requisito:** sin ID formal específico verificado; contratos actuales de modelos.
- **Tipo / fuente:** unidad y límites; [GranPremio](../../__tests__/models/GranPremio.test.js), [Sesion](../../__tests__/models/Sesion.test.js), [Piloto](../../__tests__/models/Piloto.test.js), [Escuderia](../../__tests__/models/Escuderia.test.js).
- **Precondiciones:** modelos reales; reloj controlado donde se utiliza contador.
- **Pasos:** omitir nombre corto/año; calcular contador desde sesión RACE/Carrera y respaldo existente; preservar estado confirmado y vuelta cero; alternar favorito; modificar la plantilla de un equipo.
- **Datos:** temporada 2026/ronda '07', UTC de prueba; nombres parciales; dos escuderías sin plantilla suministrada.
- **Resultado esperado:** conserva identidad y ceros, no infiere EN VIVO/FINALIZADO solo por fecha, y las listas de pilotos de equipos no comparten estado.
- **Resultado real:** **APROBADO**. No incluye tests directos de Circuito/ResultadoSesion; permanecen en el alcance medido. El respaldo del contador a fechaInicio es caracterización del modelo, no la fuente actual del contador de Inicio.

### AUT-038 — Animación de demostración de TrackMap

- **Requisito:** sin ID formal verificado; animación/control y liberación de temporizador.
- **Tipo / fuente:** componente y estado; [TrackMap.test.js](../../__tests__/components/TrackMap.test.js).
- **Precondiciones:** componente real, isDemo=true y fake timers.
- **Pasos:** avanzar reloj; comprobar movimiento y regreso al origen; alternar isLive como control de animación; desmontar y contar temporizadores.
- **Datos:** marcadores de demostración 63 y 4; intervalos de 1.200 ms.
- **Resultado esperado:** anima, pausa y reanuda coherentemente; desmontar elimina su temporizador.
- **Resultado real:** **APROBADO**. isLive aquí controla una animación simulada; no confirma telemetría ni ubicación reales.

### AUT-039 — TelemetryWidget, cambios y caracterización de predeterminados

- **Requisito:** sin ID formal verificado; props del componente.
- **Tipo / fuente:** componente; [TelemetryWidget.test.js](../../__tests__/components/TelemetryWidget.test.js).
- **Precondiciones:** lecturas sintéticas e iconos simulados; sin API.
- **Pasos:** renderizar lecturas; rerender con cero, DRS y unidad distintos; probar lectura parcial.
- **Datos:** velocidad 220/0, marcha 6/0, acelerador 75/0, freno 25/100, km/h/mph.
- **Resultado esperado:** refleja props y ceros; conserva los predeterminados heredados existentes cuando faltan otros campos.
- **Resultado real:** **APROBADO como caracterización**, no telemetría real. La lectura parcial todavía puede mostrar valores de demostración; no se declara resuelta esa limitación fuera del Comparador.

### AUT-040 — Procedencia y temporada de clasificaciones Jolpica (DEF-006)

- **Requisito:** CU-02, asociación parcial según comentarios/README; los detalles del contrato vigente no tienen otro ID formal verificado.
- **Tipo / fuente:** unidad/integridad; [F1ChampionshipStandings.test.js](../../__tests__/services/F1ChampionshipStandings.test.js).
- **Precondiciones:** F1DataService, JolpicaService y modelos reales; fetch y AsyncStorage simulados, Date.now controlado.
- **Pasos:** invocar getChampionshipStandings sin año; comprobar URLs y modelos; probar cambio de año UTC y temporada histórica explícita; retirar campos; conservar ceros y todos los constructores publicados.
- **Datos:** reloj 2026-11-02 y 2027-01-01T01:00:00Z; temporada 2026/2024; puntos '125.5'/'0'; wins '3'/'0'; positionText D/E; driver sin número.
- **Resultado esperado:** usa año de Santiago y endpoints driverstandings/constructorstandings de Jolpica; conserva season/round/identidad/cifras; faltantes null; podios/poles desconocidos; no llama clasificaciones OpenF1.
- **Resultado real:** **APROBADO con API simulada**. La fixture [jolpicaStandings](../../__tests__/fixtures/jolpicaStandings.js) no acredita clasificación oficial actual.

### AUT-041 — Caché, paginación y errores de clasificaciones (DEF-006)

- **Requisito:** RNF-PER-02 para recuperación; CU-02 como relación parcial de clasificación; resto sin ID formal específico.
- **Tipo / fuente:** integridad, límites y errores; [F1ChampionshipStandings.test.js](../../__tests__/services/F1ChampionshipStandings.test.js).
- **Precondiciones:** servicios/modelos reales; red, almacenamiento y tiempo controlados.
- **Pasos:** repetir carga y llamadas simultáneas; vencer caché; simular HTTP 404/503 con/sin copia; poblar claves OpenF1 y de otro año; paginar; abortar a 10 s; entregar respuesta vacía, temporada equivocada o identidad ausente.
- **Datos:** jolpica_v2_driver_standings_2026 y constructor equivalente; TTL 3.600.000 ms; error HTTP; total=2/offset=1.
- **Resultado esperado:** deduplica y reutiliza copia del mismo origen/año; distingue api/cache/stale-cache y motivo del fallo; ignora copias incompatibles; no fabrica participantes; una tabla puede sobrevivir al error de la otra.
- **Resultado real:** **APROBADO**. Un 404 no cambia automáticamente isOfflineMode; no prueba desconexión física ni el límite RNF-02 de OpenF1.

### AUT-042 — Clasificación vigente, favoritos, pestañas y navegación (DEF-006)

- **Requisito:** CU-02 y CU-06 con el límite de trazabilidad indicado en el plan; presentación/rutas sin ID formal adicional.
- **Tipo / fuente:** pantalla e integración interna; [ChampionshipScreens.test.js](../../__tests__/screens/ChampionshipScreens.test.js).
- **Precondiciones:** ClasificacionScreen y servicios reales; fetch/AsyncStorage e iconos simulados; navegación jest.fn.
- **Pasos:** esperar carga; comprobar año/fuente/ronda; abrir pilotos/constructores; abrir PerfilPiloto/Comparador/Perfil; guardar y eliminar favorito; disparar focus; responder error/vacío/parcial; reintentar.
- **Datos:** temporada 2026 o 2024 explícita; pilotos Ana Prueba/Bruno Ensayo; HTTP 404/503; copia vencida.
- **Resultado esperado:** muestra datos disponibles y procedencia; no usa respaldos simulados ni año fijo; conserva favoritos/rutas; foco inicial no duplica carga y caché evita HTTP repetido.
- **Resultado real:** **APROBADO con mocks**. Abrir PerfilPiloto conserva el objeto recibido, pero no valida sus otras estadísticas heredadas.

### AUT-043 — Estadísticas verificables y ausentes en Comparador (DEF-006)

- **Requisito:** sin ID formal verificado para métricas del Comparador.
- **Tipo / fuente:** funcional e integridad; [ChampionshipScreens.test.js](../../__tests__/screens/ChampionshipScreens.test.js).
- **Precondiciones:** Comparador real y servicios reales con respuestas controladas; navigation simulado.
- **Pasos:** cargar dos pilotos; comprobar puntos/victorias/posición y fuente; omitir campos o participantes; usar caché; responder HTTP 404/503 y reintentar; comprobar regreso.
- **Datos:** puntos 125,5/100, victorias 3/0, posiciones publicadas; null/0, [], un piloto y copia vencida.
- **Resultado esperado:** conserva cifras verificables, informa datos insuficientes y muestra No disponible para poles/podios/ritmo; no muestra -0.180s ficticio.
- **Resultado real:** **APROBADO**; no acredita datos externos reales ni apariencia en píxeles. VIS-001 complementa la presentación.

### AUT-044 — Selección independiente e intercambio del Comparador (DEF-007)

- **Requisito:** sin ID formal verificado; comportamiento vigente de ComparadorScreen.
- **Tipo / fuente:** funcional/integridad; [ChampionshipScreens.test.js](../../__tests__/screens/ChampionshipScreens.test.js).
- **Precondiciones:** clasificaciones cargadas con 2/4 pilotos; servicios reales, fetch/AsyncStorage simulados.
- **Pasos:** elegir solo derecha y comprobar izquierda; cambiar ambos lados; intentar elegir al rival deshabilitado; cancelar; intercambiar por controles superior/inferior; seleccionar ficha incompleta.
- **Datos:** Ana Prueba, Bruno Ensayo, Carla Tercera, Daniel Cuarta; 2026 y 2024 explícita; sin_ficha con valores desconocidos.
- **Resultado esperado:** cada lado es independiente; nunca el mismo piloto; estadísticas corresponden a la pareja actual; desconocidos permanecen No disponible; no hay nuevas llamadas al servicio/HTTP al seleccionar.
- **Resultado real:** **APROBADO**, incluidos los ocho casos agregados para selección independiente. Los tests previos fueron conservados y adaptados a los nuevos controles, sin omisiones ni fallos esperados.

### AUT-045 — Colección múltiple, migración, vacíos y persistencia lógica (DEF-008)

- **Requisito:** CU-06/RNF-PER-01 como asociaciones parciales del README/almacenamiento; selección múltiple exigida explícitamente por el usuario, sin identificador formal adicional.
- **Tipo / fuente:** integridad, límites y errores; [FavoriteDriversCollection.test.js](../../__tests__/storage/FavoriteDriversCollection.test.js), [FavoritesCompatibility.test.js](../../__tests__/storage/FavoritesCompatibility.test.js) y [LocalStorageManager.test.js](../../__tests__/storage/LocalStorageManager.test.js).
- **Precondiciones:** LocalStorageManager real, AsyncStorage simulado y aislado; errores de escritura controlados.
- **Pasos:** guardar dos pilotos; eliminar uno; migrar un favorito único o lista antigua; eliminar el último y releer; precargar colección vacía junto a favorito antiguo; simular migración fallida/corrupción; guardar concurrentemente; suscribir y cancelar un observador.
- **Datos:** claves `@f1fan_favorite_driver` y `@f1fan_favorite_drivers`; 33/4, `[33,4]`, `[]`, JSON corrupto y rechazo de escritura.
- **Resultado esperado:** agregar conserva los demás; `[]` es definitivo y no reimporta eliminados; la clave antigua se conserva como respaldo sin consultarse cuando existe la nueva; fallos no sobrescriben originales; cambios se serializan y solo notifican escrituras exitosas.
- **Resultado real:** **APROBADO con almacenamiento simulado**. No demuestra migración de un perfil real del navegador ni durabilidad después de una recarga física.

### AUT-046 — Identificadores estables, alias y ausencia de duplicados (DEF-008)

- **Requisito:** integridad de favoritos definida por el usuario; apoyo parcial de CU-06, sin otro ID formal verificado.
- **Tipo / fuente:** identidad y transformación; [FavoriteDriversCollection.test.js](../../__tests__/storage/FavoriteDriversCollection.test.js), [FavoritesCompatibility.test.js](../../__tests__/storage/FavoritesCompatibility.test.js) y [favorites.test.js](../../__tests__/utils/favorites.test.js).
- **Precondiciones:** funciones reales y catálogos controlados; el catálogo local se utiliza para identidad, nunca para puntos/posiciones actuales.
- **Pasos:** resolver número, texto, driverId y código; deduplicar alias; cambiar dorsal del mismo driverId; guardar dos driverId con dorsal coincidente; eliminar uno por identidad estable; resolver retirado/desconocido; actualizar desde un consumidor que solo entrega el número.
- **Datos:** `max_verstappen`, `norris`, `VER`, números 1/33/4; pilotos sintéticos Ana/Bruno y alias desconocidos en las suites correspondientes.
- **Resultado esperado:** driverId guardado tiene prioridad; pilotos diferentes no se fusionan por compartir dorsal; alias del mismo piloto se eliminan juntos mediante una escritura; se conservan favoritos no reconocidos y metadatos ya conocidos, sin estadísticas ficticias.
- **Resultado real:** **APROBADO**. Compatibilidad numérica/código se prueba con los casos concretos de las suites; no se garantiza resolver inequívocamente cualquier identificador histórico carente de metadatos.

### AUT-047 — Sincronización bidireccional y selección múltiple entre pantallas (DEF-008)

- **Requisito:** requisito definitivo comunicado por el usuario; CU-06 relacionado con favoritos, sin atribuirle un enunciado SRS no disponible.
- **Tipo / fuente:** funcional e integración interna; [FavoritesSync.test.js](../../__tests__/screens/FavoritesSync.test.js), complementado por [ChampionshipScreens.test.js](../../__tests__/screens/ChampionshipScreens.test.js).
- **Precondiciones:** pantallas/servicios/almacenamiento reales; fetch, AsyncStorage, iconos y navegación simulados. Una variante conserva ambas pantallas en el mismo árbol de renderizado.
- **Pasos:** marcar Ana y Bruno; comprobar ambas estrellas y ambas fichas; quitar Ana desde Clasificación y desde Favoritos en variantes separadas; regresar con la flecha sin emitir focus; remontar; cambiar preferencias durante carga; alternar/eliminar escudería; simular HTTP fallido y eliminación persistente fallida.
- **Datos:** Ana Prueba 81 y Bruno Ensayo 82, driverId de fixtures, puntos 125,5/100; equipos de prueba, legados y vacíos.
- **Resultado esperado:** cada acción modifica solo el elegido; Favoritos y estrellas convergen sin depender exclusivamente del foco; las preferencias se releen al remontar; no se repiten solicitudes HTTP por cambiar favoritos; fallos conservan la selección y las estadísticas.
- **Resultado real:** **APROBADO con mocks**. Las 23 pruebas de FavoritesSync incluyen esta familia y AUT-048. El último ajuste agregó 15 pruebas: 12 de almacenamiento y 3 de sincronización; dos pruebas antiguas de reemplazo único se adaptaron al requisito múltiple, sin eliminarlas. Revalidación manual final: MAN-008 pendiente.

### AUT-048 — Regreso accesible y ruta segura desde Favoritos

- **Requisito:** solicitud expresa del usuario y rutas de AppNavigator/BottomTabNavigator; sin ID formal adicional verificado.
- **Tipo / fuente:** navegación de componente; [FavoritesSync.test.js](../../__tests__/screens/FavoritesSync.test.js).
- **Precondiciones:** Favoritos real, favoritos persistidos en mock y navigation con variantes de canGoBack/goBack/navigate.
- **Pasos:** consultar botón por rol button y nombre Volver; pulsar con canGoBack=true; repetir con false y sin canGoBack; verificar preferencias; combinar eliminación y flecha en AUT-047.
- **Datos:** `MainTabs`, pestaña `Más`, favoritos sintéticos; canGoBack true/false/ausente.
- **Resultado esperado:** con historial ejecuta goBack una vez; sin historial comprobable navega a `MainTabs` con `{ screen: 'Más' }`; conserva preferencias; el control mantiene nombre accesible.
- **Resultado real:** **APROBADO**, tres casos específicos más integración con eliminación. No equivale a auditoría de accesibilidad ni a prueba del navegador real. Flecha visible informada; funcionamiento manual final pendiente en MAN-007.

## Casos manuales — estados diferenciados

MAN-001 a MAN-004 permanecen pendientes de ejecución documentada para su alcance completo. MAN-005 registra la exploración del Comparador confirmada por el usuario. MAN-006 a MAN-008 separan observaciones parciales de Clasificación/navegación/favoritos y la revalidación final aún pendiente. Las [actas](ActasPruebasManuales.md) registran origen y límites de los antecedentes, sin inventar fecha de ejecución ni ejecutor. Ninguno integra el conteo de Jest; VIS-001 se registra por separado con API simulada.

### MAN-001 — Calendario, detalle y persistencia con API real en Expo Web

- **Requisito:** HU-02 y RNF-PER-02 para sus partes correspondientes; navegación sin ID formal verificado.
- **Precondiciones:** npm run web, navegador y resolución registrados, conexión controlable y estado de caché identificado.
- **Pasos:** registrar respuesta de Jolpica; comparar fecha/hora UTC con Santiago; abrir GP desde Inicio y Calendario; volver; guardar favorito y recargar; probar desconexión con copia vencida y, por separado, sin copia; restablecer red y reintentar.
- **Datos:** temporada efectivamente publicada al ejecutar; URL, fecha/hora y clave de caché reales. Utilizar un perfil de prueba para no borrar preferencias personales.
- **Resultado esperado:** identidad y horarios consistentes, persistencia tras recarga y mensajes coherentes con red/caché; sin respaldos ficticios.
- **Resultado real:** **PENDIENTE**; falta acta, capturas y evidencia de respuesta real. No afirmar que la API estaba disponible a partir de los mocks.

### MAN-002 — Usabilidad de estados y comprensión de AR

- **Requisito:** sin ID formal verificado; dimensión de usabilidad exigida por la plantilla.
- **Precondiciones:** tareas y observador por asignar; registrar navegador, resolución y método de observación. No hay participantes evaluados registrados.
- **Pasos:** solicitar localizar el próximo GP, interpretar un horario desconocido, recuperar un error y entrar/salir de AR; preguntar qué datos considera reales y cuáles simulados; anotar errores, dudas y ayudas necesarias.
- **Datos:** escenarios disponibles al ejecutar; formulario con tarea, observación y hallazgo, sin resultados precargados.
- **Resultado esperado:** estados comprensibles, recuperación y regreso localizables, simulación reconocida. Criterio de aceptación final por revisar con el equipo.
- **Resultado real:** **PENDIENTE**; no existen tiempos de tarea, satisfacción ni puntuaciones registradas.

### MAN-003 — Teclado, foco, contraste y tamaños de pantalla

- **Requisito:** sin ID formal específico verificado; accesibilidad/usabilidad de la plantilla.
- **Precondiciones:** Expo Web y navegador identificados; herramienta de contraste y lector de pantalla por definir.
- **Pasos:** recorrer controles con Tab/Shift+Tab/Enter; verificar foco y nombres; provocar error y revisar anuncio; medir contraste; repetir en anchos 360, 768 y 1280 px y registrar dimensiones completas.
- **Datos:** nombres de controles y colores observados; objetivo de contraste 4,5:1 para texto normal tomado de la plantilla, pendiente de medición.
- **Resultado esperado:** controles utilizables sin trampas de foco, información perceptible y contenido sin solapamientos que impidan operar.
- **Resultado real:** **PENDIENTE**; no hay informe Lighthouse/Axe ni conformidad WCAG demostrada.

### MAN-004 — Rendimiento de renderizado

- **Requisito:** RNF-01, objetivo <3 segundos mencionado en README.
- **Precondiciones:** acordar qué marca inicia/finaliza la medición y registrar equipo, navegador, modo de ejecución, red y caché.
- **Pasos:** medir apertura del flujo acordado con herramientas del navegador; distinguir carga fría/caliente y dependencia de red; guardar mediciones y condiciones.
- **Datos:** mediciones por obtener; no reutilizar duración de Jest como tiempo de renderizado.
- **Resultado esperado:** contrastar los tiempos reales con <3 segundos y documentar incumplimientos; protocolo pendiente de revisión.
- **Resultado real:** **PENDIENTE**; ninguna medición ni puntuación ha sido inventada.

### MAN-005 — Exploración funcional del Comparador en formato móvil

- **Requisito:** sin ID formal verificado; selección y prevención de errores de ComparadorScreen.
- **Tipo / fuente:** validación manual exploratoria comunicada por el usuario en la conversación; sin participantes de usabilidad registrados.
- **Precondiciones:** aplicación en formato móvil y clasificaciones ya cargadas; navegador, resolución exacta, fecha/hora de ejecución y estado de caché no archivados.
- **Pasos informados:** seleccionar independientemente izquierda/derecha; intercambiar; intentar comparar el mismo piloto; comprobar que elegir pilotos no genera nuevas solicitudes HTTP.
- **Datos:** pilotos disponibles en el entorno de la validación; no se conservó la respuesta externa ni la temporada concreta en un acta.
- **Resultado esperado:** ambos lados editables, pareja distinta, intercambio operativo y selección local.
- **Resultado real:** **EJECUTADO — funcionamiento confirmado por el usuario**. No se declara evaluación formal de usabilidad ni comprobación exitosa de API real. Completar el acta y las capturas si se requieren como evidencia académica.

### MAN-006 — Clasificación Jolpica, HTTP real y caché

- **Requisito:** CU-02/RNF-PER-02, relación parcial; contratos vigentes sin nuevo ID formal.
- **Precondiciones:** Expo Web y Chrome; distinguir petición externa, caché de navegador y caché de aplicación.
- **Pasos / datos:** registrar URL completa, temporada, estado HTTP y cuerpo; repetir carga sin vencer TTL; comparar peticiones y procedencia mostrada; archivar evidencia.
- **Resultado esperado:** clasificación de la temporada identificada, fuente/copia coherentes y sin respaldos simulados.
- **Resultado real:** **PARCIAL**. Se informa HTTP 200 observado en Chrome para clasificaciones Jolpica; URL exacta, temporada/ronda, cuerpo y captura/HAR no están adjuntos. No se declara validación JSON ni éxito separado de pilotos y constructores. Caché vigente/vencida está cubierta con mocks; reproducción manual completa pendiente. Véase INT-001 a INT-003.

### MAN-007 — Navegación secundaria y flecha de Favoritos

- **Requisito:** rutas reales registradas y solicitud del usuario; sin ID formal específico.
- **Precondiciones:** Expo Web; acceso Más → Favoritos y escenario directo sin historial.
- **Pasos / datos:** abrir Favoritos; comprobar flecha; pulsarla con historial; repetir acceso directo; verificar regreso a Más y conservación de selecciones. Antecedente adicional: apertura de DetalleGP después de DEF-001.
- **Resultado esperado:** regreso operativo, seguro y visible, sin modificar favoritos.
- **Resultado real:** **PARCIAL**. Se confirmó la presencia de la flecha y anteriormente la apertura de DetalleGP; no hay confirmación manual posterior de pulsación/fallback. AUT-048 verifica callbacks con mocks. Pendientes recorrido completo y captura.

### MAN-008 — Favoritos múltiples, eliminación, migración y recarga después de DEF-008

- **Requisito:** selección múltiple y sincronización exigidas por el usuario; apoyo parcial de CU-06/RNF-PER-01.
- **Precondiciones:** versión con colección nueva, Expo Web y perfil de prueba con copia protegida de sus preferencias; utilizar pilotos disponibles realmente en la temporada cargada.
- **Pasos / datos:** marcar dos pilotos; comprobar ambos en Más → Favoritos; quitar uno, volver con flecha y comprobar ambas estrellas; recargar; en un perfil separado probar favorito antiguo, lista antigua y `[]`; repetir con escuderías.
- **Resultado esperado:** conserva varios favoritos, elimina solo el elegido, sincroniza ambos sentidos y persiste sin reimportar eliminados ni perder selecciones antiguas.
- **Resultado real:** **PENDIENTE de revalidación manual de la última corrección**. El usuario confirmó antes el paso individual Clasificación → Favoritos y detectó reemplazo/estrella desactualizada; esos resultados pertenecen a la versión defectuosa. Las regresiones actuales aprueban en Jest, sin acreditar persistencia física tras recarga.

## Comprobación visual ejecutada con API simulada

### VIS-001 — Barras y textos del Comparador a 375 px

- **Requisito:** sin ID formal verificado; responsividad y presentación de la plantilla, alcance puntual.
- **Tipo / fuente:** comprobación visual asistida por navegador, fuera de Jest y del conteo 330; [captura de demostración](evidencias/comparador-375-demo.png) y [medidas DOM](evidencias/comparador-375-demo-medidas.json).
- **Precondiciones:** Expo Web local; Chrome headless controlado por Chrome DevTools Protocol; viewport **375 × 1000 px**, escala 1; solicitudes Jolpica interceptadas con datos sintéticos. No es un teléfono físico ni una API real.
- **Pasos ejecutados:** abrir aplicación y Comparador; medir viewport/documento y límites de textos; comparar anchos/colores de barras con proporciones de la fixture; capturar pantalla y revisar la imagen.
- **Datos:** Ana Prueba/Bruno Ensayo, números 81/82, puntos 125,5/100 y victorias 3/1; poles/podios No disponible. Ninguno de esos valores es evidencia de clasificaciones oficiales.
- **Resultado esperado:** barras visualmente diferenciadas con las proporciones originales; títulos encima de dos valores legibles; sin solapamientos ni desbordamiento horizontal.
- **Resultado real:** **EJECUTADO Y APROBADO en ese escenario**. Viewport y ancho de documento: 375 px. Valores: columnas de 148,3125 px separadas por aproximadamente 12,375 px. Barras de puntos: 171,96875/137,03125 px sobre 309 px (≈55,65%/44,35%); victorias: 231,75/77,25 px (75%/25%). Cian/naranja son colores de comparación por lado, no colores oficiales de escuderías.
- **Límite:** no cierra MAN-003; no se midieron contraste, teclado, lector de pantalla, otros anchos ni rendimiento. Es una ejecución puntual, no suite E2E mantenida ni evidencia CI/CD.

## Matriz de trazabilidad consolidada

La fuente de cada asociación formal está en la sección 1.3 del Plan Maestro. Una relación con CU-02 se mantiene como parcial porque no se dispone de su enunciado completo. AUT/MAN/VIS no son requisitos inventados.

| Requisito o comportamiento documentado | Casos | Fuente de prueba / evidencia | Defecto relacionado / estado |
|---|---|---|---|
| HU-02, horarios Santiago | AUT-006, AUT-007, AUT-010, AUT-017, AUT-031; MAN-001 | timezone, adaptador, servicios y pantallas enlazados arriba | Automático aprobado; HTTP real y acta pendientes |
| CU-02, asociación parcial de clasificaciones | AUT-020 a AUT-022 (legados), AUT-040 a AUT-042 (vigentes) | F1DataService.test, F1ChampionshipStandings.test, ChampionshipScreens.test | DEF-002/DEF-006 corregidos; mocks |
| CU-06, favoritos; selección múltiple definida por el usuario | AUT-021 (legado), AUT-025, AUT-033, AUT-042, AUT-045 a AUT-047; MAN-008 | Servicio, almacenamiento, utilidades y FavoritesSync | DEF-008 corregido con mocks; revalidación manual final y SRS pendientes |
| RNF-PER-01/02, persistencia y recuperación según relación de cada ficha | AUT-011, AUT-015, AUT-021, AUT-022, AUT-024, AUT-025, AUT-029, AUT-041; MAN-001 | Caché/AsyncStorage simulados | Parcial; no demuestra almacenamiento físico |
| RNF-01, renderizado <3 s | MAN-004 | README; mediciones por obtener | Pendiente |
| RNF-02, límite OpenF1 | Sin caso específico ejecutado | README/OpenF1Client | Pendiente; deduplicación Jolpica no sustituye esta prueba |
| Componentes/sesiones/contador, sin ID formal adicional | AUT-001 a AUT-005, AUT-032 | Tests de componentes | Aprobados con datos controlados |
| Calendario/Historial e identidad, sin ID formal adicional | AUT-008, AUT-009, AUT-012 a AUT-017, AUT-029, AUT-030 | Servicios/adaptador/pantallas | Aprobados con mocks; se mantiene la asociación HU-02 solo donde corresponde |
| DetalleGP: render, seguimiento y regreso | AUT-018, AUT-019 | DetalleGPScreen.test | DEF-001 corregido |
| Escuderías y comparación de StandingsTable | AUT-034, AUT-035, AUT-036 | StandingsTable.test | DEF-003/DEF-004/DEF-005 corregidos; cuatro regresiones normales |
| Suscripciones y preferencias locales | AUT-023, AUT-026 | F1DataService.test, LocalStorageManager.test | Caracterización aprobada; sin ID formal específico |
| AR/LiveTiming/telemetría/mapa, sin ID formal específico | AUT-027, AUT-028, AUT-038, AUT-039 | Tests de AR, servicio y componentes | Caracterización aprobada; valores de demostración no acreditan datos reales |
| Modelos de dominio | AUT-037 | GranPremio/Sesion/Piloto/Escuderia.test | Aprobados; Circuito/ResultadoSesion sin tests directos |
| Comparador: procedencia y datos desconocidos | AUT-043 | ChampionshipScreens.test | DEF-006 corregido |
| Comparador: selección independiente y pareja válida | AUT-044, MAN-005 | Jest y confirmación manual del usuario, separados | DEF-007 corregido; acta manual completa pendiente |
| Comparador: barras y distribución móvil | VIS-001 | Captura y JSON, API simulada | Ajuste visual verificado a 375 px; sin nuevo ID de defecto asignado |
| Integridad/migración de favoritos; apoyo parcial RNF-PER-01 | AUT-045, AUT-046 | FavoriteDriversCollection, FavoritesCompatibility y favorites.test | DEF-008; almacenamiento simulado, lista vacía definitiva y alias preservados |
| Favoritos: sincronización bidireccional y escuderías | AUT-047, MAN-008 | FavoritesSync.test; observaciones históricas del usuario | Regresión aprobada; validación manual final pendiente |
| Favoritos: flecha y regreso seguro, sin ID formal adicional | AUT-048, MAN-007 | FavoritesSync.test; rutas reales | Callback aprobado con mocks; flecha visible confirmada; pulsación manual pendiente |
| Clasificación real y caché; apoyo parcial CU-02/RNF-PER-02 | MAN-006; INT-001 a INT-003 | Observación HTTP 200 informada y pruebas de servicio | Transporte parcialmente confirmado; JSON/caché física pendientes |
| Usabilidad/accesibilidad globales de plantilla | MAN-002, MAN-003 | Evaluaciones por realizar | Pendientes; VIS-001 no acredita WCAG/Lighthouse/Axe |
| E2E/CI/CD exigidos en la plantilla | Sin suite/pipeline implementados | Repositorio revisado | Pendiente; no existe evidencia de ejecución |
