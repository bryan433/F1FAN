# F1FAN - Aplicación Multiplataforma de Fórmula 1

Aplicación móvil y web multiplataforma desarrollada en **React Native con Expo**, diseñada conforme a las especificaciones técnicas del **Informe SRS de F1Fan** y los diseños oficiales de **F1FAN MOCKUPS**.

---

## 🏎️ Descripción y Objetivos del Proyecto

La aplicación centraliza resultados, posiciones, clasificaciones y calendarios de Fórmula 1 en una sola plataforma gratuita, rápida y optimizada:
- **Horarios de Santiago (America/Santiago)** calculados desde fechas y horas UTC publicadas; los datos ausentes se indican sin completar horarios ficticios.
- **Jolpica** para Inicio, Calendario, Historial y las clasificaciones que alimentan Tablas y Comparador, con caché por origen y temporada.
- **OpenF1** conserva su cliente y RF-04 para sesiones finalizadas con origen explícito y `session_key` válido; no se convierten IDs de Jolpica en claves OpenF1.
- **Persistencia local con AsyncStorage** para caché, favoritos múltiples de pilotos/escuderías y migración compatible del favorito anterior.
- Rendimiento, accesibilidad, pruebas manuales y aceptación de requisitos pendientes se detallan en [el Plan Maestro](docs/pruebas/PlanMaestro-F1Fan.md); no se deducen del éxito de Jest.

---

## 📱 Pantallas Implementadas (F1FAN Mockups)

1. **HomeScreen (01 & 03)**:
   - Saludo al usuario aficionado (`Hola, Diego`).
   - Próximo GP y sesiones publicados por Jolpica; consulta de futuras temporadas publicadas cuando corresponde.
   - Contador regresivo con fecha válida, carga, reintento y estados de calendario incompleto o sin próxima carrera.
   - Un horario pasado no confirma resultados ni una sesión en vivo. Accesos a detalle, AR y recursos.
2. **LiveScreen (02, 04, 05)**:
   - Demostración identificada como simulación; conserva estado de pista y Safety Car interactivo.
   - Selector de vistas: **TIMING** (torre de tiempos con intervalos y compuestos de neumático), **MAPA**, **TELEMETRÍA** y **RADIO**.
   - Velocímetro, marcha, DRS, pedales y mensajes de radio de demostración, sin afirmar transmisión real.
3. **ClasificacionScreen (08)**:
   - Pestañas conmutables entre **PILOTOS** y **CONSTRUCTORES**.
   - Indicador de piloto favorito con estrella dorada y fila resaltada.
   - Clasificaciones Jolpica por temporada, procedencia/ronda y comparación de los líderes publicados; errores independientes por tabla.
4. **CalendarioScreen (14)**:
   - Filtros: `TODO`, `PRÓXIMAS`, `ANTERIORES`, según fechas programadas, sin inferir resultados.
   - Horarios Santiago y navegación al GP seleccionado; un acceso en vivo exige estado confirmado.
5. **DetalleGPScreen (11)**:
   - Identidad, temporada, ronda, circuito y sesiones del GP seleccionado; datos técnicos y meteorología ausentes se indican.
   - RF-04 conserva la tabla POS/PILOTO/TIEMPO/DIF y cierre. Solo muestra filas obtenidas de OpenF1 para la sesión correspondiente; sin resultados confirmados presenta un estado de datos no disponibles.
   - El calendario Jolpica no aporta claves OpenF1 ni resultados de sesión. AR conserva un acceso explícito a demostración.
6. **PerfilPilotoScreen (10)**:
   - Perfil e imagen del piloto recibidos (RF-05); el catálogo local se identifica como demostración.
   - Botón interactivo `ES FAVORITO` / `MARCAR COMO FAVORITO` conectado a `LocalStorageManager` con mensajes de confirmación (`CU-06`).
   - Favoritos múltiples sincronizados por identidad estable; guardado/eliminación individual sin reemplazar los demás.
   - Métricas publicadas de la temporada recibida; ceros válidos y datos desconocidos diferenciados. Historial simulado separado del perfil Jolpica.
7. **ComparadorScreen (09)**:
   - Enfrentamiento cabeza a cabeza (Head-to-Head) entre dos pilotos.
   - Selección independiente, intercambio y prevención de duplicados. Puntos, victorias y posición publicados; poles, podios y ritmo sin fuente se indican como no disponibles.
8. **ARScreen (06 & 07)**:
   - Simulación AR de Marina Bay, independiente del GP seleccionado y señalada como demostración.
   - Modo de calibración de superficie y selección de escala (`1:50`, `1:100`, `1:200`).
   - Vista 3D interactiva con trazado, autos en movimiento y telemetría flotante.
   - Grabación simulada de clip AR y repetición de carrera.
9. **FavoritosScreen (12)**:
   - Colección múltiple de pilotos, eliminación individual, migración y sincronización con Clasificación y Perfil.
   - Selección persistida de escuderías; una colección vacía se conserva como preferencia.
   - Configuración de alertas de carrera (paradas en boxes, radios de equipo, Safety Car, cambios de líder).
10. **PerfilScreen (13)**:
    - Perfil del usuario aficionado (Diego Morales).
    - Estadísticas de fanático (47 carreras vistas, 12 poles acertadas, 9 años fan).
    - Ajustes de la aplicación: Modo experto, Evitar spoilers, Selector de unidades (km/h vs mph), Hora chilena activa.
11. **MasScreen (15)**:
    - Hub central con accesos rápidos a Favoritos, Perfil, AR, Historial, Calendario y Guía F1 Básico.
    - Feed de análisis técnico y actualidad de F1.
12. **HistorialWebScreen (08 & 16 / SD-08)**:
    - Temporadas publicadas por Jolpica; carreras, ganadores y primeros de clasificación, con aviso si hay resultados parciales.
    - Filtro instantáneo por piloto en el navegador sin recargar el servidor.

---

## 🏗️ Arquitectura y Estructura del Código

La estructura conserva los módulos del diseño original y añade la integración con Jolpica:

Los diagramas PlantUML se conservan como referencia histórica: algunos aún describen OpenF1 y un favorito único. El flujo Jolpica y la colección múltiple están documentados en `docs/pruebas/`.

```text
F1FAN/
├── App.js                         # Punto de entrada principal con SafeAreaProvider y StatusBar
├── app.json                       # Configuración de Expo (nombre, bundle, splash dark)
├── babel.config.js                # Configuración de Babel
├── package.json                   # Dependencias oficiales de React Native, Expo y React Navigation
├── src/
│   ├── components/                # Componentes UI reutilizables
│   │   ├── CountdownTimer.js      # Conteo regresivo en días/horas/minutos
│   │   ├── DriverCard.js          # Tarjeta de piloto con destaque de favorito
│   │   ├── Header.js              # Cabecera con saludo y avatar de usuario
│   │   ├── LoadingScreen.js       # Indicador de carga
│   │   ├── OfflineBanner.js       # Banner de aviso sin conexión / uso de caché
│   │   ├── RaceCard.js            # Tarjeta de Gran Premio con hora chilena
│   │   ├── SessionCard.js         # Tarjeta de sesión (Práctica, Calificación, Carrera)
│   │   ├── StandingsTable.js      # Tabla de clasificación Pilotos y Constructores
│   │   ├── TelemetryWidget.js     # Velocidad, marcha, pedal de gas/freno y DRS
│   │   └── TrackMap.js            # Trazado vectorial del circuito con seguimiento en vivo
│   ├── models/                    # Modelos del Dominio F1Fan (Sección 3.1 & 3.2)
│   │   ├── Piloto.js
│   │   ├── Escuderia.js
│   │   ├── GranPremio.js
│   │   ├── Circuito.js
│   │   ├── Sesion.js
│   │   └── ResultadoSesion.js
│   ├── storage/
│   │   └── LocalStorageManager.js # Persistencia en AsyncStorage (caché y favoritos)
│   ├── services/
│   │   ├── OpenF1Client.js        # Cliente HTTP con rate-limiting (RNF-02)
│   │   ├── JolpicaService.js      # Calendario, temporadas, historial y clasificaciones con caché
│   │   ├── JolpicaCalendarAdapter.js # Identidad de GP, sesiones y estados publicados
│   │   ├── F1DataService.js       # Orquestador con fallback y modo sin conexión (RNF-PER-02)
│   │   └── AuthService.js         # Autenticación y gestión de sesión de usuario
│   ├── data/
│   │   ├── teamsAndDrivers.js     # Base de datos de equipos oficiales, colores y pilotos
│   │   └── mockData.js            # Datos de alta fidelidad de Singapur y temporada 2024
│   ├── utils/
│   │   └── timezone.js            # Conversión precisa a hora local de Chile (America/Santiago)
│   ├── theme/
│   │   └── colors.js              # Paleta oficial F1 en modo oscuro
│   └── navigation/
│       ├── BottomTabNavigator.js  # 5 pestañas principales (Inicio, Live, Tablas, Calendario, Más)
│       └── AppNavigator.js        # Pila de navegación (Stack Navigator) completa
└── diagramas/                     # Archivos fuente PlantUML (.puml) según Anexo 8.2
    ├── SD01_carga_inicial.puml
    ├── SD02_iniciar_sesion.puml
    ├── SD03_consulta_clasificaciones.puml
    ├── SD04_gran_premio_resultados.puml
    ├── SD05_perfil_piloto_favoritos.puml
    ├── SD06_sincronizacion_programada.puml
    ├── SD07_circuito_realidad_aumentada.puml
    ├── SD08_panel_web_historial.puml
    ├── CMP01_componentes.puml
    └── DEP01_despliegue.puml
```

---

## 🚀 Instrucciones de Ejecución

Desde la raíz del clon, instalar las versiones bloqueadas antes de iniciar Expo. En PowerShell con scripts restringidos, usar `npm.cmd` y `npx.cmd`:

```bash
npm ci

# Iniciar servidor de desarrollo Expo
npx expo start

# Ejecutar en el navegador web (Expo Web)
npx expo start --web

# Ejecutar en dispositivo Android (o emulador)
npx expo start --android

# Ejecutar en iOS (o simulador en macOS)
npx expo start --ios
```

## Pruebas y evidencias

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas unitarias con cobertura
npm run test:unit:coverage

# Ejecutar suite completa en modo CI (como en GitHub Actions)
npm run test:ci
```

La suite del proyecto cuenta con **380 pruebas aprobadas en 35 suites (100% éxito)**. La cobertura unitaria alcanza un **89.81% en instrucciones, 89.57% en ramas, 90.35% en funciones y 90.47% en líneas**, superando el mínimo del 80% exigido.

El pipeline de **Integración Continua (CI)** está implementado con **GitHub Actions** en [`.github/workflows/ci.yml`](.github/workflows/ci.yml), ejecutando pruebas automáticas y subiendo reportes de cobertura ante cada `push` y `pull_request`.

El [informe de resultados](docs/pruebas/InformeResultados.md) y la [entrega de QA y CI](docs/pruebas/EntregaQABryan.md) detallan las métricas alcanzadas y la trazabilidad de los casos. Las evidencias portátiles están en `docs/pruebas/evidencias/`. La cobertura HTML/LCOV se genera en `coverage/` y `coverage-unit/`.
