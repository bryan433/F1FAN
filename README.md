# F1FAN - Aplicación Multiplataforma de Fórmula 1

Aplicación móvil y web multiplataforma desarrollada en **React Native con Expo**, diseñada conforme a las especificaciones técnicas del **Informe SRS de F1Fan** y los diseños oficiales de **F1FAN MOCKUPS**.

---

## 🏎️ Descripción y Objetivos del Proyecto

La aplicación centraliza resultados, posiciones, clasificaciones y calendarios de Fórmula 1 en una sola plataforma gratuita, rápida y optimizada:
- **Ajuste automático a hora chilena (America/Santiago / CLT)** para todas las sesiones de carrera y prácticas (según **HU-02** y sección 1.2).
- **Rendimiento óptimo**: pantallas renderizadas en menos de 3 segundos (**RNF-01**).
- **Consumo controlado de la API comunitaria OpenF1**: no sobrepasa el límite estricto de 30 peticiones por minuto (**RNF-02**), implementando colas y retardos calculados (2.1s).
- **Soporte offline y persistencia local** mediante **AsyncStorage** para caché de datos y gestión de pilotos favoritos (**RNF-PER-01**, **RNF-PER-02**, **CU-02**, **CU-06**).

---

## 📱 Pantallas Implementadas (F1FAN Mockups)

1. **HomeScreen (01 & 03)**:
   - Saludo al usuario aficionado (`Hola, Diego`).
   - Gran Premio de Singapur (Marina Bay, Round 17 de 24).
   - Contador regresivo en tiempo real (`días`, `horas`, `minutos`).
   - Sesiones del fin de semana con badges de estado (`FINALIZADO`, `EN VIVO - VUELTA 12`, `PROGRAMADO`).
   - Artículos y notas editoriales rápidas de F1.
2. **LiveScreen (02, 04, 05)**:
   - Estado de la pista en vivo (`PISTA VERDE` / `SAFETY CAR DESPLEGADO`).
   - Selector de vistas: **TIMING** (torre de tiempos con intervalos y compuestos de neumático), **MAPA**, **TELEMETRÍA** y **RADIO**.
   - Telemetría en tiempo real: velocímetro (312 km/h), marcha 7, DRS ON/OFF, acelerador y freno.
   - Transcripciones de radio de los equipos.
3. **ClasificacionScreen (08)**:
   - Pestañas conmutables entre **PILOTOS** y **CONSTRUCTORES**.
   - Indicador de piloto favorito con estrella dorada y fila resaltada.
   - Barra comparativa inferior del duelo por el campeonato del mundo (L. Norris vs M. Verstappen).
4. **CalendarioScreen (14)**:
   - Filtros: `TODO`, `PRÓXIMAS`, `RESULTADOS`.
   - Conversión horaria automática a la hora local chilena (CLT).
   - Acceso directo a carrera en vivo mediante botón interactivo `ENTRAR AL LIVE`.
5. **DetalleGPScreen (11)**:
   - Ficha técnica completa de Marina Bay (longitud 5.063 km, 62 vueltas, 19 curvas, récord de 1:29.525).
   - Condiciones de pista y temperatura ambiente.
   - Trazado vectorial del circuito y desglose de sesiones.
6. **PerfilPilotoScreen (10)**:
   - Información deportiva detallada (George Russell #63, Mercedes-AMG).
   - Botón interactivo `ES FAVORITO` / `MARCAR COMO FAVORITO` conectado a `LocalStorageManager` con mensajes de confirmación (`CU-06`).
   - Métricas clave: P4 Campeonato, 201 Puntos, 3 Podios, 1 Victoria.
   - Historial reciente de Grandes Premios.
7. **ComparadorScreen (09)**:
   - Enfrentamiento cabeza a cabeza (Head-to-Head) entre dos pilotos.
   - Comparación de puntos, victorias, poles, podios y curvas de ritmo por vuelta.
8. **ARScreen (06 & 07)**:
   - Realidad Aumentada interactiva del circuito sobre la mesa.
   - Modo de calibración de superficie y selección de escala (`1:50`, `1:100`, `1:200`).
   - Vista 3D interactiva con trazado, autos en movimiento y telemetría flotante.
   - Grabación simulada de clip AR y repetición de carrera.
9. **FavoritosScreen (12)**:
   - Gestión de pilotos favoritos (Russell #63, Leclerc #16).
   - Selección de escuderías favoritas (Mercedes, McLaren, Ferrari).
   - Configuración de alertas de carrera (paradas en boxes, radios de equipo, Safety Car, cambios de líder).
10. **PerfilScreen (13)**:
    - Perfil del usuario aficionado (Diego Morales).
    - Estadísticas de fanático (47 carreras vistas, 12 poles acertadas, 9 años fan).
    - Ajustes de la aplicación: Modo experto, Evitar spoilers, Selector de unidades (km/h vs mph), Hora chilena activa.
11. **MasScreen (15)**:
    - Hub central con accesos rápidos a Favoritos, Perfil, AR, Historial, Calendario y Guía F1 Básico.
    - Feed de análisis técnico y actualidad de F1.
12. **HistorialWebScreen (08 & 16 / SD-08)**:
    - Panel de consulta histórica por temporadas (2023, 2024).
    - Filtro instantáneo por piloto en el navegador sin recargar el servidor.

---

## 🏗️ Arquitectura y Estructura del Código

El proyecto sigue rigurosamente el diagrama modular del informe (Sección 3.3):

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

Dentro de la carpeta `F1FAN`:

```bash
# Iniciar servidor de desarrollo Expo
npx expo start

# Ejecutar en el navegador web (Expo Web)
npx expo start --web

# Ejecutar en dispositivo Android (o emulador)
npx expo start --android

# Ejecutar en iOS (o simulador en macOS)
npx expo start --ios
```