# Integraci?n local de F1Fan

Fecha documental: 2026-11-02, America/Santiago. Rama: `feature/testing-plan-maestro`.
Origen de solo lectura: `C:/Users/nikol/Desktop/F1Fan/F1FAN-main`.
Clon modificado: `C:/Users/nikol/Desktop/F1Fan/F1FAN-integracion`.

## Base y alcance

El clon estaba limpio antes de integrar. HEAD, main, origin/main y el main consultado con git ls-remote coincid?an en `239678735f29c854a3a2f9022714d0ce93b0a0ea`.
No se cambi? de rama, no se actualiz? main y no se ejecut? git add, commit, push, merge ni apertura de PR.

Se incorporaron los 53 archivos nuevos del inventario y los cambios de contenido de 22 archivos compartidos.
No se copiaron node_modules, .expo, coverage ni coverage-unit del origen.
Los 34 archivos que difer?an ?nicamente por LF/CRLF no se reemplazaron: .gitignore, README, PerfilPilotoScreen y LiveScreen recibieron las ediciones puntuales descritas abajo; los otros 30 permanecen intactos.
Los cuatro assets id?nticos tampoco se reemplazaron.

La comparaci?n SHA-256 antes/despu?s de los 113 archivos no generados del origen no detect? cambios.
Las 29 suites originales y los cinco artefactos port?tiles originales conservan exactamente sus bytes en el clon.
Los siete documentos se conservaron; InformeResultados, PlanMaestro y Checklist distinguen ahora el corte original de esta validaci?n.

## RF-04, RF-05 y favoritos

### RF-04

DetalleGPScreen conserva los estilos y la interfaz de resultados de Bryan: encabezado, cierre y columnas POS/PILOTO/TIEMPO/DIF, junto con la identidad din?mica del GP, manejo de ausencias y navegaci?n MainTabs ? En Vivo.
No existe mockSessionResults en la pantalla integrada.

La tabla consulta el cliente OpenF1 existente solo para sesiones finalizadas o con resultados disponibles, de origen expl?cito openf1 y con session_key num?rico positivo.
No infiere claves desde idSesion, temporada, ronda ni un ID Jolpica.
Rechaza respuestas de otra sesi?n y, cuando el GP aporta meeting_key, de otro meeting.
Los nombres y equipos se obtienen del endpoint de pilotos de esa sesi?n; si falla, se conserva el dorsal publicado sin inventar identidades.
Se muestran segundos, segmentos Q1/Q2/Q3, gaps por vueltas y estados DNF/DNS/DSQ; los valores desconocidos se mantienen como ausentes.
Una respuesta vac?a, un error o la falta de identidad compatible deja un mensaje claro; las respuestas tard?as no reabren una tabla cerrada.

El formato se contrast? con la [documentaci?n de OpenF1](https://openf1.org/docs/#session-result). No se consultaron resultados reales ni se valid? la disponibilidad de esos endpoints durante esta integraci?n.
El calendario Jolpica no aporta autom?ticamente session_key de OpenF1: ese mapeo sigue sin implementarse y no se simula.

### RF-05 y compatibilidad

PerfilPilotoScreen conserva la imagen recibida por urlFoto, su estilo y la pantalla.
El perfil usa driverId estable y alias de la colecci?n para marcar o eliminar ?nicamente al piloto seleccionado, incluso si cambia el dorsal.
Las suscripciones sincronizan la pantalla sin depender exclusivamente del foco.
Un fallo al persistir muestra error y no se presenta como ?xito.

La migraci?n conserva la clave antigua `@f1fan_favorite_driver` como respaldo y utiliza `@f1fan_favorite_drivers`; una colecci?n nueva vac?a es definitiva.
Los tests nuevos comprueban que guardar/eliminar desde Perfil conserva otros pilotos y ajustes.
Las pruebas usan AsyncStorage simulado: no se accedi? ni se borr? el almacenamiento real del usuario.

Los datos locales del perfil se identifican como demostraci?n. Para Jolpica se conservan temporada y ceros publicados, sin inventar podios o historial.
Live conserva sus vistas, pero ahora indica expresamente que tiempos, telemetr?a y radio son demostraciones; la torre no consume el contrato bruto incompatible de /session_result.
AR mantiene los cambios incorporados y su identificaci?n como simulaci?n.

## Dependencias y exclusiones

package.json y package-lock.json se trasladaron coordinadamente, manteniendo las dependencias existentes de Bryan.
Se a?aden Jest 29.7.0, jest-expo 51.0.4, RNTL 12.9.0, react-test-renderer 18.2.0, TypeScript 5.3.3 y tipos React.
El lockfile usa formato 3 y coincide con el manifiesto.

`npm.cmd ci --cache .npm-cache --no-audit --no-fund` termin? con c?digo 0 e instal? 1426 paquetes.
El primer intento restringido fall? por EACCES al descargar; el reintento autorizado termin? correctamente.
`npm.cmd ls --depth=0` termin? con c?digo 0, sin dependencias directas ausentes o inv?lidas.
npm inform? dependencias deprecadas; no se actualizaron versiones fuera de alcance ni se ejecut? una auditor?a de vulnerabilidades.

.gitignore excluye coberturas generadas, archivos .env y variantes, cach?s locales, temporales, logs y claves/certificados.
Conserva excepciones para .env.example y .env.*.example.
No se incorporaron archivos secretos; la inspecci?n de nombres sensibles y patrones de claves/tokens en archivos de texto no encontr? candidatos.
El ejemplo acad?mico docs/Counter.test.tsx se conserva excluido de Jest.

## Validaci?n ejecutada

| Comando | Resultado |
|---|---|
| npm.cmd test -- --runInBand | C?digo 0; 349 aprobadas en 31 suites; 0 snapshots; 20,428 s |
| npm.cmd test -- --config jest.unit.config.js --coverage --runInBand | C?digo 0; 225 aprobadas en 22 suites; 0 snapshots; 12,224 s |
| git diff --check | C?digo 0 |
| npm.cmd ls --depth=0 | C?digo 0 |
| An?lisis sint?ctico/imports | 81 archivos, sin errores de sintaxis, imports relativos rotos ni dependencias importadas sin declarar |

Se conservaron las 330 pruebas originales sin editar sus archivos.
Se a?adieron 12 regresiones de RF-04 y siete de PerfilPiloto: 19 adicionales, incluidas dentro de las 349.
Durante el desarrollo, seis aserciones nuevas coincid?an con varios mensajes de datos no disponibles; se corrigieron sus selectores antes de la ejecuci?n final aprobada.
Las animaciones del perfil se a?slan con el mock oficial de React Native en la nueva suite.
No se adaptaron ni eliminaron pruebas originales.

| Cobertura unitaria | Cubierto / total | Porcentaje |
|---|---:|---:|
| Instrucciones | 648 / 756 | 85,71% |
| Ramas | 688 / 815 | 84,41% |
| Funciones | 173 / 197 | 87,81% |
| L?neas | 558 / 651 | 85,71% |

La cobertura incluye 25 archivos de componentes, modelos, servicios, almacenamiento y utilidades.
Pantallas, navegaci?n, datos y tema quedan fuera de este subconjunto; las nuevas regresiones de pantallas no cambian ese denominador.
No existe coverageThreshold ni se declara una cobertura del 80% de toda la aplicaci?n.

## Evidencias del clon

Se preservan los cinco artefactos originales como evidencia del respaldo.
La ejecuci?n integrada tiene archivos separados:

- [Salida completa de Jest](evidencias/jest-completo-integracion-2026-11-02.txt).
- [Salida completa unitaria y cobertura](evidencias/jest-unitario-integracion-2026-11-02.txt).
- [Resumen port?til de cobertura del clon](evidencias/cobertura-unitaria-integracion-resumen.json).

Los enlaces locales a coverage-unit en InformeResultados fueron sustituidos por evidencia port?til e instrucciones de regeneraci?n.
Para generar HTML, LCOV y JSON: `npm.cmd test -- --config jest.unit.config.js --coverage --runInBand`.
El ?rbol generado coverage-unit est? excluido de Git; si se exige para la entrega, adjuntarlo como artefacto separado.
La captura original del Comparador sigue correspondiendo a datos simulados; no se gener? una nueva captura.

## Pendientes y l?mites

- No se ejecut? validaci?n manual de Expo Web, Android o iOS.
- No se validaron HTTP/JSON reales de Jolpica/OpenF1, persistencia f?sica ni la migraci?n en un dispositivo.
- No se ejecutaron evaluaciones de accesibilidad, rendimiento o usabilidad ni una suite E2E; no se configur? CI/CD.
- La vinculaci?n autom?tica Jolpica ? sesi?n OpenF1 no existe; RF-04 presenta datos no disponibles si no recibe una identidad OpenF1 expl?cita.
- Live y el cat?logo local conservan demostraciones identificadas; los m?todos legados OpenF1/2024 se conservaron.
- Los diagramas originales no se reescribieron y contienen contratos antiguos; README y documentaci?n aclaran esta diferencia.
- Las advertencias de deprecaci?n de dependencias requieren una actualizaci?n futura separada.
- Ninguno de estos resultados sustituye aceptaci?n acad?mica ni revisi?n funcional del equipo.

## Estado Git comprobado al cierre

26 archivos rastreados modificados y 59 nuevos sin seguimiento; 0 eliminados y 0 staged.
HEAD, main y origin/main permanecen en 2396787. No hay commit, push, merge ni PR.
Los directorios generados permanecen ignorados.

## Inventario de incorporaci?n

### 53 archivos nuevos procedentes del origen

- `__tests__/components/CountdownTimer.test.js`
- `__tests__/components/DriverCard.test.js`
- `__tests__/components/LoadingScreen.test.js`
- `__tests__/components/OfflineBanner.test.js`
- `__tests__/components/RaceCard.test.js`
- `__tests__/components/SessionCard.test.js`
- `__tests__/components/StandingsTable.test.js`
- `__tests__/components/TelemetryWidget.test.js`
- `__tests__/components/TrackMap.test.js`
- `__tests__/fixtures/calendar.js`
- `__tests__/fixtures/jolpica.js`
- `__tests__/fixtures/jolpicaStandings.js`
- `__tests__/fixtures/standings.js`
- `__tests__/models/Escuderia.test.js`
- `__tests__/models/GranPremio.test.js`
- `__tests__/models/Piloto.test.js`
- `__tests__/models/Sesion.test.js`
- `__tests__/screens/ARScreen.test.js`
- `__tests__/screens/CalendarioScreen.test.js`
- `__tests__/screens/ChampionshipScreens.test.js`
- `__tests__/screens/DetalleGPScreen.test.js`
- `__tests__/screens/FavoritesSync.test.js`
- `__tests__/screens/HistorialWebScreen.test.js`
- `__tests__/screens/HomeScreen.test.js`
- `__tests__/services/F1ChampionshipStandings.test.js`
- `__tests__/services/F1DataService.test.js`
- `__tests__/services/JolpicaCalendarAdapter.test.js`
- `__tests__/services/JolpicaService.test.js`
- `__tests__/storage/FavoriteDriversCollection.test.js`
- `__tests__/storage/FavoritesCompatibility.test.js`
- `__tests__/storage/LocalStorageManager.test.js`
- `__tests__/utils/favorites.test.js`
- `__tests__/utils/timezone.test.js`
- `docs/Counter.test.tsx`
- `docs/pruebas/ActasPruebasManuales.md`
- `docs/pruebas/CasosDePrueba.md`
- `docs/pruebas/ChecklistEntrega.md`
- `docs/pruebas/Defectos.md`
- `docs/pruebas/EvidenciasIntegracion.md`
- `docs/pruebas/InformeResultados.md`
- `docs/pruebas/PlanMaestro-F1Fan.md`
- `docs/pruebas/evidencias/cobertura-unitaria-resumen.json`
- `docs/pruebas/evidencias/comparador-375-demo-medidas.json`
- `docs/pruebas/evidencias/comparador-375-demo.png`
- `docs/pruebas/evidencias/jest-completo-2026-11-02.txt`
- `docs/pruebas/evidencias/jest-unitario-cobertura-2026-11-02.txt`
- `docs/referencias/Plan_Maestro_Pruebas_Software.docx`
- `jest.config.js`
- `jest.unit.config.js`
- `src/services/JolpicaCalendarAdapter.js`
- `src/services/JolpicaService.js`
- `src/utils/favorites.js`
- `tsconfig.json`

### 22 archivos compartidos con cambios de contenido

- `package-lock.json`
- `package.json`
- `src/components/CountdownTimer.js`
- `src/components/DriverCard.js`
- `src/components/RaceCard.js`
- `src/components/SessionCard.js`
- `src/components/StandingsTable.js`
- `src/components/TrackMap.js`
- `src/models/GranPremio.js`
- `src/models/Sesion.js`
- `src/screens/ARScreen.js`
- `src/screens/CalendarioScreen.js`
- `src/screens/ClasificacionScreen.js`
- `src/screens/ComparadorScreen.js`
- `src/screens/DetalleGPScreen.js`
- `src/screens/FavoritosScreen.js`
- `src/screens/HistorialWebScreen.js`
- `src/screens/HomeScreen.js`
- `src/screens/MasScreen.js`
- `src/services/F1DataService.js`
- `src/storage/LocalStorageManager.js`
- `src/utils/timezone.js`

### Ediciones adicionales sobre archivos existentes del clon

- `.gitignore`: exclusiones y plantillas de entorno.
- `README.md`: fuentes, pantallas, limitaciones y comandos vigentes.
- `src/screens/PerfilPilotoScreen.js`: RF-05, favoritos m?ltiples y separaci?n de demostraciones.
- `src/screens/LiveScreen.js`: identificaci?n de demostraciones y protecci?n del contrato de la torre.

### Seis archivos adicionales de la integraci?n

- `__tests__/screens/PerfilPilotoScreen.test.js`
- `__tests__/screens/RF04SessionResults.test.js`
- `docs/pruebas/IntegracionLocal.md`
- `docs/pruebas/evidencias/cobertura-unitaria-integracion-resumen.json`
- `docs/pruebas/evidencias/jest-completo-integracion-2026-11-02.txt`
- `docs/pruebas/evidencias/jest-unitario-integracion-2026-11-02.txt`
