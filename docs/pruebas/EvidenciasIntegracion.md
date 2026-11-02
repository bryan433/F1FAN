# Evidencias de integración — F1Fan

Versión 0.3. Registro documental: 2026-11-02, America/Santiago. Relación con [MAN-006/MAN-008](ActasPruebasManuales.md), [casos](CasosDePrueba.md), [defectos](Defectos.md) e [informe](InformeResultados.md).

INT-001 a INT-004 son identificadores documentales de evidencia/escenario, no nuevos requisitos ni cuatro tests añadidos. Durante esta consolidación no se realizaron consultas externas ni se abrió Chrome. Se distinguen observaciones del usuario, inspección del código y ejecuciones Jest con red/almacenamiento simulados.

## INT-001 — HTTP 200 de clasificaciones Jolpica observado en Chrome

| Campo | Evidencia disponible |
|---|---|
| Fuente | Observación manual informada por el usuario, que solicita registrarla |
| Herramienta / aplicación | Chrome, Expo Web |
| Observación confirmada por ese informe | Una consulta de clasificaciones Jolpica mostró HTTP 200 |
| Petición exacta | URL completa y parámetros no adjuntos |
| Temporada/ronda / identidad de la tabla | No registradas; no se atribuye éxito por separado a pilotos y constructores |
| Fecha/hora/zona de observación | No proporcionadas; 2026-11-02 es fecha de documentación |
| Captura Network / HAR / respuesta JSON | No disponibles en docs/pruebas/evidencias/ |
| Caché del navegador / Service Worker | No se documentó from cache, tamaño transferido ni configuración de Network |
| Estado | **PARCIAL — observación de transporte informada, sin validación del contenido** |

Un HTTP 200 por sí solo no confirma temporada, ronda, coherencia de clasificaciones, identidad de pilotos/constructores, puntos/victorias ni compatibilidad de esquema. **No se declara inspeccionado o validado el JSON.** Tampoco se conoce si la respuesta procedía de red o caché del navegador.

Como referencia del código, [JolpicaService.js](../../src/services/JolpicaService.js) consulta rutas de clasificaciones de pilotos y constructores por año bajo https://api.jolpi.ca/ergast/f1/. Estas son rutas implementadas, no una transcripción de la URL histórica observada:

```text
/{year}/driverstandings.json
/{year}/constructorstandings.json
```

El año predeterminado se determina en [F1DataService.js](../../src/services/F1DataService.js) con America/Santiago; se admite histórico si se solicita explícitamente. Los tests comprueban ese contrato con fixtures. La inspección estática no demuestra lo recibido por Chrome.

Antecedente separado: los HTTP 404 de OpenF1 championship_drivers/championship_teams con year=2024 fueron observados por el usuario durante DEF-006. No se etiquetan como falta automática de conexión y no son evidencia exitosa de Jolpica.

## INT-002 — Caché y deduplicación: evidencia automatizada

Fuentes: [F1ChampionshipStandings.test.js](../../__tests__/services/F1ChampionshipStandings.test.js), [JolpicaService.test.js](../../__tests__/services/JolpicaService.test.js), [ChampionshipScreens.test.js](../../__tests__/screens/ChampionshipScreens.test.js), [FavoritesSync.test.js](../../__tests__/screens/FavoritesSync.test.js) y [LocalStorageManager.test.js](../../__tests__/storage/LocalStorageManager.test.js).

| Comportamiento comprobado | Resultado / alcance |
|---|---|
| Caché vigente y llamadas concurrentes | Aprobado con fetch/AsyncStorage simulados; comprueba reutilización y deduplicación |
| Copia vencida + error HTTP | Aprobado con mocks; origen stale-cache/advertencia y preservación de la copia |
| Error sin copia | Aprobado con mocks; datos vacíos/error apropiado, sin clasificación simulada de respaldo |
| Fuente/temporada y cachés antiguas incompatibles | Aprobado con mocks; no reutiliza silenciosamente el respaldo antiguo de OpenF1 |
| Seleccionar pilotos y modificar favoritos | Aprobado con mocks; no genera HTTP adicional por esas acciones |
| Migrar/eliminar favoritos y conservar colección vacía | Aprobado con mock de AsyncStorage; es preferencia persistida lógicamente, no caché de clasificación |

Las claves lógicas actuales de clasificaciones son jolpica_v2_driver_standings_{year} y jolpica_v2_constructor_standings_{year}; LocalStorageManager añade el prefijo físico @f1fan_cache_. El TTL de clasificaciones probado es 3.600.000 ms. La separación origen/año, TTL y copia vencida se justifican por código/tests, **no por un registro de Network o almacenamiento real**.

Resultados generales de esta actualización: **330 pruebas / 29 suites**; subconjunto unitario **225 / 22**, todos aprobados. Véanse [salida general](evidencias/jest-completo-2026-11-02.txt), [resumen de ejecución unitaria](evidencias/jest-unitario-cobertura-2026-11-02.txt) y [cobertura portátil](evidencias/cobertura-unitaria-resumen.json).

## INT-003 — Caché real, contenido y persistencia: comprobaciones parciales/pendientes

| Evidencia manual | Interpretación admitida | Lo que no demuestra |
|---|---|---|
| El usuario confirmó que seleccionar pilotos en Comparador no genera nuevas solicitudes | Selección opera sobre datos ya cargados | No prueba una lectura de caché persistida, TTL, copia vencida ni recarga offline |
| Se informó persistencia y preferencias existentes en Favoritos antes del último cambio | Había información guardada que se debía conservar | No valida migración a la clave nueva ni durabilidad/recarga posterior |
| HTTP 200 observado en Chrome | Hubo una observación de estado satisfactorio | No prueba origen de red frente a caché, ni contenido JSON |

**Estado: PARCIAL para las observaciones; PENDIENTE para la verificación física completa.** No hay acta de TTL vencido, desconexión real, respuesta sin copia, reinicio, contenido de claves o migración de datos personales archivada.

Protocolo para completar evidencia, todavía no ejecutado en esta tarea:

1. Registrar versión de código, entorno, fecha/hora/zona, temporada y estado inicial de caché. Proteger preferencias y usar perfil de prueba.
2. En Chrome Network, guardar la URL real, parámetros, estado, origen de caché y respuesta de cada tabla efectivamente consultada. Inspeccionar contenido y conservar evidencia mínima sin datos personales.
3. Comparar season/round, driverId/constructorId, puntos/victorias/posición recibidos con lo mostrado. Solo entonces declarar validación de esos campos concretos.
4. Volver a cargar durante TTL y contrastar la etiqueta de procedencia, claves/edad del almacenamiento y ausencia/presencia de peticiones. Distinguir caché de aplicación de caché HTTP del navegador.
5. En un perfil de prueba, contrastar copia vencida con red fallida y sin copia, registrar mensajes y recuperación al restablecer la red. No borrar las preferencias del perfil de uso.
6. Ejecutar por separado MAN-008 para favoritos múltiples, migración, `[]` definitivo y recarga. Es otro conjunto de claves, no una prueba de caché de clasificaciones.

No se incluyen resultados esperados como si fueran observaciones. La fecha del acta y los campos desconocidos deben completarse con datos reales cuando se ejecute.

## INT-004 — Evidencia visual con API simulada

- [comparador-375-demo.png](evidencias/comparador-375-demo.png): **SIMULACIÓN**, pilotos Ana Prueba/Bruno Ensayo, puntos 125,5/100 y victorias 3/1.
- [comparador-375-demo-medidas.json](evidencias/comparador-375-demo-medidas.json): medidas de viewport/documento de 375 px, separación de valores y barras.
- Escenario histórico VIS-001: Chrome headless, 375 × 1000 px, solicitudes interceptadas. No se repitió en esta tarea.
- Aunque la UI contiene Fuente: Jolpica · API, **la captura no prueba HTTP real ni clasificación oficial**. El archivo de medidas contiene geometría, no el payload original de Jolpica.
- No es evaluación de usuarios, auditoría de accesibilidad, rendimiento, prueba de dispositivo físico ni suite E2E/CI/CD.

## Límite de cierre

La plantilla requiere integridad de contratos API y evidencia de estado/persistencia. Jest aporta verificación interna con respuestas controladas; el HTTP 200 informado aporta observación parcial de transporte. Faltan contenido externo contrastado y protocolo físico reproducible. El SRS completo no está en el repositorio; no se asignan nuevos requisitos ni se declara conformidad del profesor.
