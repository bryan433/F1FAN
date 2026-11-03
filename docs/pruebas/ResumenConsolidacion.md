# Resumen de consolidación del Plan Maestro — F1Fan

Corte documental: **2026-11-02, America/Santiago**. Rama leída: `docs/plan-maestro-final`. Revisión: `0fa08bc95637661996f4be4a5d97e76dd0ad57ba`.

Documento: [PlanMaestro-F1Fan-Final.docx](PlanMaestro-F1Fan-Final.docx). Se creó desde una copia del DOCX del profesor, conservando el original, sus seis secciones principales, tamaño de papel, márgenes, recursos de encabezado y estilos base. Se añadieron portada, índice de Word, tablas, numeración, fuentes y la imagen VIS-001 rotulada como simulación.

## Fuentes consultadas

| Fuente desde raíz | Uso |
| --- | --- |
| docs/referencias/Plan_Maestro_Pruebas_Software.docx | Estructura del profesor: 1 Información general; 2 Estrategia; 3 Infraestructura/CI; 4 Criterios/defectos; 5 Casos; 6 Gobernanza/RACI. Sus logotipos identifican Universidad de Talca y Facultad de Ingeniería; imágenes originales conservadas. |
| docs/referencias/Plan_de_Pruebas_Desarrollo_Multiplataforma (1).pdf | 11 páginas; portada e integrantes, RF-01 a RF-06, RNF-01 a RNF-04, arquitectura y cifras declaradas. Texto leído mediante extracción local de streams PDF; Word no pudo convertir este PDF. |
| docs/referencias/IntegridadUsabilidad.md | 292 diagnósticos, 97 fallidos, IU-01 a IU-26 y correcciones parciales. |
| docs/pruebas/IntegridadUsabilidad.md | Mismo texto tras normalizar CRLF/LF que la referencia; bytes y hashes diferentes por finales de línea. No se cuenta como aporte independiente. |
| docs/pruebas/PlanMaestro-F1Fan.md | Plan anterior, secciones y limitaciones. |
| docs/pruebas/InformeResultados.md | Cortes históricos y alcance de cobertura. |
| docs/pruebas/EntregaQABryan.md | Configuración Jest, 31 casos adicionales, componentes/modelos y pipeline; cifras 380/35 y cobertura histórica. |
| docs/pruebas/IntegracionLocal.md | 349/31, 225/22, 19 regresiones RF-04/Perfil y límites del mapeo OpenF1. Caracteres dañados en la fuente, sin editarla. |
| docs/pruebas/CasosDePrueba.md | 48 familias AUT; MAN-001 a MAN-008, VIS y trazabilidad previa. |
| docs/pruebas/Defectos.md | DEF-001 a DEF-008 y regreso de Favoritos. |
| docs/pruebas/ActasPruebasManuales.md | Observaciones informadas, parciales y pendientes. |
| docs/pruebas/EvidenciasIntegracion.md | INT-001 a INT-004, HTTP 200 informado y caché. |
| docs/pruebas/ChecklistEntrega.md | Nombres y roles, plazo informado y brechas. |
| .github/workflows/ci.yml | Triggers, tres jobs, artefactos, ausencia de umbral explícito. |
| package.json | Scripts y dependencias declaradas. |
| jest.config.js | Suite estándar, exclusión QA y cobertura general. |
| jest.unit.config.js | Subconjunto unitario y denominador. |
| jest.qa.config.js | Diagnósticos independientes. |
| README.md | Referencias a funciones y RNF. |

Se revisaron también los logs y resúmenes JSON de `docs/pruebas/evidencias/`, la captura y medidas VIS-001, el JSON histórico de `coverage-unit/`, los archivos de pruebas y el código relacionado mediante lectura. No se consultaron APIs externas, GitHub Actions remoto ni fuentes web.

## Aportes y atribución

- **Bryan Ahumada:** Frontend Lead, QA/CI; Jest, componentes complejos, Circuito/ResultadoSesion y workflow.
- **Nicolás Salas:** Scrum Master, casos y QA manual como rol global documentado. Los ejecutores de las actas históricas no tienen nombre confirmado.
- **Alexander Donoso:** persistencia/AsyncStorage y multiplataforma como rol global documentado.

Roles sustentados en Checklist y portada PDF. El PDF y el informe IU no identifican autor nominal individual; no se atribuyen por suposición. No hay asignaciones A/firma formal documentadas.

## Resultados nuevamente comprobados

| Perfil | Pruebas y suites | Aprobadas / fallidas / omitidas | Salida |
| --- | --- | --- | --- |
| Estándar | 396 pruebas / 36 suites | 396 / 0 / 0 | Código 0; 36 suites aprobadas; 58,625 s |
| Unitario | 256 pruebas / 26 suites | 256 / 0 / 0 | Código 0; 26 suites aprobadas; 19,663 s |
| QA diagnóstico | 292 pruebas / 5 suites | 195 / 97 / 0 | Código 1; 1 suite aprobada y 4 fallidas; 26,000 s |

**Descomposición:** 256 unitarias (26 suites) + 124 pantallas (9 suites) + 16 regresiones IU (1 suite) = **396 pruebas / 36 suites**. Las 292 QA son independientes, con 195 aprobadas y 97 fallidas; no se suman subconjuntos ni se presenta una tasa global que oculte sus fallos. QA devuelve código 1 esperado por defectos reales; estándar/unitario, código 0. Sin skip/todo/snapshots.

| Perfil | Inicio America/Santiago | Fin America/Santiago | SHA-256 del JSON temporal |
| --- | --- | --- | --- |
| Estándar | 2026-11-02 23:19:18 | 2026-11-02 23:20:17 | f472790ccdd4edf1d0476cfa77391fbda752729df3256ded5b76aa592f153a4e |
| Unitario | 2026-11-02 23:20:46 | 2026-11-02 23:21:06 | ef59ad445ca0747725ccfcb5f68a9a929619397357459e7819ecfb4a8ad8b39f |
| QA | 2026-11-02 23:21:37 | 2026-11-02 23:22:03 | 010d4ed3048562b307c8504b63a86891046d090078fcbb88a84ff78f2e01c397 |

Entorno usado: Windows/PowerShell; Node v24.19.0; npm 11.17.0; Expo instalado 51.0.39; React 18.2.0 / React Native 0.74.5; Jest 29.7.0; jest-expo 51.0.4; RNTL 12.9.0; AsyncStorage 1.23.1. No se reinstalaron ni actualizaron dependencias.

| Suite QA | Total | Aprobadas | Fallidas |
| --- | --- | --- | --- |
| EstadoConsistencia.test.js | 31 | 30 | 1 |
| ManejoErrores.test.js | 76 | 68 | 8 |
| Accesibilidad.test.js | 122 | 39 | 83 |
| Almacenamiento.test.js | 41 | 36 | 5 |
| Navegacion.test.js | 22 | 22 | 0 |
| TOTAL | 292 | 195 | 97 |

## Cobertura actual y diferencias

| Alcance | Instrucciones | Ramas | Funciones | Líneas |
| --- | --- | --- | --- | --- |
| TOTAL | 88,57% | 89,17% | 88,61% | 89,30% |
| components | 90,62% | 96,74% | 86,66% | 90,80% |
| models | 100,00% | 100,00% | 100,00% | 100,00% |
| services | 84,25% | 83,38% | 82,29% | 83,88% |
| storage | 96,06% | 92,59% | 100,00% | 98,66% |
| utils | 73,80% | 78,57% | 90,47% | 73,52% |

| Métrica | Cubierto / total | Porcentaje |
| --- | --- | --- |
| Instrucciones | 690 / 779 | 88,57% |
| Ramas | 733 / 822 | 89,17% |
| Funciones | 179 / 202 | 88,61% |
| Líneas | 601 / 673 | 89,30% |

Se instrumentaron **26 archivos** de `src/{components,models,utils,services,storage}`. Pantallas/navegación/datos/tema fuera del denominador; la suite IU transversal no se ejecuta en el perfil unitario. **ErrorBoundary tiene 0% en este perfil**, aunque su regresión pase en la suite estándar. No se modificaron exclusiones ni se retiraron archivos. El agregado supera el 80% en cuatro métricas; no equivale a cobertura global del proyecto ni por archivo.

La cobertura histórica de `coverage-unit/coverage-final.json` es de 25 archivos (648/756 instrucciones, 688/815 ramas, 173/197 funciones, 558/651 líneas), con 85,71/84,41/87,81/85,71%. Ese árbol se dejó intacto. El PDF y Bryan citan 89,81/89,57/90,35/90,47%, que no corresponden al árbol unitario actual: ErrorBoundary y cambios de almacenamiento alteran el denominador/comportamiento instrumentado. Se prioriza la nueva medición: **88,57/89,17/88,61/89,30%**. No se generó cobertura general nueva.

Los cortes estándar quedan explicados como 330/29 inicial; 349/31 tras 12 RF-04 + 7 Perfil; 365/32 con 16 regresiones IU; 380/35 con los 31 casos de Bryan sobre la base 349; **396/36 = 349 + 31 + 16** en la integración final. El PDF contiene 396/36, ahora corroborado localmente, pero no se acepta por ello toda su conclusión de conformidad global.

## Comandos exactos de comprobación

Los JSON y cobertura nuevos se escribieron exclusivamente en `%TEMP%/f1fan-plan-final/`, sin sobrescribir evidencia histórica. Son auxiliares; este resumen y el Word contienen los resultados portátiles.

```powershell
node node_modules/jest/bin/jest.js --runInBand --no-cache --json --outputFile "$env:TEMP\f1fan-plan-final\standard.json"
node node_modules/jest/bin/jest.js --config jest.unit.config.js --coverage --coverageDirectory "$env:TEMP\f1fan-plan-final\coverage" --coverageReporters=json-summary --coverageReporters=json --coverageReporters=text --runInBand --no-cache --json --outputFile "$env:TEMP\f1fan-plan-final\unit.json"
node node_modules/jest/bin/jest.js --config jest.qa.config.js --runInBand --no-cache --json --outputFile "$env:TEMP\f1fan-plan-final\qa.json" *> "$env:TEMP\f1fan-plan-final\qa-console.txt"
```

## Pipeline y contradicciones resueltas

Existe `.github/workflows/ci.yml`: push a main/feature/**/fix/** y PR con base main; Node 20 en ubuntu-latest; unit-tests e integration-tests; quality-gate depende de ambos y ejecuta test:ci. Artefactos configurados por 14 días. Los informes anteriores que niegan CI son históricos.

No existe `coverageThreshold`; se corrige la afirmación de que el job llamado quality-gate verifica automáticamente el 80%. No hay evidencia de checks obligatorios/protección de ramas, ejecución remota, staging, despliegue, nightly, linter o E2E. Los 38 s de runner citados en el PDF no están corroborados por URL/log/SHA y no se presentan como verificados. Un push directo a docs/plan-maestro-final no activa esos filtros. El job final no descarga la cobertura del job unitario, por lo que incluir coverage-unit/ en su lista de subida no garantiza ese directorio.

## Pendientes explícitos

- **19 IDs IU abiertos:** IU-06/07 (P2); IU-09/10/11/12/13/15/16/17/18/19/20/21/22 (P3); IU-23/24/25/26 (P4). Los 97 fallos QA son aserciones, no 97 defectos independientes.
- **7 IDs IU corregidos en alcance documentado:** IU-01/02/03/04/05/08/14. IU-05 no cierra todos los controles; IU-03 no cierra concurrencia IU-10.
- DEF-001 a DEF-008 con correcciones/regresiones; cierre manual final de DEF-008 y flecha/fallback pendiente. IU-12 de Calendario/Inicio permanece abierto aunque DEF-006 de clasificaciones esté corregido.
- RF-04 sin mapeo automático Jolpica → session_key OpenF1; solo puede validar sesiones explícitas compatibles. No se aprueba íntegramente RF-04 como hace el PDF.
- Favoritos: migración, colección vacía, conservación tras recarga y almacenamiento físico real en perfil protegido.
- HTTP 200 Jolpica informado: faltan URL, hora/temporada, HAR/cuerpo, JSON contrastado y caché real. La observación no acredita ambos endpoints.
- RNF-01 rendimiento <3 s; RNF-02 cuota OpenF1 según requisito local, no verificación de política vigente del proveedor; RNF-03 accesibilidad; RNF-04 resiliencia integral pendientes.
- MAN-001 a MAN-004; MAN-007/008 finales; metadatos de MAN-005 y alcance completo de MAN-006; teclado/foco/lector, Lighthouse/Axe, matriz de resoluciones, Android/iOS y estudio con participantes.
- Suite E2E mantenida y cinco pasadas consecutivas; ausencia de flakiness no acreditada (la fuente informó un fallo transitorio preexistente en 1/5 ejecuciones).
- SRS íntegro, nombre del docente, responsables A y firmas académicas/funcionales. La institución Universidad de Talca se verificó en las imágenes de la plantilla original. Se muestran como pendientes; no se inventan.

## Inventario verificable de suite estándar

| Suite ejecutada / ruta desde raíz | Casos | Estado |
| --- | --- | --- |
| __tests__/services/F1DataService.test.js | 39 | Aprobada |
| __tests__/screens/FavoritesSync.test.js | 23 | Aprobada |
| __tests__/screens/ChampionshipScreens.test.js | 23 | Aprobada |
| __tests__/storage/LocalStorageManager.test.js | 24 | Aprobada |
| __tests__/regresiones/CorreccionesIntegridadUsabilidad.test.js | 16 | Aprobada |
| __tests__/services/JolpicaService.test.js | 24 | Aprobada |
| __tests__/screens/CalendarioScreen.test.js | 14 | Aprobada |
| __tests__/services/F1ChampionshipStandings.test.js | 21 | Aprobada |
| __tests__/components/ComplexComponents.test.js | 16 | Aprobada |
| __tests__/screens/DetalleGPScreen.test.js | 17 | Aprobada |
| __tests__/screens/HistorialWebScreen.test.js | 10 | Aprobada |
| __tests__/screens/HomeScreen.test.js | 11 | Aprobada |
| __tests__/components/StandingsTable.test.js | 11 | Aprobada |
| __tests__/storage/FavoriteDriversCollection.test.js | 12 | Aprobada |
| __tests__/screens/PerfilPilotoScreen.test.js | 7 | Aprobada |
| __tests__/services/JolpicaCalendarAdapter.test.js | 12 | Aprobada |
| __tests__/storage/FavoritesCompatibility.test.js | 16 | Aprobada |
| __tests__/screens/RF04SessionResults.test.js | 12 | Aprobada |
| __tests__/screens/ARScreen.test.js | 7 | Aprobada |
| __tests__/models/ResultadoSesion.test.js | 7 | Aprobada |
| __tests__/components/SessionCard.test.js | 11 | Aprobada |
| __tests__/utils/favorites.test.js | 11 | Aprobada |
| __tests__/components/DriverCard.test.js | 5 | Aprobada |
| __tests__/components/TelemetryWidget.test.js | 3 | Aprobada |
| __tests__/components/TrackMap.test.js | 3 | Aprobada |
| __tests__/components/CountdownTimer.test.js | 4 | Aprobada |
| __tests__/models/Circuito.test.js | 2 | Aprobada |
| __tests__/models/GranPremio.test.js | 4 | Aprobada |
| __tests__/components/Header.test.js | 6 | Aprobada |
| __tests__/components/RaceCard.test.js | 3 | Aprobada |
| __tests__/utils/timezone.test.js | 12 | Aprobada |
| __tests__/models/Sesion.test.js | 3 | Aprobada |
| __tests__/models/Piloto.test.js | 3 | Aprobada |
| __tests__/components/OfflineBanner.test.js | 1 | Aprobada |
| __tests__/components/LoadingScreen.test.js | 2 | Aprobada |
| __tests__/models/Escuderia.test.js | 1 | Aprobada |

## Huellas de fuentes

| Archivo | SHA-256 |
| --- | --- |
| docs/referencias/Plan_Maestro_Pruebas_Software.docx | 7cd4fd10a9758caf6c38106ecff4b6c67a8dad5b25daa48527951628eff759a6 |
| docs/referencias/Plan_de_Pruebas_Desarrollo_Multiplataforma (1).pdf | 4eceefb274b2ab711624e08144fe1f331943a2f968885f89c5f8c67e2199ff19 |
| docs/referencias/IntegridadUsabilidad.md | ab45bd65425909ad43e6efbfe62732a6b42e8c7d18a605b66df01ea15b97d818 |
| docs/pruebas/IntegridadUsabilidad.md | b432dc325a84ae2faef9345ba57e7a64225ff8cca7172c7cf32f3843c7b935a5 |
| docs/pruebas/PlanMaestro-F1Fan.md | 933f9ea2994c17c3336f83705f2ec80666b716c1e72af30e01d6fb0136eefe0c |
| docs/pruebas/InformeResultados.md | 15b3e502b2ca11487aae9e221f92f2f69909b6bd60825d6695838d0670e88170 |
| docs/pruebas/EntregaQABryan.md | 608e50259f798d8baa8914ebe0c471cc1b159052926a8ac31d9deac8a9d33a2d |
| docs/pruebas/IntegracionLocal.md | f4038f7be09db7d86afdb7df6395283bb2467c4b6f077ff852d57be2ccb21e73 |
| docs/pruebas/CasosDePrueba.md | 1da86c0d39fb3b6856b5c5fbf5b1442c4aa08ed65521f26b664cb753709dac5f |
| docs/pruebas/Defectos.md | 0e3aad5d0d963428de6b036a421b239f2cb6ea50ab81fb0a95fbf00fe41cbaa4 |
| docs/pruebas/ActasPruebasManuales.md | 26311aed54102b507a89c66d24a229e90cc44d5b33c0f53cf33de9ec5907e32d |
| docs/pruebas/EvidenciasIntegracion.md | ea3057e5965976bde5037239ffef5d47fb78dee39510c066ae3573ecdc0a227e |
| docs/pruebas/ChecklistEntrega.md | 9d843ccb1e4044c1d984c81a59193621c959353d73a119e8553bc7f3a6b210ce |
| .github/workflows/ci.yml | 278c7b1cb049e7961328ec832245ce774a3283455aa602e1f699a4728d821d5c |
| package.json | e7f93c056910715aa10c0eeb935df90e44862e9b4849375e73deb5ba612e44f0 |
| jest.config.js | 96b0dca5bcd5e3af7cb5501810a7c627cc9081ffef5c62a9969bbc6da57d7a25 |
| jest.unit.config.js | 05f8505d029eabd89eb2efdaceee55d66f0ecef6a617cd305d6a0c6bb2db1855 |
| jest.qa.config.js | 0e6eaeff715fd689070a6841814d27f5424ac4166eb4cebe618d481f88cbcb41 |
| README.md | f79ea7edac24d0d89850bf9e9d35c66f5e7dd5e4242dfbd41803d1c0f93c31c2 |

VIS-001 se incorporó con etiqueta de datos simulados. Se conserva el PNG original; la mención Fuente: Jolpica · API dentro de la captura no acredita HTTP real. Los JSON de medidas son geometría, no respuesta API.

## Validación del entregable

- DOCX abierto y guardado por **Microsoft Office Word 16**; índice actualizado con referencias de página. La metadata de Word registra **21 páginas** y 9054 palabras.
- Las **seis secciones principales** de la plantilla están presentes, con 28 subsecciones.
- Paquete DOCX/ZIP legible: **20 partes XML válidas**, relaciones y contenido de Word conservados; sin marcadores de generación pendientes.
- **25 tablas**, todas con ancho de 9360 twips, dentro del espacio de 6,5 pulgadas; **25 encabezados repetibles** y **261 filas configuradas para no dividirse**. Comprobación estructural, sin atribuir una revisión visual completa de cada página.
- Tamaño de papel y márgenes preservados de la plantilla (12240 × 19296 twips; márgenes laterales 1440). Encabezados institucionales originales conservados.
- Se intentó previsualización automatizada mediante Word; la comprobación detallada/exportación no completó y se detuvo su proceso auxiliar después de guardar. **Se recomienda una revisión visual final en Word de las 21 páginas**. No se entrega ni se presenta como validado un PDF de previsualización.
- Comparación SHA-256 de **123 archivos previos**: **0 alterados**. Incluye producción, tests, configuración, informes/fuentes y plantilla.
- Plantilla original SHA-256: 7CD4FD10A9758CAF6C38106ECFF4B6C67A8DAD5B25DAA48527951628EFF759A6.
- DOCX final SHA-256: 5AC99152003338369A9B933A6786DE12ED80514755945F2259B38652323E6BF1.
- No se ejecutaron git add, commit, push ni merge. El cambio final del repositorio se limita a los dos entregables nuevos; las dos referencias no rastreadas que ya existían se conservan.
- Estado de entrega: documento consolidado generado; aceptación completa, cierres manuales y aprobación académica pendientes.
