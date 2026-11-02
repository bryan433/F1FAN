import React from 'react';
import { ActivityIndicator, Alert, Animated } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import BottomTabNavigator from '../../src/navigation/BottomTabNavigator';
import HomeScreen from '../../src/screens/HomeScreen';
import CalendarioScreen from '../../src/screens/CalendarioScreen';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import ComparadorScreen from '../../src/screens/ComparadorScreen';
import DetalleGPScreen from '../../src/screens/DetalleGPScreen';
import HistorialWebScreen from '../../src/screens/HistorialWebScreen';
import FavoritosScreen from '../../src/screens/FavoritosScreen';
import LiveScreen from '../../src/screens/LiveScreen';
import MasScreen from '../../src/screens/MasScreen';
import PerfilPilotoScreen from '../../src/screens/PerfilPilotoScreen';
import PerfilScreen from '../../src/screens/PerfilScreen';
import ARScreen from '../../src/screens/ARScreen';
import Header from '../../src/components/Header';
import CountdownTimer from '../../src/components/CountdownTimer';
import DriverCard from '../../src/components/DriverCard';
import RaceCard from '../../src/components/RaceCard';
import SessionCard from '../../src/components/SessionCard';
import StandingsTable from '../../src/components/StandingsTable';
import OfflineBanner from '../../src/components/OfflineBanner';
import LoadingScreen from '../../src/components/LoadingScreen';
import TelemetryWidget from '../../src/components/TelemetryWidget';
import TrackMap from '../../src/components/TrackMap';
import F1DataService from '../../src/services/F1DataService';
import OpenF1Client from '../../src/services/OpenF1Client';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { Colors } from '../../src/theme/colors';
import { AHORA, CLAVES, crearServidor, navegacionFalsa, reiniciarServicios, animacionInmediata, meetingOpenF1, respuestaHttp } from './helpers/entorno';
import {
  problemasDeControles, objetivosPequenos, textosPequenos, encabezados, seAnuncia, ancestroComun,
  primerHost, FUENTE_MINIMA, OBJETIVO_TACTIL_MINIMO,
} from './helpers/arbolAccesible';
import { razonContraste, MINIMO_TEXTO_NORMAL, MINIMO_TEXTO_GRANDE_O_UI } from './helpers/contrast';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
// Los íconos se representan como vistas sin texto del tamaño indicado: un botón que solo tiene
// un ícono no obtiene nombre accesible a partir de su contenido, igual que en un dispositivo real.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Ionicons: ({ name, size = 12, style }) => <View testID={`icon-${name}`} style={[{ width: size, height: size }, style]} /> };
});

const fetchOriginal = global.fetch;
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(CLAVES.escuderias, '[]');
  jest.spyOn(Date, 'now').mockReturnValue(AHORA);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(animacionInmediata());
  reiniciarServicios({ F1DataService, OpenF1Client });
  global.fetch = crearServidor();
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = fetchOriginal; });

const raiz = () => screen.UNSAFE_root;
const asentar = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const pilotoJolpica = { idPiloto: 81, numero: 81, driverId: 'piloto_prueba', nombre: 'Ana', apellido: 'Prueba', codigo: 'ANA',
  nombreEscuderia: 'Equipo de prueba', puntos: 125.5, victorias: 3, posicionCampeonato: 1, source: 'jolpica', season: '2026' };
const pilotoTarjeta = (extra = {}) => ({ ...pilotoJolpica, obtenerNombreCompleto: () => 'Ana Prueba', ...extra });

// Cada escenario devuelve la raíz a analizar una vez cargados sus datos.
const PANTALLAS = [
  { nombre: 'Inicio', titulo: 'Hola, Diego', preparar: async () => { render(<HomeScreen navigation={navegacionFalsa()} />); await screen.findByText('GP de prueba'); } },
  { nombre: 'Calendario', titulo: 'Calendario', preparar: async () => { render(<CalendarioScreen navigation={navegacionFalsa()} />); await screen.findByText('GP de prueba'); } },
  { nombre: 'Clasificación (pilotos)', titulo: 'Clasificación', preparar: async () => { render(<ClasificacionScreen navigation={navegacionFalsa()} />); await screen.findByText('A. PRUEBA'); } },
  { nombre: 'Clasificación (constructores)', titulo: 'Clasificación', preparar: async () => { render(<ClasificacionScreen navigation={navegacionFalsa()} />); await screen.findByText('A. PRUEBA'); fireEvent.press(screen.getByText('CONSTRUCTORES')); } },
  { nombre: 'Comparador (selector abierto)', titulo: 'Comparador Estadístico', preparar: async () => { render(<ComparadorScreen navigation={navegacionFalsa()} route={{ params: {} }} />); await screen.findByText('PRUEBA'); fireEvent.press(screen.getByLabelText('Seleccionar piloto izquierdo')); } },
  { nombre: 'Detalle GP (resultados)', titulo: 'GP controlado', preparar: async () => { render(<DetalleGPScreen route={{ params: { meeting: meetingOpenF1() } }} navigation={navegacionFalsa()} />); fireEvent.press(screen.getByText('Carrera')); await screen.findByText('Piloto de ensayo'); } },
  { nombre: 'Historial (búsqueda)', titulo: 'Historial Multiplataforma (Web & Móvil)', preparar: async () => { render(<HistorialWebScreen navigation={navegacionFalsa()} />); await screen.findByText('Italian Grand Prix'); fireEvent.changeText(screen.getByLabelText('Buscar en el historial'), 'a'); } },
  { nombre: 'Historial (selector de temporada)', titulo: 'Selecciona una temporada', preparar: async () => { render(<HistorialWebScreen navigation={navegacionFalsa()} />); await screen.findByText('Italian Grand Prix'); fireEvent.press(screen.getByLabelText('Seleccionar temporada')); await screen.findByText('Selecciona una temporada'); } },
  { nombre: 'Favoritos', titulo: 'Favoritos', preparar: async () => {
    await LocalStorageManager.guardarFavorito('piloto_prueba');
    await AsyncStorage.setItem(CLAVES.escuderias, '["equipo_prueba"]');
    render(<FavoritosScreen navigation={navegacionFalsa()} />);
    await screen.findByText('Ana Prueba');
  } },
  { nombre: 'En Vivo', titulo: 'En Vivo', preparar: async () => { render(<LiveScreen navigation={navegacionFalsa()} />); await asentar(); } },
  { nombre: 'Más', titulo: 'Más', preparar: async () => { render(<MasScreen navigation={navegacionFalsa()} />); } },
  { nombre: 'Perfil del piloto', titulo: 'Perfil del Piloto', preparar: async () => { render(<PerfilPilotoScreen route={{ params: { driver: pilotoJolpica } }} navigation={navegacionFalsa()} />); await asentar(); } },
  { nombre: 'Perfil y ajustes', titulo: 'Perfil & Ajustes', preparar: async () => { render(<PerfilScreen navigation={navegacionFalsa()} />); await asentar(); } },
  { nombre: 'Realidad aumentada (calibración)', titulo: 'SIMULACIÓN AR — DATOS DE DEMOSTRACIÓN', preparar: async () => { render(<ARScreen navigation={navegacionFalsa()} />); } },
  { nombre: 'Realidad aumentada (mesa)', titulo: 'SIMULACIÓN AR — DATOS DE DEMOSTRACIÓN', preparar: async () => { render(<ARScreen navigation={navegacionFalsa()} />); fireEvent.press(screen.getByText('COLOCAR CIRCUITO')); } },
  { nombre: 'Barra de pestañas', preparar: async () => {
    render(<NavigationContainer><BottomTabNavigator /></NavigationContainer>);
    await screen.findByText('GP de prueba');
    return ancestroComun(screen.getAllByLabelText(/, tab, \d of \d$/));
  } },
];

const COMPONENTES = [
  { nombre: 'Header', interactivo: true, preparar: async () => { render(<Header title="Título" subtitle="Subtítulo" onProfilePress={jest.fn()} />); } },
  { nombre: 'CountdownTimer', interactivo: true, preparar: async () => { render(<CountdownTimer targetDate="2026-11-08T17:00:00Z" title="GP de prueba" country="País de prueba" location="Circuito" round={1} totalRounds={24} onCalendarPress={jest.fn()} />); } },
  { nombre: 'DriverCard', interactivo: true, preparar: async () => { render(<DriverCard driver={pilotoTarjeta()} position="1" onPress={jest.fn()} onToggleFavorite={jest.fn()} />); } },
  { nombre: 'RaceCard (en vivo)', interactivo: true, preparar: async () => { render(<RaceCard race={{ name: 'GP de prueba', circuit: 'Circuito de prueba', round: 1, isLive: true, dateRange: '2026-11-08' }} onPress={jest.fn()} onLivePress={jest.fn()} />); } },
  { nombre: 'SessionCard', interactivo: true, preparar: async () => { render(<SessionCard session={{ tipo: 'Carrera', estado: 'Programado', date: '2026-11-08', horaChile: '14:00' }} onPress={jest.fn()} />); } },
  { nombre: 'StandingsTable (pilotos)', interactivo: true, preparar: async () => { render(<StandingsTable drivers={[pilotoTarjeta(), pilotoTarjeta({ idPiloto: 82, driverId: 'piloto_ensayo', nombre: 'Bruno', apellido: 'Ensayo', puntos: 100 })]} teams={[]} onDriverPress={jest.fn()} onToggleFavorite={jest.fn()} />); } },
  { nombre: 'StandingsTable (constructores)', interactivo: true, preparar: async () => { render(<StandingsTable drivers={[]} teams={[{ idEscuderia: 'equipo_prueba', nombre: 'Equipo de prueba', puntos: 225.5, source: 'jolpica', positionText: '1' }]} onToggleTeamFavorite={jest.fn()} />); fireEvent.press(screen.getByText('CONSTRUCTORES')); } },
  { nombre: 'OfflineBanner', interactivo: false, preparar: async () => { render(<OfflineBanner visible message="Mostrando la última copia guardada." />); } },
  { nombre: 'LoadingScreen', interactivo: false, preparar: async () => { render(<LoadingScreen message="Cargando datos de F1..." />); } },
  { nombre: 'TelemetryWidget', interactivo: false, preparar: async () => { render(<TelemetryWidget />); } },
  { nombre: 'TrackMap', interactivo: false, preparar: async () => { render(<TrackMap isLive={false} isDemo />); } },
];

const CON_CONTROLES = [...PANTALLAS.map(p => [p.nombre, p]), ...COMPONENTES.filter(c => c.interactivo).map(c => [c.nombre, c])];
const TODOS = [...PANTALLAS.map(p => [p.nombre, p]), ...COMPONENTES.map(c => [c.nombre, c])];
const analizar = async escenario => (await escenario.preparar()) ?? raiz();

describe('Controles interactivos', () => {
  // DEFECTO: varios TouchableOpacity/Switch carecen de accessibilityRole o de nombre (p. ej. avatar de Header.js:14, filas y subpestañas de LiveScreen, interruptores sin accessibilityLabel); el mensaje lista cada control.
  test.each(CON_CONTROLES)('%s: cada control tiene rol interactivo y nombre accesible', async (_nombre, escenario) => {
    const problemas = problemasDeControles(await analizar(escenario));
    expect(problemas).toEqual([]);
  });

  // DEFECTO: múltiples objetivos táctiles miden menos de 44×44 pt (avatar de 38 pt, flechas de regreso de 34 pt, pestañas y pastillas de ~30 pt de alto).
  test.each(CON_CONTROLES)(`%s: los objetivos táctiles determinables miden al menos ${OBJETIVO_TACTIL_MINIMO}×${OBJETIVO_TACTIL_MINIMO} pt (incluye hitSlop)`, async (_nombre, escenario) => {
    expect(objetivosPequenos(await analizar(escenario))).toEqual([]);
  });

  // DEFECTO: el acceso al perfil del encabezado solo se anuncia como "DM" (iniciales), sin rol ni descripción de su función.
  test('el acceso al perfil del encabezado tiene un nombre descriptivo y rol de botón', async () => {
    render(<Header title="Título" onProfilePress={jest.fn()} />);
    expect(screen.queryAllByRole('button', { name: /perfil/i })).toHaveLength(1);
  });
});

describe('Legibilidad del texto', () => {
  // DEFECTO: hay textos de 8–11 px (p. ej. tabBarLabelStyle.fontSize 10 en BottomTabNavigator.js:30, sectionSub 10 px en Inicio, TrackMap 8 px).
  test.each(TODOS)(`%s: ningún texto visible usa menos de ${FUENTE_MINIMA} px`, async (_nombre, escenario) => {
    expect(textosPequenos(await analizar(escenario))).toEqual([]);
  });
});

describe('Estructura y anuncios', () => {
  // DEFECTO: Header.js:11 y los navTitle de cada pantalla no declaran accessibilityRole="header"; solo la simulación AR lo hace.
  test.each(PANTALLAS.filter(p => p.titulo).map(p => [p.nombre, p]))('%s: el título visible se expone con rol header', async (_nombre, escenario) => {
    const lista = encabezados(await analizar(escenario));
    expect(lista).toContain(escenario.titulo);
  });

  const conError = async (crear, mensaje, preparar) => {
    render(crear());
    if (preparar) preparar();
    return screen.findByText(mensaje);
  };
  test.each([
    ['Inicio', () => <HomeScreen navigation={navegacionFalsa()} />, 'No se pudo consultar el próximo Gran Premio.', null],
    ['Calendario', () => <CalendarioScreen navigation={navegacionFalsa()} />, 'No se pudo cargar el calendario.', null],
    ['Historial', () => <HistorialWebScreen navigation={navegacionFalsa()} />, 'No se pudieron cargar las temporadas de Jolpica.', null],
    ['Detalle GP (resultados)', () => <DetalleGPScreen route={{ params: { meeting: meetingOpenF1() } }} navigation={navegacionFalsa()} />, /^Resultados no disponibles/, () => fireEvent.press(screen.getByText('Carrera'))],
  ])('%s: el mensaje de error se anuncia (rol alert o región dinámica)', async (_nombre, crear, mensaje, preparar) => {
    global.fetch = jest.fn(async () => respuestaHttp(503));
    expect(seAnuncia(await conError(crear, mensaje, preparar))).toBe(true);
  });

  // DEFECTO: los errores de Clasificación (ClasificacionScreen.js:106 y :131), Comparador (ComparadorScreen.js:105) y Favoritos (FavoritosScreen.js:116) son Text sin rol alert ni región dinámica.
  test.each([
    ['Clasificación (tabla)', () => <ClasificacionScreen navigation={navegacionFalsa()} />, 'Pilotos: No se pudo actualizar (Jolpica HTTP 503).'],
    ['Clasificación (temporada inválida)', () => <ClasificacionScreen navigation={navegacionFalsa()} route={{ params: { season: 'abc' } }} />, 'No se pudo consultar la clasificación: Temporada no válida.'],
    ['Comparador', () => <ComparadorScreen navigation={navegacionFalsa()} route={{ params: {} }} />, /^No se pudo actualizar la comparación/],
    ['Favoritos', () => <FavoritosScreen navigation={navegacionFalsa()} />, 'No se pudo actualizar la información de clasificación. Tus favoritos guardados se conservan.'],
  ])('%s: el mensaje de error se anuncia (rol alert o región dinámica)', async (_nombre, crear, mensaje) => {
    global.fetch = jest.fn(async () => respuestaHttp(503));
    expect(seAnuncia(await conError(crear, mensaje))).toBe(true);
  });

  // DEFECTO: OfflineBanner.js:10-12 no declara accessibilityRole="alert" ni accessibilityLiveRegion; el cambio a datos guardados no se anuncia.
  test('OfflineBanner se anuncia al aparecer', () => {
    render(<OfflineBanner visible message="Mostrando la última copia guardada." />);
    expect(seAnuncia(screen.getByText('Mostrando la última copia guardada.'))).toBe(true);
  });

  // DEFECTO: los ActivityIndicator de LoadingScreen.js:8 e HistorialWebScreen.js:156 no tienen accessibilityLabel ni un contenedor con estado busy.
  test.each([
    ['LoadingScreen', () => render(<LoadingScreen />), null],
    ['Historial (carga de temporadas)', () => render(<HistorialWebScreen navigation={navegacionFalsa()} />), 'Italian Grand Prix'],
  ])('%s: el indicador de carga expone una etiqueta o un estado ocupado', async (_nombre, crear, textoFinal) => {
    crear();
    const indicador = screen.UNSAFE_getByType(ActivityIndicator);
    let ocupado = false;
    for (let nodo = primerHost(indicador); nodo; nodo = nodo.parent) {
      const props = nodo.props ?? {};
      if (props.accessibilityState?.busy || props['aria-busy'] || props.accessibilityRole === 'progressbar' || props.accessibilityLiveRegion) ocupado = true;
    }
    const anunciado = { etiqueta: indicador.props.accessibilityLabel ?? null, ocupado };
    if (textoFinal) await screen.findByText(textoFinal); // Deja asentada la carga antes de terminar.
    expect(Boolean(anunciado.etiqueta) || anunciado.ocupado ? 'anunciado' : anunciado).toBe('anunciado');
  });
});

describe('Contraste de color (WCAG 2.1 AA)', () => {
  const color = valor => Colors[valor] ?? valor;
  // [primer plano, fondo, uso en la interfaz, mínimo]
  const PARES = [
    ['textPrimary', 'background', 'títulos y texto principal', MINIMO_TEXTO_NORMAL],
    ['textPrimary', 'backgroundCard', 'texto principal en tarjetas', MINIMO_TEXTO_NORMAL],
    ['textSecondary', 'background', 'subtítulos del encabezado', MINIMO_TEXTO_NORMAL],
    ['textSecondary', 'backgroundCard', 'texto secundario en tarjetas', MINIMO_TEXTO_NORMAL],
    ['textSecondary', 'backgroundCardElevated', 'pestañas inactivas del Calendario', MINIMO_TEXTO_NORMAL],
    ['textMuted', 'background', 'avisos de 10–11 px (Inicio, Calendario)', MINIMO_TEXTO_NORMAL],
    ['textMuted', 'backgroundCard', 'texto atenuado en tarjetas (DriverCard, RaceCard)', MINIMO_TEXTO_NORMAL],
    ['textMuted', 'backgroundDark', 'etiqueta de pestaña inactiva (tabBarInactiveTintColor)', MINIMO_TEXTO_NORMAL],
    ['primaryRed', 'backgroundCard', 'pestaña activa y "Reintentar" del Calendario; país en CountdownTimer', MINIMO_TEXTO_NORMAL],
    ['primaryRed', 'backgroundDark', 'etiqueta de pestaña activa (tabBarActiveTintColor)', MINIMO_TEXTO_NORMAL],
    ['accentCyan', 'background', 'texto de acento cian', MINIMO_TEXTO_NORMAL],
    ['accentCyan', 'backgroundCard', 'texto de acento cian en tarjetas', MINIMO_TEXTO_NORMAL],
    ['accentOrange', 'background', 'texto de acento naranja', MINIMO_TEXTO_NORMAL],
    ['accentYellow', 'backgroundCard', 'puntos y estrellas en tarjetas', MINIMO_TEXTO_NORMAL],
    ['#000000', 'accentCyan', 'texto de botones cian (Reintentar de Inicio)', MINIMO_TEXTO_NORMAL],
    ['#FFE28A', '#332712', 'texto de OfflineBanner', MINIMO_TEXTO_NORMAL],
    ['#FFB020', '#332712', 'ícono de OfflineBanner (componente gráfico)', MINIMO_TEXTO_GRANDE_O_UI],
    ['statusFinished', 'background', 'indicador de estado finalizado (componente gráfico; token sin uso actual)', MINIMO_TEXTO_GRANDE_O_UI],
    ['statusUpcoming', 'background', 'indicador de estado programado (componente gráfico)', MINIMO_TEXTO_GRANDE_O_UI],
    ['statusLive', 'background', 'indicador de estado en vivo (componente gráfico)', MINIMO_TEXTO_GRANDE_O_UI],
    ['accentBlue', 'backgroundCard', 'ícono del Calendario en Más (componente gráfico)', MINIMO_TEXTO_GRANDE_O_UI],
  ];

  test('la implementación de contraste reproduce valores de referencia de WCAG', () => {
    expect(razonContraste('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(razonContraste('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(razonContraste('#FFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  // DEFECTO: textMuted (#6B7280) y primaryRed (#E10600) no alcanzan 4.5:1 sobre los fondos oscuros en que se usan como texto; statusFinished (#4B5563) no alcanza 3:1.
  test.each(PARES)('%s sobre %s (%s) alcanza %s:1', (frente, fondo, _uso, minimo) => {
    const razon = razonContraste(color(frente), color(fondo));
    expect(Math.round(razon * 100) / 100).toBeGreaterThanOrEqual(minimo);
  });
});
