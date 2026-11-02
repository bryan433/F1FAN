import React from 'react';
import { Alert, Animated, View } from 'react-native';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../../App';
import MasScreen from '../../src/screens/MasScreen';
import HomeScreen from '../../src/screens/HomeScreen';
import CalendarioScreen from '../../src/screens/CalendarioScreen';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import ComparadorScreen from '../../src/screens/ComparadorScreen';
import DetalleGPScreen from '../../src/screens/DetalleGPScreen';
import HistorialWebScreen from '../../src/screens/HistorialWebScreen';
import FavoritosScreen from '../../src/screens/FavoritosScreen';
import LiveScreen from '../../src/screens/LiveScreen';
import PerfilScreen from '../../src/screens/PerfilScreen';
import F1DataService from '../../src/services/F1DataService';
import OpenF1Client from '../../src/services/OpenF1Client';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { calendarRace } from '../fixtures/calendar';
import {
  AHORA, CLAVES, MODOS_FALLO, crearServidor, servidorConFallo, navegacionFalsa, reiniciarServicios,
  animacionInmediata, meetingOpenF1, respuestaHttp, errorAbortado,
} from './helpers/entorno';
import { textoAccesible } from './helpers/arbolAccesible';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});
// Más se sustituye por un componente controlable para provocar un fallo de render dentro de App.
jest.mock('../../src/screens/MasScreen', () => ({ __esModule: true, default: jest.fn(() => null) }));

const DATOS_FICTICIOS = /Russell|RUSSELL|Verstappen|VERSTAPPEN|Norris|NORRIS|Leclerc|Piastri|Singapur|Marina Bay/;
const AVISO_CONEXION_O_CACHE = /sin conexión|verificar la conexión|última copia guardada|datos guardados en caché|caché local/i;
const TEXTO_TECNICO = /Network request failed|Unexpected token|Aborted|TypeError|SyntaxError/;

const fetchOriginal = global.fetch;
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(CLAVES.escuderias, '[]');
  jest.spyOn(Date, 'now').mockReturnValue(AHORA);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(animacionInmediata());
  reiniciarServicios({ F1DataService, OpenF1Client });
  MasScreen.mockImplementation(() => null);
  global.fetch = crearServidor();
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = fetchOriginal; });

const vaciarMicrotareas = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });

describe('Fallos de red y de contenido por pantalla', () => {
  const PANTALLAS = [
    { nombre: 'Inicio', crear: () => <HomeScreen navigation={navegacionFalsa()} />, error: 'No se pudo consultar el próximo Gran Premio.', reintentar: 'Reintentar', datos: 'GP de prueba' },
    { nombre: 'Calendario', crear: () => <CalendarioScreen navigation={navegacionFalsa()} />, error: 'No se pudo cargar el calendario.', reintentar: 'Reintentar', datos: 'GP de prueba' },
    { nombre: 'Clasificación', crear: () => <ClasificacionScreen navigation={navegacionFalsa()} />, error: /^Pilotos: No se pudo actualizar/, reintentar: 'Reintentar / Actualizar', datos: 'A. PRUEBA' },
    { nombre: 'Comparador', crear: () => <ComparadorScreen navigation={navegacionFalsa()} route={{ params: {} }} />, error: /^No se pudo actualizar la comparación/, reintentar: 'Reintentar / Actualizar', datos: 'PRUEBA' },
    { nombre: 'Historial', crear: () => <HistorialWebScreen navigation={navegacionFalsa()} />, error: 'No se pudieron cargar las temporadas de Jolpica.', reintentar: 'Reintentar', datos: 'Italian Grand Prix' },
  ];
  const CASOS = PANTALLAS.flatMap(conf => MODOS_FALLO.map(([modo, falla]) => [conf.nombre, modo, conf, falla]));

  test.each(CASOS)('%s ante %s: no falla, informa en español, no inventa datos ni conexión y se recupera al reintentar', async (_nombre, _modo, conf, falla) => {
    const { fetch, estado } = servidorConFallo(falla);
    global.fetch = fetch;
    render(conf.crear());
    expect(await screen.findByText(conf.error)).toBeTruthy();
    expect(screen.queryByText(DATOS_FICTICIOS)).toBeNull();
    expect(screen.queryByText(AVISO_CONEXION_O_CACHE)).toBeNull();
    expect(screen.queryByText(conf.datos)).toBeNull();

    const consultasPrevias = fetch.mock.calls.length;
    estado.fallando = false;
    fireEvent.press(screen.getByText(conf.reintentar));
    expect(await screen.findByText(conf.datos)).toBeTruthy();
    expect(fetch.mock.calls.length).toBeGreaterThan(consultasPrevias);
    expect(screen.queryByText(conf.error)).toBeNull();
  });

  test.each(MODOS_FALLO)('Favoritos ante %s: conserva la identidad guardada, avisa en español y se recupera al volver a enfocar', async (_modo, falla) => {
    await LocalStorageManager.guardarFavorito(81, { driverId: 'piloto_prueba', nombre: 'Ana', apellido: 'Prueba', numero: 81 });
    const { fetch, estado } = servidorConFallo(falla);
    global.fetch = fetch;
    const nav = navegacionFalsa();
    render(<FavoritosScreen navigation={nav} />);
    await screen.findByText('No se pudo actualizar la información de clasificación. Tus favoritos guardados se conservan.');
    expect(screen.getByText('Ana Prueba')).toBeTruthy();
    expect(screen.getByText('Guardado; información actual no disponible')).toBeTruthy();
    expect(screen.queryByText(/\d+ pts|George Russell/)).toBeNull();

    estado.fallando = false;
    await act(async () => { await nav.emitir('focus'); });
    expect(screen.queryByText(/No se pudo actualizar la información de clasificación/)).toBeNull();
    expect(screen.getByText('Equipo de prueba')).toBeTruthy();
  });

  test.each(MODOS_FALLO)('Detalle GP ante %s: anuncia el error de resultados sin filas inventadas y se recupera al reabrir la sesión', async (_modo, falla) => {
    const { fetch, estado } = servidorConFallo(falla, { rutasQueFallan: ruta => ruta.startsWith('/session_result') });
    global.fetch = fetch;
    render(<DetalleGPScreen route={{ params: { meeting: meetingOpenF1() } }} navigation={navegacionFalsa()} />);
    fireEvent.press(screen.getByText('Carrera'));
    const mensaje = await screen.findByText(/^Resultados no disponibles: /);
    expect(mensaje.props.accessibilityRole).toBe('alert');
    expect(screen.queryByText(/Piloto de ensayo|LÍDER|Piloto #/)).toBeNull();

    estado.fallando = false;
    fireEvent.press(screen.getByRole('button', { name: 'Cerrar información de sesión' }));
    fireEvent.press(screen.getByText('Carrera'));
    expect(await screen.findByText('Piloto de ensayo')).toBeTruthy();
  });

  test.each(MODOS_FALLO)('En Vivo ante %s: mantiene la advertencia de demostración y no afirma mostrar una caché', async (_modo, falla) => {
    global.fetch = jest.fn(falla);
    render(<LiveScreen navigation={navegacionFalsa()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await vaciarMicrotareas();
    expect(screen.getByText(/^DATOS DE DEMOSTRACIÓN: tiempos, posiciones, telemetría y radio simulados/)).toBeTruthy();
    expect(screen.getByText('DEMOSTRACIÓN • MARINA BAY')).toBeTruthy();
    expect(screen.queryByText(/Modo sin conexión|datos guardados en caché/)).toBeNull();
  });

  test('Calendario: una consulta sin respuesta se cancela a los 10 s y muestra el error con reintento', async () => {
    jest.useFakeTimers({ now: AHORA });
    try {
      global.fetch = jest.fn((_url, { signal }) => new Promise((_resolver, rechazar) => {
        signal.addEventListener('abort', () => rechazar(errorAbortado()));
      }));
      render(<CalendarioScreen navigation={navegacionFalsa()} />);
      await act(async () => { await jest.advanceTimersByTimeAsync(0); });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      await act(async () => { await jest.advanceTimersByTimeAsync(9_999); });
      expect(screen.getByText('Cargando calendario de carreras...')).toBeTruthy();
      await act(async () => { await jest.advanceTimersByTimeAsync(1); });
      expect(screen.getByText('No se pudo cargar el calendario.')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('Controles de reintento accesibles', () => {
  const conFallo = async (crear, error, preparar) => {
    global.fetch = jest.fn(async () => respuestaHttp(503));
    render(crear());
    if (preparar) preparar();
    await screen.findByText(error);
  };

  test.each([
    ['Inicio', () => <HomeScreen navigation={navegacionFalsa()} />, 'No se pudo consultar el próximo Gran Premio.'],
    ['Calendario', () => <CalendarioScreen navigation={navegacionFalsa()} />, 'No se pudo cargar el calendario.'],
    ['Historial', () => <HistorialWebScreen navigation={navegacionFalsa()} />, 'No se pudieron cargar las temporadas de Jolpica.'],
  ])('%s: tras un error ofrece un reintento con rol button y nombre accesible', async (_nombre, crear, error) => {
    await conFallo(crear, error);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  // DEFECTO: el botón "Reintentar / Actualizar" de Clasificación y Comparador es un TouchableOpacity sin accessibilityRole.
  test.each([
    ['Clasificación', () => <ClasificacionScreen navigation={navegacionFalsa()} />, /^Pilotos: No se pudo actualizar/],
    ['Comparador', () => <ComparadorScreen navigation={navegacionFalsa()} route={{ params: {} }} />, /^No se pudo actualizar la comparación/],
  ])('%s: tras un error ofrece un reintento con rol button y nombre accesible', async (_nombre, crear, error) => {
    await conFallo(crear, error);
    expect(screen.queryAllByRole('button', { name: /Reintentar/ })).toHaveLength(1);
  });

  // DEFECTO: Favoritos (aviso de consulta) y Detalle GP (resultados) muestran el error sin ningún control de reintento.
  test.each([
    ['Favoritos', () => <FavoritosScreen navigation={navegacionFalsa()} />, 'No se pudo actualizar la información de clasificación. Tus favoritos guardados se conservan.', null],
    ['Detalle GP (resultados)', () => <DetalleGPScreen route={{ params: { meeting: meetingOpenF1() } }} navigation={navegacionFalsa()} />, /^Resultados no disponibles/, () => fireEvent.press(screen.getByText('Carrera'))],
  ])('%s: tras un error ofrece un reintento con rol button y nombre accesible', async (_nombre, crear, error, preparar) => {
    await conFallo(crear, error, preparar);
    expect(screen.queryAllByRole('button', { name: /Reintentar|Volver a intentar|Actualizar/ })).toHaveLength(1);
  });

  // DEFECTO: Clasificación, Comparador y Detalle GP muestran al usuario el mensaje técnico de la excepción (en inglés).
  test.each([
    ['Clasificación', () => <ClasificacionScreen navigation={navegacionFalsa()} />, /^Pilotos: No se pudo actualizar/, null],
    ['Comparador', () => <ComparadorScreen navigation={navegacionFalsa()} route={{ params: {} }} />, /^No se pudo actualizar la comparación/, null],
    ['Detalle GP', () => <DetalleGPScreen route={{ params: { meeting: meetingOpenF1() } }} navigation={navegacionFalsa()} />, /^Resultados no disponibles/, () => fireEvent.press(screen.getByText('Carrera'))],
  ])('%s: un fallo de red no expone textos técnicos en inglés al usuario', async (_nombre, crear, error, preparar) => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    render(crear());
    if (preparar) preparar();
    await screen.findByText(error);
    expect(screen.queryAllByText(TEXTO_TECNICO).map(textoAccesible)).toEqual([]);
  });
});

describe('Avisos de conexión y copias guardadas', () => {
  test('Inicio con una copia vencida y HTTP 503 muestra la copia con el aviso de Jolpica, sin afirmar falta de conexión', async () => {
    Date.now.mockReturnValue(AHORA - 2 * 3_600_000);
    await LocalStorageManager.guardarCache('jolpica_v1_calendar_2026', [calendarRace()]);
    Date.now.mockReturnValue(AHORA);
    global.fetch = jest.fn(async () => respuestaHttp(503));
    render(<HomeScreen navigation={navegacionFalsa()} />);
    expect(await screen.findByText('GP de prueba')).toBeTruthy();
    expect(screen.getByText('No se pudo actualizar con Jolpica. Mostrando la última copia guardada.')).toBeTruthy();
    expect(screen.queryByText(/sin conexión|verificar la conexión/i)).toBeNull();
  });

  // DEFECTO: F1DataService.getCalendar activa el modo sin conexión ante cualquier error (también HTTP 404) e Inicio, suscrito, anuncia un problema de conexión con datos vigentes.
  test('un HTTP 404 del Calendario no hace que Inicio, con datos vigentes, anuncie un problema de conexión', async () => {
    // Raíz única: así las consultas abarcan la pantalla añadida después con rerender.
    const inicio = <View testID="inicio"><HomeScreen navigation={navegacionFalsa()} /></View>;
    const arbol = render(<View>{inicio}</View>);
    await screen.findByText('GP de prueba');
    await AsyncStorage.removeItem(`${CLAVES.cache}jolpica_v1_calendar_2026`);
    global.fetch = jest.fn(async () => respuestaHttp(404));
    arbol.rerender(<View>{inicio}<View testID="calendario"><CalendarioScreen navigation={navegacionFalsa()} /></View></View>);
    await within(screen.getByTestId('calendario')).findByText('No se pudo cargar el calendario.');
    expect(within(screen.getByTestId('inicio')).queryAllByText(/conexión/i).map(textoAccesible)).toEqual([]);
  });
});

describe('Fallos de almacenamiento en favoritos y preferencias', () => {
  test('Clasificación: si falla guardar un piloto favorito avisa con Alert y no lo marca', async () => {
    render(<ClasificacionScreen navigation={navegacionFalsa()} />);
    await screen.findByText('A. PRUEBA');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Almacenamiento lleno'));
    fireEvent.press(screen.getAllByTestId('icon-star-outline')[0]);
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo guardar el favorito', expect.any(String)));
    expect(screen.queryAllByTestId('icon-star')).toHaveLength(0);
    expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  });

  // DEFECTO: handleToggleTeamFavorite ignora el fallo de toggleEscuderiaFavorita; no hay aviso al usuario.
  test('Clasificación: si falla guardar una escudería favorita avisa con Alert y no la marca', async () => {
    render(<ClasificacionScreen navigation={navegacionFalsa()} />);
    await screen.findByText('A. PRUEBA');
    fireEvent.press(screen.getByText('CONSTRUCTORES'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Almacenamiento lleno'));
    fireEvent.press(screen.getByLabelText('Marcar escudería favorita Equipo de prueba'));
    await vaciarMicrotareas();
    expect({ aviso: Alert.alert.mock.calls.length > 0, marcada: screen.queryAllByLabelText('Quitar escudería favorita Equipo de prueba').length })
      .toEqual({ aviso: true, marcada: 0 });
  });

  // DEFECTO: removeFavTeam ignora el fallo de toggleEscuderiaFavorita; la escudería sigue visible sin explicar por qué.
  test('Favoritos: si falla quitar una escudería avisa con Alert y la conserva', async () => {
    await AsyncStorage.setItem(CLAVES.escuderias, '["equipo_prueba"]');
    render(<FavoritosScreen navigation={navegacionFalsa()} />);
    await screen.findByText('Equipo de prueba');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Almacenamiento lleno'));
    fireEvent.press(screen.getByLabelText('Quitar escudería favorita Equipo de prueba'));
    await vaciarMicrotareas();
    expect({ aviso: Alert.alert.mock.calls.length > 0, conservada: screen.queryAllByText('Equipo de prueba').length > 0 })
      .toEqual({ aviso: true, conservada: true });
  });

  // DEFECTO: si la lectura de escuderías falla, LocalStorageManager devuelve ['mercedes','mclaren'] y Favoritos las presenta como elecciones del usuario.
  test('Favoritos: si falla la lectura de escuderías no presenta Mercedes ni McLaren como favoritas', async () => {
    const lecturaOriginal = AsyncStorage.getItem.getMockImplementation();
    AsyncStorage.getItem.mockImplementation((clave, ...resto) => (clave === CLAVES.escuderias
      ? Promise.reject(new Error('Lectura bloqueada')) : lecturaOriginal(clave, ...resto)));
    try {
      render(<FavoritosScreen navigation={navegacionFalsa()} />);
      await waitFor(() => expect(screen.queryByText('Cargando favoritos...')).toBeNull());
      expect(screen.queryAllByText(/^(Mercedes|McLaren)$/).map(textoAccesible)).toEqual([]);
    } finally {
      AsyncStorage.getItem.mockImplementation(lecturaOriginal);
    }
  });

  // DEFECTO: toggleAlert (Favoritos) y handleToggle (Perfil) cambian el interruptor aunque guardarAlertas/guardarAjustes devuelvan null; aparentan un éxito no persistido.
  test.each([
    ['Favoritos (alerta de boxes)', () => <FavoritosScreen navigation={navegacionFalsa()} />, async () => (await LocalStorageManager.obtenerAlertas()).boxes],
    ['Perfil (Modo Experto)', () => <PerfilScreen navigation={navegacionFalsa()} />, async () => (await LocalStorageManager.obtenerAjustes()).modoExperto],
  ])('%s: si falla guardar el interruptor, no aparenta el cambio y avisa al usuario', async (_nombre, crear, leerPersistido) => {
    render(crear());
    await vaciarMicrotareas();
    const inicial = screen.getAllByRole('switch')[0].props.value;
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Almacenamiento lleno'));
    fireEvent(screen.getAllByRole('switch')[0], 'valueChange', !inicial);
    await vaciarMicrotareas();
    expect({
      aviso: Alert.alert.mock.calls.length > 0,
      mostrado: screen.getAllByRole('switch')[0].props.value,
      persistido: await leerPersistido(),
    }).toEqual({ aviso: true, mostrado: inicial, persistido: inicial });
  });
});

describe('Contención de errores a nivel de aplicación', () => {
  // DEFECTO: App.js no define un Error Boundary; un fallo de render en cualquier pantalla desmonta toda la aplicación sin interfaz alternativa.
  test('un error de render en una pantalla queda contenido y muestra una interfaz alternativa en español', async () => {
    const errores = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    await screen.findByText('GP de prueba');
    MasScreen.mockImplementation(() => { throw new Error('Fallo de render simulado'); });
    let excepcion = null;
    try {
      fireEvent.press(screen.getByLabelText(/^Más, tab/));
    } catch (error) {
      excepcion = error.message;
    }
    await vaciarMicrotareas();
    // Sin un límite de errores React desmonta todo el árbol y las consultas posteriores lanzan.
    let arbolDesmontado = false;
    let interfazAlternativa = false;
    try {
      interfazAlternativa = screen.queryAllByText(/algo salió mal|error inesperado|no se pudo mostrar|volver a intentar/i).length > 0;
    } catch {
      arbolDesmontado = true;
    }
    expect({ excepcionNoContenida: excepcion, arbolDesmontado, interfazAlternativa })
      .toEqual({ excepcionNoContenida: null, arbolDesmontado: false, interfazAlternativa: true });
    errores.mockRestore();
  });
});
