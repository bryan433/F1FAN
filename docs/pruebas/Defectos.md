# Registro de defectos — F1Fan

Versión 0.3 — consolidación posterior a DEF-008. Verificación Jest repetida el 2026-11-02, America/Santiago.

Este registro contiene ocho defectos confirmados durante el trabajo del proyecto y una corrección de navegación asociada a Favoritos, sin asignarle un ID de defecto adicional no solicitado. Las clasificaciones de severidad/prioridad son propuestas para revisión. No se asignan nombres, aprobaciones ni fechas históricas que no estén registradas. La aprobación académica permanece pendiente.

| ID | Defecto | Estado técnico | Regresión |
|---|---|---|---|
| DEF-001 | Pantalla blanca en DetalleGP por toggleFollow no definido | Corregido y verificado con regresión | AUT-018 y AUT-019 aprobados |
| DEF-002 | Pérdida de identidad, nombre y puntos al convertir TEAMS a Escuderia | Corregido y verificado con regresión | AUT-020 aprobado como test normal |
| DEF-003 | StandingsTable no reconoce nombre del modelo Escuderia | Corregido; regresión normal aprobada | AUT-034 |
| DEF-004 | StandingsTable fabrica comparación con cero o un piloto | Corregido; dos regresiones normales aprobadas | AUT-035 |
| DEF-005 | StandingsTable atribuye 100% al segundo con 0/0 puntos | Corregido; regresión normal aprobada | AUT-036 |
| DEF-006 | Clasificaciones con contrato de consulta incorrecto, año fijo y respaldos simulados | Flujo vigente corregido; mocks aprobados; HTTP 200 informado, contenido externo pendiente | AUT-040 a AUT-043; MAN-006 |
| DEF-007 | Comparador no permite seleccionar ambos pilotos independientemente | Corregido; regresión y confirmación manual | AUT-044, MAN-005 |
| DEF-008 | Favoritos desincronizados, selección única y compatibilidad de identificadores | Corregido técnicamente para selección múltiple; regresiones aprobadas; revalidación manual final pendiente | AUT-045 a AUT-047; MAN-008 |
| Sin nuevo ID | Falta de flecha de regreso en Favoritos | Flecha conservada, navegación/fallback con regresiones; presencia manual confirmada | AUT-048; MAN-007 |

Fuentes comunes: [casos](CasosDePrueba.md), [informe de ejecución](InformeResultados.md), [actas](ActasPruebasManuales.md) y código enlazado en cada ficha. Corregir estos registros no demuestra ausencia de otros defectos ni cierra su validación manual pendiente.

## DEF-001 — DetalleGPScreen en blanco por toggleFollow no definido

| Campo | Registro |
|---|---|
| Módulo | DetalleGPScreen |
| Tipo | Funcional / excepción de renderizado |
| Severidad y prioridad propuestas | Mayor / P2: impide utilizar el detalle, aunque otras pantallas pueden seguir disponibles |
| Detección | Validación manual en Expo Web comunicada por el usuario; Chrome DevTools mostró ReferenceError |
| Mensaje observado informado | `ReferenceError: toggleFollow is not defined` |
| Fecha histórica de detección/corrección | No consignada en un acta; no se asigna retrospectivamente |
| Responsable / revisor | Por registrar; sin nombres proporcionados |
| Estado | Corregido y verificado mediante regresión automatizada |

### Precondiciones y reproducción histórica

1. Abrir la versión afectada en Expo Web.
2. Entrar a DetalleGP con un GP seleccionado.
3. El render intenta evaluar onPress={toggleFollow}, pero ese identificador no está definido.
4. Observar pantalla en blanco y el ReferenceError en la consola.

Esta reproducción describe el fallo histórico informado; no se restauró código defectuoso durante la elaboración documental. No se dispone de captura ni stack completo adjunto.

### Esperado y observado

- **Esperado:** renderizar el GP seleccionado y mostrar el control SEGUIR operativo.
- **Observado histórico:** el render se interrumpía por la referencia inexistente y la pantalla quedaba en blanco.
- **Causa:** el JSX utilizaba un manejador no declarado; faltaba el estado local requerido para el seguimiento visual.

### Corrección y alcance

La implementación actual de [DetalleGPScreen.js](../../src/screens/DetalleGPScreen.js) declara isFollowing con useState(false) y toggleFollow con actualización funcional del estado. Conserva el renderizado del GP y el botón de regreso. SEGUIR solo modifica el estado visual local: no implementa persistencia, suscripción a avisos ni notificaciones.

### Verificación de regresión

Fuente: [DetalleGPScreen.test.js](../../__tests__/screens/DetalleGPScreen.test.js).

- `se renderiza sin errores con el meeting recibido`: monta el componente real dentro de not.toThrow y comprueba nombre, circuito y SEGUIR; corresponde a AUT-018.
- `permite activar y desactivar el seguimiento`: comprueba SEGUIR → SIGUIENDO → SEGUIR.
- `la flecha ejecuta navigation.goBack una vez`: comprueba el callback de regreso; junto con el anterior corresponde a AUT-019.

**Resultado actual: APROBADO** en la suite completa de 330 pruebas normales. El usuario había comunicado que la pantalla ya abría manualmente tras la corrección; ese antecedente no sustituye un acta manual nueva con entorno, pasos y capturas.

### Evidencia pendiente

- Captura/registro original de Chrome, si todavía existe; no reconstruirlo ni presentarlo como evidencia obtenida ahora.
- Acta actual de navegación real Inicio/Calendario → DetalleGP → regreso en Expo Web.
- Registro de revisión y aceptación del cierre por el equipo; aprobación académica no registrada.

## DEF-002 — Incompatibilidad de campos del respaldo TEAMS y Escuderia

| Campo | Registro |
|---|---|
| Módulo | F1DataService.getTeamStandings, ruta de respaldo local |
| Tipo | Integridad de transformación de datos |
| Severidad y prioridad propuestas | Mayor / P2: devuelve datos incompletos de una clasificación principal |
| Detección | Pruebas automatizadas del respaldo local durante la ampliación de F1DataService |
| Fecha histórica de detección/corrección | Sin acta fechada independiente; verificación documental actual el 2026-11-02 |
| Responsable / revisor | Por registrar |
| Estado | Corregido y verificado con test normal; sin test.failing |

### Precondiciones y reproducción histórica

1. Utilizar F1DataService real y sustituir la consulta externa por una respuesta vacía.
2. Dejar sin caché vigente ni última copia la clasificación de escuderías.
3. Invocar getTeamStandings(), que recurre a TEAMS.
4. Comparar identificador, nombre y puntos de los modelos devueltos con el respaldo local.

Datos: [TEAMS](../../src/data/teamsAndDrivers.js), con propiedades id, name y points. Ejemplo local: McLaren tiene id=mclaren, name=McLaren y points=592; Kick Sauber tiene cero puntos. Estos valores pertenecen al archivo local y no acreditan una clasificación actual consultada por API.

### Esperado y observado

| Campo | Esperado para el ejemplo local McLaren | Observado antes de la corrección |
|---|---|---|
| idEscuderia | mclaren | undefined |
| nombre | McLaren | undefined |
| puntos | 592 | 0 |

**Causa exacta:** getTeamStandings entregaba los registros de TEAMS directamente a new Escuderia(t). El constructor de [Escuderia](../../src/models/Escuderia.js) recibe idEscuderia, nombre y puntos; no convierte los alias id/name/points. Los dos primeros quedaban sin definir y puntos adoptaba el valor predeterminado 0.

### Corrección y alcance

En [F1DataService.js](../../src/services/F1DataService.js), la ruta que recurre al respaldo local adapta cada registro antes de construir Escuderia:

```js
const list = last || TEAMS.map(team => ({
  ...team,
  idEscuderia: team.id,
  nombre: team.name,
  puntos: team.points,
}));
```

Se conservan el resto de campos y el cero legítimo, sin cambiar la interfaz pública del modelo ni modificar pantallas. La corrección se limita al respaldo TEAMS: no se presenta como una adaptación nueva del contrato de OpenF1 ni como verificación visual de la tabla de constructores.

### Verificación de regresión

Fuente: [F1DataService.test.js](../../__tests__/services/F1DataService.test.js), caso AUT-020, test `conserva identidad, nombre y puntos del respaldo local`.

1. La prueba fue registrada inicialmente con test.failing para identificar el defecto conocido.
2. Al convertirla en test normal antes de corregir producción, falló y mostró los campos perdidos.
3. Tras adaptar TEAMS, el mismo caso normal aprobó.
4. Comprueba todos los equipos locales, incluido el que tiene cero puntos, y que las instancias sean Escuderia.

**Resultado actual: APROBADO como test normal.** La suite completa contiene 330 pruebas normales aprobadas; no hay excepciones de fallo esperado para este defecto. Las rutas existentes de caché y respuestas compatibles con el modelo siguen aprobadas.

### Evidencia pendiente

- Validación manual de la presentación de constructores en Expo Web: la regresión del servicio no verifica todos los consumidores visuales.
- Registrar revisión y aceptación del equipo. No hay fecha de aprobación ni conformidad del profesor documentadas.

## DEF-003 — StandingsTable no reconoce nombre del modelo Escuderia

| Campo | Registro |
|---|---|
| Módulo | StandingsTable, pestaña CONSTRUCTORES |
| Tipo | Integridad de interfaz / presentación |
| Severidad / prioridad propuestas | Mayor / P2 |
| Detección | Prueba con una instancia real de Escuderia |
| Estado | Corregido y verificado con regresión normal |
| Fecha histórica / responsables / aprobación | Sin acta histórica ni asignaciones nominales; por registrar |

### Reproducción, esperado y observado

Renderizar StandingsTable con new Escuderia({ nombre: 'Equipo del modelo', puntos: 50 }) y abrir CONSTRUCTORES. Se esperaba ver el nombre del modelo y sus puntos. La versión afectada consultaba únicamente name/fullName, por lo que omitía nombre.

### Causa y corrección

Se adaptó la presentación a nombre del modelo, conservando name/fullName para formatos heredados realmente utilizados. No se cambió la estructura pública de Escuderia.

### Regresión y evidencia

[StandingsTable.test.js](../../__tests__/components/StandingsTable.test.js), AUT-034: test `DEFECTO: debe mostrar el nombre del modelo Escuderia que recibe de F1DataService`. **APROBADO como test normal**. El prefijo histórico DEFECTO del nombre no indica que el test siga fallando. No hay captura histórica del fallo.

## DEF-004 — Comparación ficticia con cero o un piloto en StandingsTable

| Campo | Registro |
|---|---|
| Módulo | StandingsTable, comparación inferior |
| Tipo | Integridad de participantes y puntuaciones |
| Severidad / prioridad propuestas | Mayor / P2 |
| Detección | Dos pruebas de límites, listas de cero y un piloto |
| Estado | Corregido; ambas regresiones normales aprobadas |
| Fecha histórica / responsables / aprobación | Sin acta histórica ni asignaciones nominales; por registrar |

### Reproducción, esperado y observado

Renderizar primero con drivers=[] y luego con un solo piloto. El resultado esperado es informar que faltan participantes, sin crear rivales ni puntos. La versión afectada completaba la comparativa con participantes y puntuaciones fijos cuando faltaban entradas.

### Causa y corrección

Se eliminaron los respaldos ficticios del componente. Se comprueba la presencia de los dos primeros pilotos y, si no existen, se muestra `Se necesitan al menos dos pilotos para comparar.`.

### Regresión y evidencia

[StandingsTable.test.js](../../__tests__/components/StandingsTable.test.js), AUT-035:

- `DEFECTO: una lista vacía no debe presentar pilotos y puntos ficticios en la comparación`.
- `DEFECTO: con un solo piloto no debe inventar un segundo participante`.

**Ambas APROBADAS como tests normales**, sin test.failing/skip. No se generó una captura histórica del defecto.

## DEF-005 — Porcentajes engañosos cuando ambos pilotos tienen cero puntos

| Campo | Registro |
|---|---|
| Módulo | StandingsTable, cálculo de comparación |
| Tipo | Integridad de cálculo / caso límite |
| Severidad / prioridad propuestas | Mayor / P2 |
| Detección | Regresión con puntos [0, 0] |
| Estado | Corregido; regresión normal aprobada |
| Fecha histórica / responsables / aprobación | Por registrar; sin aprobación académica |

### Reproducción, esperado y observado

Entregar dos pilotos con cero puntos. No existe reparto porcentual calculable sobre un total cero; se esperaba un aviso. La versión afectada calculaba el segundo porcentaje como complemento del primero sin distinguir ese caso, atribuyéndole 100%.

### Causa y corrección

La comparación requiere dos puntuaciones numéricas finitas, no negativas y total finito mayor que cero. Con total cero informa `No hay puntos para calcular porcentajes.`; con valores inválidos informa que no hay puntuaciones válidas. Se conserva el cálculo proporcional con datos suficientes, sin divisiones inválidas.

### Regresión y evidencia

[StandingsTable.test.js](../../__tests__/components/StandingsTable.test.js), AUT-036: `DEFECTO: dos pilotos sin puntos no deben atribuir el 100% de los puntos al segundo` **APROBADO como test normal**. El caso 30/10 continúa verificando 75%/25%.

DEF-003, DEF-004 y DEF-005 produjeron en conjunto **cuatro fallos históricos**: uno de nombre, dos de participantes insuficientes y uno de cero puntos. Esas cuatro regresiones siguen presentes y normales en la suite actual; no se alteraron expectativas para ocultar los defectos.

## DEF-006 — Clasificaciones de año fijo y respaldos simulados presentados como información real

| Campo | Registro |
|---|---|
| Módulos | ClasificacionScreen, ComparadorScreen, F1DataService; integración de clasificaciones con JolpicaService y presentación en DriverCard/StandingsTable |
| Tipo | Fiabilidad del origen, integridad y mensajes de error |
| Severidad / prioridad propuestas | Mayor / P2 |
| Detección | Validación manual informada: encabezado 2024, aviso de desconexión y HTTP 404 de OpenF1 en Chrome Console; inspección de fuentes del Comparador |
| Estado | Corregido en las pantallas vigentes y verificado con mocks; verificación HTTP real exitosa pendiente |
| Evidencia histórica HTTP | Relato del usuario; sin HAR/captura de consola archivados |
| Fecha histórica / responsables / aprobación | No consignadas; por registrar |

### Reproducción, esperado y observado

1. En la versión afectada, abrir Clasificación sin seleccionar temporada histórica.
2. Observar `CAMPEONATO MUNDIAL 2024` y solicitudes `championship_drivers?year=2024` / `championship_teams?year=2024`.
3. Ante los HTTP 404 informados, observar `Sin conexión - Mostrando última clasificación guardada`.
4. Abrir Comparador: estadísticas locales de 2024 y delta fijo -0.180s.

Se esperaba año actual de Santiago, fuente identificada y errores diferenciados; sin respaldo real disponible debía informarse ausencia de datos.

### Causas confirmadas

- F1DataService tenía llamadas de clasificaciones OpenF1 con 2024 fijo; el contrato consultado no correspondía a las clasificaciones por sesión y sus campos documentados. El código tampoco adaptaba ese formato como la respuesta Jolpica actual.
- Todo error de consulta activaba offline; un HTTP 404 por sí solo no prueba pérdida de conexión.
- Las claves antiguas driver_standings/team_standings no separaban año/fuente y podían recuperarse junto con constantes DRIVERS/TEAMS.
- Comparador importaba directamente DRIVERS y mostraba estadísticas y un delta de ritmo fijos.

La causa interna exacta del 404 del servidor no puede deducirse del relato; se documenta el uso incorrecto del contrato y la clasificación incorrecta del error, sin afirmar que los endpoints OpenF1 no existan.

### Corrección y alcance vigente

- JolpicaService agregó getSeasonDriverStandings/getSeasonConstructorStandings, con paginación, timeout, caché de una hora y deduplicación en curso.
- F1DataService.getChampionshipStandings usa el año de Santiago por defecto y conserva source, season, round, identidad, cifras y origen api/cache/stale-cache; las dos tablas pueden tener estados distintos.
- Claves separadas: jolpica_v2_driver_standings_{year} y jolpica_v2_constructor_standings_{year}. No se recuperan automáticamente cachés OpenF1 ni de otro año.
- Clasificación conserva pestañas, favoritos y rutas registradas; muestra año, fuente, ronda, errores y copia guardada sin presentar HTTP 404 como desconexión.
- Comparador usa los pilotos cargados; conserva puntos, victorias y posición publicada. Poles, podios y delta de ritmo permanecen No disponible.
- DriverCard/StandingsTable respetan valores desconocidos y posiciones publicadas no numéricas, sin asignar una clasificación por índice a esos registros Jolpica.

Los métodos antiguos getDriverStandings/getTeamStandings y sus pruebas se conservan por compatibilidad, pero estas pantallas ya no los usan. PerfilPilotoScreen/LiveScreen y otras demostraciones quedan fuera de esta corrección.

### Regresión y evidencia

AUT-040 a AUT-043, en [F1ChampionshipStandings.test.js](../../__tests__/services/F1ChampionshipStandings.test.js) y [ChampionshipScreens.test.js](../../__tests__/screens/ChampionshipScreens.test.js): origen, año de Santiago/histórico explícito, caché reciente/vencida, HTTP 404/503, paginación, timeout, datos vacíos/ausentes, favoritos y ausencia de estadísticas ficticias. Las pruebas ejecutan servicios reales con fetch/AsyncStorage simulados.

**APROBADO dentro de las 330 pruebas actuales, con mocks.** El usuario informa posteriormente HTTP 200 observado en Chrome para clasificaciones Jolpica; se registra como evidencia parcial en MAN-006/INT-001. No hay URL completa ni cuerpo/HAR adjuntos, por lo que no se declara validación de contenido JSON ni de ambos endpoints. Queda archivar temporada, respuesta y comportamiento de caché real. El intento histórico fallido mediante herramienta web se mantiene como antecedente, no como evidencia de éxito.

## DEF-007 — Comparador solo permite cambiar el piloto izquierdo

| Campo | Registro |
|---|---|
| Módulo | ComparadorScreen |
| Tipo | Limitación funcional de selección |
| Severidad / prioridad propuestas | Mayor / P2: restringe las parejas comparables |
| Detección | Validación manual del usuario; piloto derecho permanecía como segundo participante |
| Estado | Corregido; regresiones normales y confirmación manual del usuario |
| Evidencia manual | MAN-005; formato móvil confirmado, sin acta con dimensiones/navegador completos |
| Fecha histórica / responsables / aprobación | Por registrar; sin aprobación académica |

### Reproducción, esperado y observado

Cargar más de dos pilotos y pulsar el control general de cambio repetidamente. Se esperaba poder escoger cada lado; solo se modificaba el izquierdo. El derecho no estaba fijado por nombre: mantenía indexB=1, que en el entorno observado correspondía a Verstappen.

### Causa y corrección

swapDrivers intercambiaba ambos índices únicamente cuando había dos pilotos; con más participantes solo avanzaba indexA. Se agregaron selectores independientes que usan la lista cargada y deshabilitan al rival por identidad. Se puede cancelar; los controles generales ahora intercambian la pareja elegida y se rotulan INTERCAMBIAR PILOTOS. Elegir pilotos modifica estado local y no vuelve a consultar la API.

Se conservaron estadísticas verificables, estados No disponible, temporada/fuente y regreso. No se modificaron servicios para resolver este defecto.

### Regresión y evidencia

AUT-044 en [ChampionshipScreens.test.js](../../__tests__/screens/ChampionshipScreens.test.js): selección derecha conservando izquierda, cambios en ambos lados, 2026/2024 explícita, rival deshabilitado en ambos selectores, cancelación/intercambio, ficha incompleta y límite de dos pilotos. **Ocho casos nuevos aprobados**; los anteriores se conservaron y adaptaron a los controles actuales.

El usuario confirmó manualmente selección independiente, intercambio, prevención de duplicados y ausencia de nuevas solicitudes al seleccionar. No se convierte esa confirmación en evaluación formal de usabilidad o en prueba HTTP exitosa de la fuente.

### Ajustes visuales posteriores, sin nuevo ID de defecto

Se diferenciaron los lados con cian/naranja: ambos modelos recibían blanco y ocultaban visualmente la proporción, aunque los cálculos eran correctos. Los títulos de métricas se colocaron encima de dos columnas para separar No disponible. No se alteraron datos ni selección.

VIS-001 verificó Chrome a **375 × 1000 px** con **API simulada**: [captura de demostración](evidencias/comparador-375-demo.png), [medidas DOM](evidencias/comparador-375-demo-medidas.json). No hay desbordamiento horizontal ni solapamiento en ese escenario; no acredita accesibilidad ni rendimiento.

## DEF-008 — Favoritos múltiples y sincronizados entre Clasificación y Más → Favoritos

| Campo | Registro |
|---|---|
| Módulos | LocalStorageManager, utils/favorites, ClasificacionScreen, FavoritosScreen; acceso desde MasScreen y presentación de DriverCard/StandingsTable |
| Tipo | Funcional, integridad de identidad y estado persistido |
| Severidad / prioridad propuestas | Mayor / P2: pérdida aparente de selecciones y estados contradictorios |
| Detección | Validación manual del usuario en Expo Web; el primer ajuste se reabrió al comprobar selección única y eliminación desincronizada |
| Requisito definitivo | Varios pilotos favoritos simultáneamente; agregar/quitar uno conserva los demás |
| Estado técnico | Corregido y aprobado con regresiones normales; cierre manual final pendiente |
| Responsables / aprobación / fecha histórica | Por registrar; la fecha de esta consolidación no sustituye la fecha de observación |

### Reproducción histórica y alcance del fallo

1. Marcar Verstappen como favorito en Clasificación y entrar en Más → Favoritos: el piloto aparecía.
2. Marcar un segundo piloto: el primero perdía su estrella y se reemplazaba la selección.
3. Eliminar un piloto en Favoritos y regresar: la estrella de Clasificación no siempre se desmarcaba.
4. Se confirmó posteriormente que la flecha de Favoritos ya era visible y debía conservarse.

La pantalla tenía preferencias guardadas que no debían perderse. Estos pasos corresponden a observaciones anteriores a la última corrección, no a una nueva ejecución manual del código actual.

### Causas identificadas

- El almacenamiento histórico `@f1fan_favorite_driver` tenía un contrato de favorito único. La corrección previa conservó explícitamente el reemplazo cuando el valor era escalar/objeto, aunque preservaba listas antiguas.
- Ambas pantallas releían preferencias al recibir focus, sin una suscripción compartida a cambios. El regreso desde una pantalla del stack no garantizaba la actualización inmediata del tab; lecturas asíncronas podían completar con estado anterior.
- Había identificadores numéricos/textuales, códigos y alias locales frente a driverId estables de Jolpica. El dorsal por sí solo puede cambiar o corresponder a otro piloto.

### Corrección actual

- [LocalStorageManager.js](../../src/storage/LocalStorageManager.js): fuente principal `@f1fan_favorite_drivers`, array de registros de identidad. `guardarFavorito` agrega/actualiza sin sustituir a los demás; driverId distingue identidades aunque coincida o cambie el dorsal. Conserva metadatos existentes cuando un consumidor antiguo entrega solo el número.
- La primera lectura migra el escalar, objeto o lista antiguos cuando falta la clave nueva. La clave antigua se conserva como respaldo y **deja de consultarse en cuanto existe la colección nueva**. `[]` es válido y se conserva al eliminar el último: no reimporta un favorito borrado. Si falla la migración, se preservan los originales.
- Los cambios se serializan para no perder selecciones concurrentes. Se notifican solo escrituras exitosas y se puede cancelar la suscripción. Las escuderías mantienen `@f1fan_favorite_teams` y participan en la actualización compartida.
- [favorites.js](../../src/utils/favorites.js): resuelve alias y agrupa duplicados visuales; usa driverId para eliminar registros con identidad conocida y conserva desconocidos visibles/eliminables. Los datos locales apoyan identidad, no estadísticas oficiales.
- [ClasificacionScreen.js](../../src/screens/ClasificacionScreen.js) y [FavoritosScreen.js](../../src/screens/FavoritosScreen.js): suscripción a preferencias y control del orden de lecturas. Marcar/desmarcar/eliminar actualiza ambas pantallas sin depender exclusivamente del foco ni volver a consultar estadísticas. Los alias de una misma identidad se eliminan en una sola operación.

### Regresión y resultado actual

AUT-045 a AUT-047: [FavoriteDriversCollection.test.js](../../__tests__/storage/FavoriteDriversCollection.test.js), [FavoritesCompatibility.test.js](../../__tests__/storage/FavoritesCompatibility.test.js), [LocalStorageManager.test.js](../../__tests__/storage/LocalStorageManager.test.js), [favorites.test.js](../../__tests__/utils/favorites.test.js) y [FavoritesSync.test.js](../../__tests__/screens/FavoritesSync.test.js).

La última corrección agregó **15 pruebas** (12 de almacenamiento y 3 de sincronización) y mantuvo los casos existentes. Dos expectativas de reemplazo único se cambiaron por comprobaciones de conservación de múltiples selecciones, por el requisito definitivo del usuario. No se eliminaron casos ni se usaron skip/test.failing para ocultar fallos.

Se cubren selección múltiple, eliminación individual en ambos sentidos, pantallas montadas sin focus, regreso con flecha, remontaje, migración, colección vacía, duplicados/alias, cambios de dorsal, identidad estable, datos desconocidos, corrupción/fallo de escritura, concurrencia y escuderías. **APROBADO en la nueva ejecución: 330 pruebas / 29 suites; 225 unitarias / 22 suites.** AsyncStorage y HTTP están simulados.

### Pendiente de cierre manual

MAN-008 requiere probar la versión final en Expo Web: dos pilotos simultáneos, eliminar uno y volver, recargar la aplicación, migrar preferencias reales protegidas y comprobar `[]`/escuderías. El historial de persistencia informado por el usuario no acredita estas variantes posteriores a la migración. No se declaran confirmadas hasta contar con nueva observación.

## Corrección asociada — Flecha y regreso seguro de Favoritos

No se asigna un nuevo número DEF: es la solicitud de navegación recibida durante el cierre de Favoritos.

- **Problema informado:** Más → Favoritos no tenía control visible de regreso dentro de la aplicación.
- **Corrección:** botón con icono arrow-back, área de 44 × 44 y nombre accesible `Volver`, consistente con el encabezado. Con `navigation.canGoBack?.()` verdadero ejecuta `navigation.goBack()`; con falso o ausente utiliza la ruta registrada `navigation.navigate('MainTabs', { screen: 'Más' })`.
- **Conservación:** no cambia preferencias; el último ajuste múltiple mantiene la flecha y el fallback.
- **Regresión AUT-048:** tres variantes de historial y una integración de eliminación/regreso, todas aprobadas en FavoritesSync.test.js. Navigation es un mock: no acredita el recorrido real de React Navigation en Web o dispositivo.
- **Manual MAN-007:** el usuario confirmó que la flecha aparece. Su pulsación efectiva, acceso directo/fallback, conservación al regresar y funcionamiento nativo quedan pendientes de evidencia manual; no se presenta el atributo accesible como auditoría WCAG.

## Observaciones que requieren seguimiento separado

- La cobertura mínima del 80% está **cumplida en las cuatro métricas del alcance unitario**: 85,71% instrucciones, 84,41% ramas, 87,81% funciones y 85,71% líneas. Son 225 pruebas unitarias en 22 suites, incluidas en las 330 de 29 suites generales.
- PerfilPilotoScreen mantiene textos de 2024, historial fijo y algunos respaldos; LiveTiming mantiene sesión predeterminada y datos simulados; TelemetryWidget tiene predeterminados de demostración. No se declara saneado todo el proyecto por corregir Clasificación y Comparador.
- Se requieren contenido/archivo de la consulta HTTP 200 informada, persistencia final del navegador, usabilidad, accesibilidad y rendimiento, además de revisión de cierre. E2E/CI/CD no están implementados como suite/pipeline.
- Los ocho registros tienen corrección técnica y regresiones aprobadas; DEF-008 y la navegación conservan validación manual final pendiente. La clasificación propuesta no contiene un registro crítico/bloqueante abierto, pero no acredita ausencia de otros defectos ni aceptación académica.
