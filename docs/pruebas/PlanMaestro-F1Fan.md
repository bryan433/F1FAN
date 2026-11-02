# Plan Maestro de Pruebas de Software — F1Fan

Estrategia de QA: funcionalidad, integridad, usabilidad y automatización.

| Control | Valor |
|---|---|
| Proyecto | F1Fan, React Native con Expo para móvil y web |
| Versión documental | 0.3 — actualización posterior a DEF-008; revisión y aprobación pendientes |
| Corte documental | 2026-11-02, America/Santiago |
| Responsable de QA | Por asignar entre los tres integrantes |
| Estado / aprobación | Resultados técnicos consolidados; sin conformidad académica registrada |
| Referencia | [Plan_Maestro_Pruebas_Software.docx](../referencias/Plan_Maestro_Pruebas_Software.docx), conservada sin modificaciones |
| Documentos asociados | [Casos](CasosDePrueba.md), [defectos](Defectos.md), [resultados](InformeResultados.md), [actas manuales](ActasPruebasManuales.md), [integración](EvidenciasIntegracion.md), [checklist](ChecklistEntrega.md) |

Se conservan las secciones 1 a 6 y el enfoque de QA de la plantilla. Los ejemplos de comercio electrónico se adaptan a las funciones existentes de F1Fan. No se atribuyen al proyecto certificaciones, bases de datos transaccionales, pipelines ni evaluaciones inexistentes.

## 1. Información General y Control del Documento

### 1.1. Propósito y Objetivos

Verificar funciones y coherencia de datos, prevenir regresiones y reunir evidencias de presentación y uso. Los objetivos comprenden:

- Calendario y próximo GP reales, identidad season/round, UTC original y conversión a America/Santiago.
- Clasificaciones de Jolpica de la temporada actual de Santiago; años históricos solo si se solicitan explícitamente.
- Comparación independiente de dos pilotos disponibles, sin duplicar participante ni fabricar estadísticas.
- Caché por origen/temporada, favoritos y manejo de errores sin confundir HTTP 404 con desconexión.
- Selección múltiple de pilotos favoritos, sincronización bidireccional y migración compatible del almacenamiento anterior.
- Regresiones normales de DEF-001 a DEF-008 y regreso seguro desde Favoritos.
- Evidencia manual y visual diferenciada de pruebas con API/AsyncStorage simulados.

Resultados ejecutados nuevamente el **2026-11-02** para esta documentación: **330 pruebas aprobadas en 29 suites**; el subconjunto unitario contiene **225 pruebas aprobadas en 22 suites**. Cobertura unitaria: **85,71% instrucciones, 84,41% ramas, 87,81% funciones y 85,71% líneas**. Se superó el mínimo del **80% en las cuatro métricas del alcance unitario configurado**. Esto no demuestra cobertura del 80% de todo src ni cierra los demás criterios de QA. Salidas y resumen portátil en [InformeResultados.md](InformeResultados.md).

### 1.2. Alcance (Scope)

| Área | Alcance y evidencia disponible |
|---|---|
| Componentes reutilizables | LoadingScreen, OfflineBanner, SessionCard, CountdownTimer, RaceCard, DriverCard, StandingsTable, TelemetryWidget y TrackMap |
| Dominio y horarios | GranPremio, Sesion, Piloto, Escuderia, JolpicaCalendarAdapter y timezone; otros modelos permanecen en el denominador aunque carezcan de tests directos |
| Servicios y persistencia | JolpicaService y F1DataService reales con dependencias externas simuladas; LocalStorageManager con mock de AsyncStorage |
| Pantallas | Inicio, Calendario, DetalleGP, Historial, AR, Clasificación, Comparador, Favoritos y acceso desde Más mediante RNTL; incluye FavoritesSync.test.js |
| Validación manual disponible | Comparador confirmado en móvil; HTTP 200 de Jolpica informado en Chrome; flujo individual de favoritos observado, fallos de selección múltiple/sincronización detectados y flecha de Favoritos visible. Alcances y límites en las actas |
| Comprobación visual disponible | Chrome headless a 375 × 1000 px, aplicación Expo Web con API simulada; captura y medidas archivadas como VIS-001 |
| Manual pendiente | Revalidación de DEF-008 tras la última corrección, migración/persistencia tras recarga, funcionamiento de la flecha, contenido JSON externo, usabilidad, accesibilidad y rendimiento |

Fuera de lo implementado o demostrado: suite E2E mantenida, CI/CD, quality gates, auditoría WCAG, evaluación con participantes, telemetría real nueva y pruebas nativas Android/iOS. ACID de una base de datos relacional no corresponde a esta arquitectura de persistencia local.

Actualización del clon integrado: [IntegracionLocal.md](IntegracionLocal.md) registra 349 pruebas aprobadas en 31 suites (las 330 originales más 19 regresiones de RF-04/Perfil), con 225 pruebas unitarias en 22 suites y cobertura unitaria sin cambios. Conserva los pendientes manuales. Las referencias posteriores a 330/29 describen el corte del respaldo original.

El README y algunos diagramas mantienen descripciones antiguas. El código actual usa Jolpica para calendario, Historial y las clasificaciones que alimentan estas dos pantallas. Los métodos heredados getDriverStandings/getTeamStandings conservan OpenF1/2024 y constantes locales, pero Clasificación y Comparador ya no los consumen. PerfilPilotoScreen, LiveScreen y TelemetryWidget conservan datos o valores de demostración que requieren revisión separada; no se presentan aquí como información oficial validada.

### 1.3. Matriz de Trazabilidad y Aprobaciones

AUT, MAN, VIS e INT son IDs documentales de QA, no requisitos nuevos. No se encontró el SRS completo en el repositorio revisado; el README lo menciona y los diagramas contienen contratos antiguos. Las asociaciones sustentadas en comentarios son parciales y deben contrastarse con su versión oficial. La selección múltiple es el requisito funcional definitivo comunicado por el usuario durante DEF-008: se documenta sin atribuirle un RF/HU/CU nuevo ni modificar el enunciado no disponible de CU-06.

| ID existente | Fuente verificable | Relación respaldada | Casos | Estado / límite |
|---|---|---|---|---|
| HU-02 | [README](../../README.md), [timezone](../../src/utils/timezone.js) | Horarios America/Santiago | AUT-006, AUT-007, AUT-010, AUT-017, AUT-031 | Aprobados con datos controlados; contraste HTTP real y acta MAN-001 pendientes |
| CU-02 | Comentarios de [F1DataService](../../src/services/F1DataService.js) y [LocalStorageManager](../../src/storage/LocalStorageManager.js), README | Clasificaciones y persistencia; asociación parcial, sin enunciado íntegro | AUT-020 a AUT-022 (legados); AUT-040 a AUT-042 para flujo vigente | Aprobados con mocks; no certifica clasificación externa actual |
| CU-06 | README, LocalStorageManager y PerfilPilotoScreen | Favoritos de pilotos; cardinalidad formal por confirmar en SRS | AUT-025, AUT-033, AUT-042, AUT-045 a AUT-047; apoyo legado de AUT-021 | Aprobados con almacenamiento simulado; selección múltiple definida por el usuario; persistencia física final pendiente |
| RNF-PER-01 | README y cabecera de LocalStorageManager | Persistencia local, formulación completa por confirmar | AUT-024, AUT-025, AUT-045, AUT-046 | Evidencia lógica parcial; migración y vacíos con mocks |
| RNF-PER-02 | obtenerUltimaCopiaCache, README | Última copia y recuperación | AUT-011, AUT-015, AUT-024, AUT-029, AUT-041 | Aprobados con mocks; desconexión real reproducible pendiente |
| RNF-01 | README y cabecera de OpenF1Client | Renderizado menor a 3 segundos | MAN-004 | Pendiente de protocolo y mediciones; duración de Jest no es rendimiento de la app |
| RNF-02 | README y OpenF1Client | Límite de 30 peticiones/minuto de OpenF1 | Sin caso específico ejecutado | Pendiente; deduplicar consultas Jolpica no prueba este límite de OpenF1 |

Los comportamientos sin ID formal adicional se vinculan al código y al requisito explícito del usuario: StandingsTable, Comparador, selección múltiple/sincronización y regreso de Favoritos (AUT-034 a AUT-036, AUT-043 a AUT-048, MAN-005 a MAN-008 y VIS-001). La matriz caso → fuente → defecto está en [CasosDePrueba.md](CasosDePrueba.md). SD-01 a SD-08 son referencias a diagramas, no requisitos de aceptación; SD-03 aún describe un ID de favorito único y no prueba el contrato múltiple actual.

La aprobación del equipo y del profesor y la confirmación de trazabilidad contra el SRS siguen pendientes.

## 2. Estrategia y Tipologías de Pruebas

### 2.1. Pruebas de Funcionalidad

- Flujos nominales: próximos GP, filtros y temporadas, pestañas, favoritos, selección e intercambio de pilotos.
- Límites: cero puntos/vueltas, listas vacías o con un solo piloto, horarios desconocidos y cambios de día/año.
- Errores: HTTP 404/503, timeout, datos inválidos, tablas parcialmente disponibles y errores de persistencia.
- Presentación: estados confirmados frente a desconocidos y ausencia de estadísticas ficticias.

RNTL verifica contenido y eventos; navigation simulado comprueba callbacks y parámetros, no la navegación completa en dispositivo.

### 2.2. Pruebas de Integridad

Se comprueba identidad de GP/pilotos/escuderías, transformación de campos, paginación, temporada y ronda, ceros legítimos, caché aislada por año/origen y favoritos. HTTP 404 conserva su naturaleza de error HTTP y no activa datos locales como si fueran oficiales. Se conservan las caracterizaciones de contratos legados sin atribuirles vigencia.

Para DEF-008 se verifica la colección `@f1fan_favorite_drivers`, migración desde `@f1fan_favorite_driver`, preferencia de la colección nueva incluso si contiene `[]`, identidad `driverId` y alias compatibles, eliminación individual y cambios serializados. Las suscripciones actualizan pantallas montadas sin depender exclusivamente del foco y sin consultar estadísticas otra vez. Las escuderías conservan `@f1fan_favorite_teams`.

Las respuestas JSON controladas no sustituyen validación contra la API externa, ni hay validador formal JSON Schema/OpenAPI instalado. Los mocks de AsyncStorage no demuestran durabilidad física ni propiedades ACID de una base de datos.

### 2.3. Pruebas de Usabilidad y Experiencia (UX/UI)

Evidencia ejecutada:

- **MAN-005:** exploración manual del Comparador confirmada por el usuario en formato móvil: dos selecciones independientes, intercambio y prevención de duplicados. No es evaluación con participantes ni prueba documentada de HTTP real.
- **MAN-006 a MAN-008:** actas retrospectivas de Clasificación, navegación y favoritos. El HTTP 200 y la flecha visible son observaciones informadas; selección múltiple final, regreso operativo, migración y persistencia tras recarga permanecen pendientes de nueva validación manual. Véase [ActasPruebasManuales.md](ActasPruebasManuales.md).
- **VIS-001:** comprobación de la pantalla renderizada en Chrome headless a **375 × 1000 px** con API simulada. Títulos sobre valores, columnas legibles y barras cian/naranja proporcionales; sin desbordamiento horizontal observado. [Captura de demostración](evidencias/comparador-375-demo.png) y [medidas](evidencias/comparador-375-demo-medidas.json).

Pendientes: evaluación heurística completa, tareas con participantes y observaciones, teclado/foco/lector de pantalla, medición de contraste y reporte Lighthouse/Axe. No se acreditan WCAG 2.1 AA ni los objetivos de contraste 4,5:1 y foco 3:1 de la plantilla. Tampoco hay puntuación Lighthouse ≥95 ni reporte Axe sin infracciones. El ancho 375 px no sustituye la matriz 360–414 px, tablet 768–1024 px y escritorio 1280 px o más. MAN-002 y MAN-003 siguen pendientes para ese alcance.

### 2.4. Pruebas Automatizadas

| Nivel | Implementación y resultado | Límite |
|---|---|---|
| Unitario | Jest/jest-expo, 225 pruebas en 22 suites | Lógica y componentes del alcance configurado; API y almacenamiento externos simulados |
| Componentes/pantallas | RNTL: render, rerender, fireEvent, jest.fn, esperas asíncronas | No equivalen a validación de píxeles ni E2E |
| Integración interna | Pantallas → servicios/modelos/adaptador con fetch simulado | Contratos internos y errores controlados, no HTTP externo |
| Comprobación en navegador | VIS-001, ejecución puntual por Chrome DevTools Protocol con API interceptada | Fuera del conteo Jest; no constituye una suite E2E mantenida o pipeline |
| E2E | No implementado como suite del proyecto | Pendiente |

[jest.unit.config.js](../../jest.unit.config.js) incluye todo el código de producción de components, models, utils, services y storage, también los archivos con 0%; hereda las exclusiones de testing. La configuración general mide todo src si se solicita cobertura. No se cambió el denominador para alcanzar el objetivo.

El mínimo del 80% sobre lógica de dominio y componentes reutilizables está **cumplido en las cuatro métricas del alcance unitario**. La plantilla no precisa una métrica contractual única; se exponen las cuatro y se mantiene pendiente la revisión académica del alcance. No existe coverageThreshold configurado. Un agregado superior al 80% no significa que cada archivo supere ese porcentaje.

Las suites aíslan mocks y relojes; una ejecución aprobada no acredita ausencia de flakiness. La comprobación visual puntual no demuestra cinco ejecuciones E2E consecutivas ni la política CI de la plantilla.

## 3. Infraestructura, Entornos e Integración Continua y Entrega o Despliegue Continuo (CI/CD)

### 3.1. Pipeline de Integración Continua

Ejecución local Windows/PowerShell, Expo SDK 51, React 18.2.0 y React Native 0.74.5; versiones detalladas en el informe. No se identificaron pipelines GitHub Actions/GitLab CI, triggers de PR, nightly builds, staging ni bloqueo automático por cobertura.

Comandos ejecutados nuevamente durante esta actualización documental:

```powershell
npm.cmd test -- --runInBand
npm.cmd test -- --config jest.unit.config.js --coverage --runInBand
```

Resultados: **330 pruebas / 29 suites** y **225 pruebas / 22 suites**, respectivamente; ambas ejecuciones terminaron con código 0, sin fallos ni omisiones. Se archivaron resúmenes de ejecución y cobertura en [evidencias](evidencias/). Para VIS-001 se ejecutó previamente Expo Web con `npm.cmd run web -- --offline --port 8082` y Chrome headless. La opción offline de Expo no demuestra que la aplicación funcione sin conexión: las respuestas Jolpica fueron interceptadas con datos de prueba.

Quality gates, linter obligatorio en PR, pruebas de contrato externo, E2E nocturno y registros de CI/CD de la plantilla: **no implementados o sin evidencia**, no aprobados.

### 3.2. Gestión de Datos de Prueba (Test Data Management)

Fixtures: [calendar](../../__tests__/fixtures/calendar.js), [jolpica](../../__tests__/fixtures/jolpica.js), [standings](../../__tests__/fixtures/standings.js) y [jolpicaStandings](../../__tests__/fixtures/jolpicaStandings.js). Los pilotos/puntos sintéticos y fechas controladas no acreditan datos oficiales actuales.

Se utiliza AsyncStorage simulado y restauración de mocks/relojes. Los nuevos tests ejecutan F1DataService/JolpicaService reales con fetch sustituido; las pruebas de métodos legados conservan mocks de OpenF1. La captura VIS-001 usa pilotos de prueba, puntos 125,5/100 y victorias 3/1, sin cambiar producción.

Una validación HTTP real completa debe registrar URL, fecha/hora, temporada, estado HTTP, respuesta y estado de caché. El usuario informa un HTTP 200 de clasificaciones Jolpica observado en Chrome: se registra como evidencia parcial, sin afirmar validación del JSON ni éxito de ambos endpoints. Los HTTP 404 de OpenF1 pertenecen al defecto anterior. Véase [EvidenciasIntegracion.md](EvidenciasIntegracion.md). No hay Docker, seeding de BD ni datos de participantes recopilados.

## 4. Criterios de Aceptación, Calidad y Defectos

### 4.1. Criterios de Entrada, Suspensión y Salida (DoD)

| Tipo | Criterio adaptado | Situación |
|---|---|---|
| Entrada | Dependencias y suites disponibles; datos controlados | Cumplido para Jest local |
| Entrada manual | Entorno y escenario registrados | Actas retrospectivas disponibles; faltan metadatos/capturas y revalidación final de Favoritos |
| Suspensión | Más del 25% de flujos principales bloqueados | Regla de la plantilla adaptada; no hay medición que declare ese escenario |
| Salida | 100% de casos planificados ejecutados | Pendiente: MAN-001 a MAN-004 sin completar; MAN-006 parcial y MAN-007/MAN-008 pendientes en su alcance final |
| Salida | Sin defectos críticos/bloqueantes abiertos | DEF-001 a DEF-008 corregidos y con regresiones; cierre manual de DEF-008 pendiente; no garantiza ausencia de otros defectos |
| Salida | Aprobación superior al 95% de pruebas ejecutadas | 100% de Jest actual; no es aceptación global del producto |
| Salida | Cobertura unitaria mínima 80% | Cumplido en las cuatro métricas, dentro del alcance documentado |
| Salida | Evidencias revisadas y cierre aprobado | Pendiente de revisión del equipo y aprobación académica |

La cobertura ya no es un incumplimiento; los demás pendientes no se convierten en aprobados por ese resultado.

### 4.2. Matriz de Severidad y Prioridad de Defectos

| Nivel orientativo | Impacto | Tratamiento propuesto |
|---|---|---|
| Crítica / P1 | Caída general o pérdida persistente de datos | Atención inmediata y evaluar suspensión |
| Mayor / P2 | Función principal bloqueada o datos engañosos/incoherentes | Corregir y ejecutar regresión antes de aceptar el flujo |
| Menor / P3 | Limitación secundaria con alternativa | Priorizar según impacto y plazo |
| Trivial / P4 | Presentación sin pérdida funcional | Registrar revisión visual |

No se comprometen SLA de horas sin acuerdo. [Defectos.md](Defectos.md) documenta DEF-001 a DEF-008 y la navegación de Favoritos, sus causas, correcciones y límites de evidencia. Sus severidades son propuestas, no aprobaciones formales.

## 5. Matriz de Casos de Prueba (Adaptación Práctica)

[CasosDePrueba.md](CasosDePrueba.md) conserva AUT-001 a AUT-044 y agrega AUT-045 a AUT-048. Son **48 familias principales**, no 48 tests: Jest ejecuta 330 pruebas. MAN-001 a MAN-008, VIS-001 e INT-001 a INT-004 están separados del conteo automático; las actas no convierten pendientes en ejecuciones aprobadas.

### 5.1. Caso de Prueba Funcional

**AUT-044 — Selección independiente del Comparador.** Seleccionar izquierda y derecha de la lista cargada; impedir el rival; cancelar e intercambiar; comprobar estadísticas y ausencia de nuevas consultas. Aprobado con fetch simulado. MAN-005 aporta confirmación manual parcial del flujo.

### 5.2. Caso de Prueba de Integridad

**AUT-040/AUT-041 — Clasificaciones Jolpica y caché.** Comprobar temporada, identidad, cifras, datos desconocidos y errores HTTP; no utilizar cachés antiguas o respaldos ficticios. Aprobados con mocks. AUT-020 se conserva para DEF-002 como contrato legado, sin atribuir actualidad al respaldo TEAMS.

### 5.3. Caso de Prueba de Usabilidad y Accesibilidad

**VIS-001 — Distribución a 375 px.** Captura y medidas de Chrome con API simulada: barras diferenciadas y campos legibles. Ejecutado. No sustituye MAN-002/MAN-003 ni constituye evaluación WCAG, Lighthouse o satisfacción con usuarios.

### 5.4. Caso de Prueba Automatizada: Regresión Actual y E2E Pendiente

**AUT-018 y AUT-034 a AUT-036:** regresiones de pantalla blanca y StandingsTable; **AUT-040 a AUT-044:** clasificaciones y comparación. Aprobadas como tests normales, sin usar fallos esperados para ocultar defectos. El equivalente E2E con POM/pipeline de la plantilla no está implementado.

**AUT-045 a AUT-048:** migración, identidad, selección múltiple, sincronización bidireccional y regreso seguro de Favoritos. Se actualizan dos expectativas anteriores de favorito único porque contradicen el requisito definitivo; se conservan como tests normales que comprueban múltiples selecciones. No se eliminaron casos.

## 6. Gobernanza, Cronograma y Matriz RACI

Equipo de tres integrantes; nombres y asignaciones aceptadas por registrar. Roles propuestos:

| Entregable | Coordinación QA | Automatización / integridad | Manual / usabilidad |
|---|---|---|---|
| Estrategia, trazabilidad y documentos | R/A propuesto | C | C |
| Regresión y cobertura | C | R/A propuesto | I |
| Actas funcionales, usabilidad y accesibilidad | C | C | R/A propuesto |
| Consolidación y riesgos | R/A propuesto | C | C |
| Decisión de cierre del equipo | R propuesto | C | C |
| Aprobación académica | Autoridad/procedimiento por confirmar | I | I |

R = responsable; A = valida el entregable; C = consultado; I = informado. No constituye una asignación real ni aprobación del profesor.

Plazo informado: **lunes 2 de noviembre de 2026, 23:59, America/Santiago**.

| Hito | Estado | Acción restante |
|---|---|---|
| Regresión y cobertura mínima | Últimas ejecuciones aprobadas; mínimo alcanzado | Conservar artefactos y repetir solo ante cambios relevantes |
| Documentación y defectos | Consolidación 0.3 y siete documentos de pruebas | Revisión cruzada, responsables y SRS |
| Comparador manual y visual | MAN-005 en acta retrospectiva; VIS-001 archivado | Completar metadatos/capturas faltantes sin inventar datos históricos |
| API real y persistencia | HTTP 200 informado; contenido, caché física y persistencia final parciales/pendientes | Completar MAN-001/MAN-006 y revalidar MAN-007/MAN-008 tras DEF-008 |
| Usabilidad, accesibilidad y rendimiento | Pendientes | Ejecutar MAN-002 a MAN-004 o declarar explícitamente lo no realizado |
| E2E y CI/CD | No implementados | Declarar brecha respecto de la plantilla; resolver con el profesor su exigibilidad, sin dispensas inventadas |
| Cierre | Pendiente | Revisar evidencias, riesgos y aceptación del equipo |

Si no se completan actividades antes del plazo, deben figurar como pendientes. Esta consolidación no declara liberación a producción ni conformidad académica.
