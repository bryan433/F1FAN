# Checklist de entrega — F1Fan

Versión 0.3. Revisión documental: 2026-11-02, America/Santiago. Plazo informado: lunes 2 de noviembre de 2026 a las 23:59. Este checklist prepara la incorporación al repositorio del equipo; no constituye un commit, publicación ni aprobación académica.

## 1. Documentos preparados

- [x] [PlanMaestro-F1Fan.md](PlanMaestro-F1Fan.md): secciones 1 a 6 de la plantilla, alcance, resultados, trazabilidad y pendientes.
- [x] [CasosDePrueba.md](CasosDePrueba.md): AUT-001 a AUT-048, MAN-001 a MAN-008, VIS-001 y matriz; resultados automatizados separados de observaciones.
- [x] [Defectos.md](Defectos.md): DEF-001 a DEF-008 y corrección de regreso de Favoritos, con causas/regresiones/límites.
- [x] [InformeResultados.md](InformeResultados.md): cifras de esta ejecución, comandos, alcance y cuatro métricas.
- [x] [ActasPruebasManuales.md](ActasPruebasManuales.md): actas retrospectivas de lo efectivamente informado; parciales y revalidaciones pendientes explícitos.
- [x] [EvidenciasIntegracion.md](EvidenciasIntegracion.md): HTTP 200 informado, caché con mocks y límites de la verificación externa.
- [x] Plantilla original [Plan_Maestro_Pruebas_Software.docx](../referencias/Plan_Maestro_Pruebas_Software.docx) revisada y conservada.
- [ ] SRS completo/versionado incorporado o accesible al revisor. No se encontró en el repositorio; README/comentarios son referencias parciales.
- [ ] Nombres de los tres integrantes, asignación real, revisión cruzada y aprobación registrados. No fueron proporcionados.

## 2. Resultados y reportes verificados

- [x] Clon integrado validado por separado: **349 pruebas / 31 suites**, originales conservadas, y **225 pruebas / 22 suites unitarias**. Véanse [informe de integración local](IntegracionLocal.md) y evidencias del clon. Las cifras 330/29 siguientes identifican el respaldo original; los pendientes manuales siguen abiertos.

| Comprobación | Resultado real |
|---|---|
| npm.cmd test -- --runInBand | **330 aprobadas, 29 suites, código 0** |
| npm.cmd test -- --config jest.unit.config.js --coverage --runInBand | **225 aprobadas, 22 suites, código 0** |
| Fallidas / omitidas / snapshots | **0 / 0 / 0** |
| Cobertura unitaria, instrucciones/ramas/funciones/líneas | **85,71% / 84,41% / 87,81% / 85,71%** |
| Alcance | components, models, utils, services y storage, incluidos archivos con 0% |
| Cobertura general de todo src | No se generó una nueva medición general en esta tarea |

- [x] [Salida de Jest capturada](evidencias/jest-completo-2026-11-02.txt), incluida en docs/ para el repositorio.
- [x] [Transcripción parcial unitaria](evidencias/jest-unitario-cobertura-2026-11-02.txt), etiquetada como parcial.
- [x] [Resumen portátil de cobertura](evidencias/cobertura-unitaria-resumen.json), con conteos, carpetas y archivos relativos, generado desde la cobertura actual.
- [x] Informes locales coverage-unit/ regenerados: HTML, coverage-final.json y LCOV.
- [ ] Adjuntar/exportar coverage-unit/ completo si el formato de entrega exige HTML/LCOV además del resumen portátil. No se copió el árbol HTML entero a docs/.
- [x] Producción, tests, dependencias y configuración preservados durante esta tarea documental.
- [ ] Registrar revisión/commit de entrega y comprobar inclusión real de archivos en el repositorio del equipo. No se realizó commit/push.

## 3. Capturas y evidencias manuales

- [x] [Captura VIS-001](evidencias/comparador-375-demo.png), 375 × 1000 px, etiquetada **DATOS SIMULADOS**.
- [x] [Medidas DOM VIS-001](evidencias/comparador-375-demo-medidas.json); no son respuesta JSON de Jolpica.
- [x] Confirmación manual del Comparador registrada: selección independiente, intercambio, impedir mismo piloto y sin peticiones adicionales al seleccionar.
- [x] Flecha visible de Favoritos y antecedentes de DEF-008 registrados como observaciones informadas, sin extender su alcance.
- [x] HTTP 200 de clasificaciones Jolpica observado en Chrome registrado como evidencia parcial informada.
- [ ] Captura/HAR/URL, temporada y fecha/hora de esa consulta real archivados.
- [ ] Contenido JSON real contrastado con filas/estadísticas visibles; no se declara validado.
- [ ] Revalidación manual final de selección múltiple y eliminación en ambos sentidos, sin depender del foco.
- [ ] Recarga/reinicio, migración de favoritos antiguos protegidos y colección vacía sin reaparición; escuderías incluidas.
- [ ] Pulsación de flecha con historial y acceso directo/fallback a Más en Expo Web; validación nativa si se exige.
- [ ] Caché física vigente/vencida, desconexión y recuperación con/sin copia documentadas.

## 4. Estado de requisitos y brechas de la plantilla

| Requisito / dimensión respaldada | Estado de evidencia | Acción pendiente |
|---|---|---|
| Cobertura mínima 80% del alcance unitario de la plantilla | Cumplido técnicamente en las cuatro métricas | Revisión académica del alcance; no atribuir 80% al proyecto completo |
| HU-02, horarios Santiago, referencia README | Automatizado con datos controlados | Contraste externo/manual completo MAN-001 |
| CU-02, clasificación, asociación parcial | Automatizado; HTTP 200 informado | Cuerpo/temporada/procedencia y acta MAN-006 |
| CU-06, favoritos; multiplicidad definitiva exigida por usuario | AUT-045 a AUT-047 aprobados con mocks | MAN-008 final y contraste del enunciado oficial SRS |
| RNF-PER-01/02, persistencia y recuperación | Integridad lógica con mocks; antecedentes manuales parciales | Persistencia/migración/caché física final |
| Navegación de Favoritos, sin ID formal nuevo | Callback con mocks; flecha visible confirmada | Regreso/fallback manual MAN-007 |
| Usabilidad, exigencia de plantilla | Exploración puntual del Comparador | Evaluación con tareas/observaciones MAN-002; sin satisfacción ni tiempos inventados |
| Accesibilidad WCAG/Lighthouse/Axe, plantilla | Sin auditoría/conformidad acreditada | MAN-003, teclado/foco/lector/contraste; no declarar Lighthouse ≥95 ni cero infracciones |
| Responsividad | VIS-001 a 375 × 1000 con simulación | Otros móviles, tablet/escritorio y dispositivo físico si se exige |
| RNF-01, <3 s, README | Sin medición | Protocolo y MAN-004; duración de Jest no sirve para este requisito |
| RNF-02, límite OpenF1, README | Sin prueba específica | No sustituir por deduplicación Jolpica |
| E2E con POM, plantilla | **No implementado** | Declarar brecha; implementar/obtener evidencia si se exige, sin asumir dispensa |
| CI/CD, quality gates, plantilla | **No implementado** | Declarar brecha; sin logs, PR checks, nightly o staging inventados |

Los IDs AUT/MAN/VIS/INT organizan pruebas/evidencias, no requisitos. La matriz usa únicamente HU-02, CU-02, CU-06, RNF-PER-01/02 y RNF-01/02 respaldados por README/comentarios, con sus límites. SD-03 aún describe un favorito único y no sustituye el requisito actual ni un SRS oficial.

## 5. Acciones indispensables antes de entregar

1. Incorporar los siete Markdown y los artefactos de docs/pruebas/evidencias/; revisar enlaces/cifras y registrar revisión/commit real del equipo.
2. Ejecutar y archivar MAN-007/MAN-008 sobre la versión final, protegiendo selecciones existentes.
3. Completar evidencia HTTP/JSON/caché real o conservar expresamente su estado parcial/pendiente.
4. Adjuntar SRS, responsables y revisiones reales cuando estén disponibles; mantener las brechas de usabilidad/accesibilidad/rendimiento/E2E/CI/CD visibles al profesor.

**Situación de entrega:** documentos y resúmenes técnicos preparados para revisión e incorporación; cierre manual, criterios restantes y aprobación académica pendientes. Ninguna casilla pendiente se considera dispensada por el porcentaje de cobertura.
