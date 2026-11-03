import React from 'react';
import { Alert, Animated, ScrollView, View } from 'react-native';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../../src/screens/HomeScreen';
import CalendarioScreen from '../../src/screens/CalendarioScreen';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import ComparadorScreen from '../../src/screens/ComparadorScreen';
import DetalleGPScreen from '../../src/screens/DetalleGPScreen';
import HistorialWebScreen from '../../src/screens/HistorialWebScreen';
import FavoritosScreen from '../../src/screens/FavoritosScreen';
import PerfilPilotoScreen from '../../src/screens/PerfilPilotoScreen';
import LiveScreen from '../../src/screens/LiveScreen';
import F1DataService from '../../src/services/F1DataService';
import OpenF1Client from '../../src/services/OpenF1Client';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { calendarRace } from '../fixtures/calendar';
import { raceResponse, okResponse, silverstone } from '../fixtures/jolpica';
import { standingsResponse, driverStanding, constructorStanding, okStandings } from '../fixtures/jolpicaStandings';
import {
  AHORA, CLAVES, crearServidor, diferido, navegacionFalsa, reiniciarServicios, animacionInmediata,
  sesionOpenF1, meetingOpenF1, filaResultado, pilotoOpenF1, respuestaHttp,
} from './helpers/entorno';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

const fetchOriginal = global.fetch;
let erroresConsola;

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(CLAVES.escuderias, '[]');
  jest.spyOn(Date, 'now').mockReturnValue(AHORA);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  erroresConsola = jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(animacionInmediata());
  reiniciarServicios({ F1DataService, OpenF1Client });
  global.fetch = crearServidor();
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = fetchOriginal; });

const refrescar = () => screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh();
const vaciarMicrotareas = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const fetchPendiente = () => {
  const pendientes = [];
  const fetch = jest.fn(() => { const d = diferido(); pendientes.push(d); return d.promesa; });
  return { fetch, pendientes };
};

describe('Transiciones carga → datos → error', () => {
  test('Inicio: al reintentar tras un error muestra solo la carga, sin el error ni un GP anterior, y luego los datos', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new TypeError('Network request failed'));
    render(<HomeScreen navigation={navegacionFalsa()} />);
    expect(screen.getByText('Consultando próximo Gran Premio...')).toBeTruthy();
    await screen.findByText('No se pudo consultar el próximo Gran Premio.');
    expect(screen.queryByText('Consultando próximo Gran Premio...')).toBeNull();

    const pendiente = diferido();
    global.fetch = jest.fn(() => pendiente.promesa);
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByText('Consultando próximo Gran Premio...')).toBeTruthy();
    expect(screen.queryByText('No se pudo consultar el próximo Gran Premio.')).toBeNull();
    expect(screen.queryByText('GP de prueba')).toBeNull();

    await act(async () => { pendiente.resolver(okResponse(raceResponse([calendarRace()]))); });
    expect(await screen.findByText('GP de prueba')).toBeTruthy();
    expect(screen.queryByText('No se pudo consultar el próximo Gran Premio.')).toBeNull();
    expect(screen.queryByText('Consultando próximo Gran Premio...')).toBeNull();
  });

  test('Calendario: tras un fallo sin copia, el reintento muestra la carga sin el error y nunca recupera el calendario previo', async () => {
    render(<CalendarioScreen navigation={navegacionFalsa()} />);
    await screen.findByText('GP de prueba');
    await AsyncStorage.removeItem(`${CLAVES.cache}jolpica_v1_calendar_2026`);
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await act(async () => { await refrescar(); });
    expect(screen.getByText('No se pudo cargar el calendario.')).toBeTruthy();
    expect(screen.queryByText('GP de prueba')).toBeNull();

    const pendiente = diferido();
    global.fetch = jest.fn(() => pendiente.promesa);
    fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(screen.getByText('Cargando calendario de carreras...')).toBeTruthy();
    expect(screen.queryByText('No se pudo cargar el calendario.')).toBeNull();
    await act(async () => { pendiente.resolver(okResponse(raceResponse([calendarRace({ raceName: 'GP actualizado' })]))); });
    expect(await screen.findByText('GP actualizado')).toBeTruthy();
    expect(screen.queryByText('GP de prueba')).toBeNull();
  });

  test('Clasificación: un reintento fallido sin copia retira la tabla anterior y el siguiente éxito limpia los errores', async () => {
    render(<ClasificacionScreen navigation={navegacionFalsa()} />);
    await screen.findByText('A. PRUEBA');
    await AsyncStorage.clear();
    global.fetch = jest.fn(async () => respuestaHttp(503));
    fireEvent.press(screen.getByText('Reintentar / Actualizar'));
    await screen.findByText('Pilotos: No se pudo actualizar (Jolpica HTTP 503).');
    expect(screen.queryByText('A. PRUEBA')).toBeNull();
    expect(screen.queryByText('125.5')).toBeNull();

    global.fetch = crearServidor();
    fireEvent.press(screen.getByText('Reintentar / Actualizar'));
    await screen.findByText('A. PRUEBA');
    expect(screen.queryByText(/No se pudo actualizar/)).toBeNull();
  });

  test('Comparador: un reintento fallido sin copia retira la pareja anterior y el siguiente éxito limpia el error', async () => {
    render(<ComparadorScreen navigation={navegacionFalsa()} route={{ params: {} }} />);
    await screen.findByText('PRUEBA');
    await AsyncStorage.clear();
    global.fetch = jest.fn(async () => respuestaHttp(503));
    fireEvent.press(screen.getByText('Reintentar / Actualizar'));
    await screen.findByText(/No se pudo actualizar la comparación: Jolpica HTTP 503/);
    expect(screen.queryByText('PRUEBA')).toBeNull();
    expect(screen.getByText('Se necesitan al menos dos pilotos con clasificación disponible para comparar.')).toBeTruthy();

    global.fetch = crearServidor();
    fireEvent.press(screen.getByText('Reintentar / Actualizar'));
    await screen.findByText('PRUEBA');
    expect(screen.queryByText(/No se pudo actualizar la comparación/)).toBeNull();
  });

  test('Favoritos: el aviso de consulta fallida desaparece al recuperar el foco con éxito y resuelve la identidad', async () => {
    await LocalStorageManager.guardarFavorito('piloto_prueba');
    global.fetch = jest.fn(async () => respuestaHttp(503));
    const nav = navegacionFalsa();
    render(<FavoritosScreen navigation={nav} />);
    await screen.findByText('No se pudo actualizar la información de clasificación. Tus favoritos guardados se conservan.');
    expect(screen.getByText('Piloto guardado (piloto_prueba)')).toBeTruthy();

    global.fetch = crearServidor();
    await act(async () => { await nav.emitir('focus'); });
    expect(screen.getByText('Ana Prueba')).toBeTruthy();
    expect(screen.queryByText(/No se pudo actualizar la información de clasificación/)).toBeNull();
  });

  test('Detalle GP: tras un error de resultados, reabrir la sesión muestra la carga sin el error y luego las filas', async () => {
    global.fetch = crearServidor({ '/session_result?session_key=7782': () => Promise.resolve(respuestaHttp(500)) });
    render(<DetalleGPScreen route={{ params: { meeting: meetingOpenF1() } }} navigation={navegacionFalsa()} />);
    fireEvent.press(screen.getByText('Carrera'));
    await screen.findByText(/Resultados no disponibles/);

    global.fetch = crearServidor();
    fireEvent.press(screen.getByRole('button', { name: 'Cerrar información de sesión' }));
    fireEvent.press(screen.getByText('Carrera'));
    expect(screen.getByText('Consultando resultados publicados...')).toBeTruthy();
    expect(screen.queryByText(/Resultados no disponibles/)).toBeNull();
    expect(await screen.findByText('Piloto de ensayo')).toBeTruthy();
    expect(screen.queryByText(/Resultados no disponibles/)).toBeNull();
  });
});

describe('Desmontaje con consultas pendientes', () => {
  const PANTALLAS = [
    ['Inicio', () => <HomeScreen navigation={navegacionFalsa()} />],
    ['Calendario', () => <CalendarioScreen navigation={navegacionFalsa()} />],
    ['Clasificación', () => <ClasificacionScreen navigation={navegacionFalsa()} />],
    ['Comparador', () => <ComparadorScreen navigation={navegacionFalsa()} route={{ params: {} }} />],
    ['Historial', () => <HistorialWebScreen navigation={navegacionFalsa()} />],
    ['Favoritos', () => <FavoritosScreen navigation={navegacionFalsa()} />],
    ['En Vivo', () => <LiveScreen navigation={navegacionFalsa()} />],
  ];
  const DESENLACES = [
    ['se resuelve', async (pendiente, url) => pendiente.resolver(await crearServidor()(url))],
    ['se rechaza', async pendiente => pendiente.rechazar(new TypeError('Network request failed'))],
  ];
  const CASOS = PANTALLAS.flatMap(([nombre, crear]) => DESENLACES.map(([desenlace, terminar]) => [nombre, desenlace, crear, terminar]));

  test.each(CASOS)('%s: desmontar mientras la consulta está pendiente y luego %s no genera errores de React', async (_nombre, _desenlace, crear, terminar) => {
    const { fetch, pendientes } = fetchPendiente();
    global.fetch = fetch;
    const vista = render(crear());
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    vista.unmount();
    await act(async () => {
      for (let i = 0; i < pendientes.length; i += 1) await terminar(pendientes[i], fetch.mock.calls[i][0]);
    });
    await vaciarMicrotareas();
    expect(erroresConsola.mock.calls).toEqual([]);
  });

  test('Detalle GP: cerrar la pantalla con resultados pendientes no genera errores de React', async () => {
    const { fetch, pendientes } = fetchPendiente();
    global.fetch = fetch;
    const vista = render(<DetalleGPScreen route={{ params: { meeting: meetingOpenF1() } }} navigation={navegacionFalsa()} />);
    fireEvent.press(screen.getByText('Carrera'));
    await waitFor(() => expect(pendientes).toHaveLength(1));
    vista.unmount();
    await act(async () => { pendientes[0].resolver(okResponse([filaResultado()])); });
    await vaciarMicrotareas();
    expect(erroresConsola.mock.calls).toEqual([]);
  });

  test('Perfil del piloto: desmontar con la lectura de favoritos pendiente no genera errores de React', async () => {
    const lectura = diferido();
    jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => lectura.promesa);
    const vista = render(<PerfilPilotoScreen route={{ params: { driver: { idPiloto: 81, driverId: 'piloto_prueba', nombre: 'Ana', apellido: 'Prueba', source: 'jolpica' } } }} navigation={navegacionFalsa()} />);
    vista.unmount();
    await act(async () => { lectura.resolver('[{"idPiloto":81,"driverId":"piloto_prueba"}]'); });
    await vaciarMicrotareas();
    expect(erroresConsola.mock.calls).toEqual([]);
  });
});

describe('Solicitudes superpuestas: prevalece la última', () => {
  test.each([
    ['Inicio', HomeScreen],
    ['Calendario', CalendarioScreen],
  ])('%s: si dos actualizaciones se solapan, la respuesta tardía de la primera no reemplaza a la segunda', async (_nombre, Pantalla) => {
    render(<Pantalla navigation={navegacionFalsa()} />);
    await screen.findByText('GP de prueba');
    await AsyncStorage.removeItem(`${CLAVES.cache}jolpica_v1_calendar_2026`);
    const { fetch, pendientes } = fetchPendiente();
    global.fetch = fetch;
    let primera;
    let segunda;
    await act(async () => { primera = refrescar(); });
    await waitFor(() => expect(pendientes).toHaveLength(1));
    await act(async () => { segunda = refrescar(); });
    await waitFor(() => expect(pendientes).toHaveLength(2));

    await act(async () => {
      pendientes[1].resolver(okResponse(raceResponse([calendarRace({ raceName: 'GP más reciente' })])));
      await segunda;
    });
    expect(screen.getByText('GP más reciente')).toBeTruthy();
    await act(async () => {
      pendientes[0].resolver(okResponse(raceResponse([calendarRace({ raceName: 'GP obsoleto' })])));
      await primera;
    });
    expect(screen.getByText('GP más reciente')).toBeTruthy();
    expect(screen.queryByText('GP obsoleto')).toBeNull();
    expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(false);
  });

  const piloto2025 = driverStanding({ Driver: { driverId: 'piloto_antiguo', permanentNumber: '7', givenName: 'Carla', familyName: 'Antigua', code: 'ANT' } });
  function servidorConTemporadaLenta() {
    const lentas = [];
    const lenta = () => { const d = diferido(); lentas.push(d); return d.promesa; };
    const fetch = crearServidor({
      '/2025/driverstandings.json?limit=100': lenta,
      '/2025/constructorstandings.json?limit=100': lenta,
    });
    const resolverLentas = () => {
      lentas[0].resolver(okStandings(standingsResponse('driver', [piloto2025], { season: '2025' })));
      lentas[1].resolver(okStandings(standingsResponse('constructor', [constructorStanding()], { season: '2025' })));
    };
    return { fetch, lentas, resolverLentas };
  }

  test('Clasificación: al cambiar de temporada, la respuesta tardía de la anterior no reemplaza a la nueva', async () => {
    const { fetch, lentas, resolverLentas } = servidorConTemporadaLenta();
    global.fetch = fetch;
    const nav = navegacionFalsa();
    const vista = render(<ClasificacionScreen navigation={nav} route={{ params: { season: '2025' } }} />);
    await waitFor(() => expect(lentas).toHaveLength(2));
    vista.rerender(<ClasificacionScreen navigation={nav} route={{ params: { season: '2026' } }} />);
    await screen.findByText('A. PRUEBA');
    await act(async () => { resolverLentas(); });
    await vaciarMicrotareas();
    expect(screen.getByText('CAMPEONATO MUNDIAL 2026')).toBeTruthy();
    expect(screen.getByText('A. PRUEBA')).toBeTruthy();
    expect(screen.queryByText('C. ANTIGUA')).toBeNull();
  });

  test('Comparador: al cambiar de temporada, la respuesta tardía de la anterior no reemplaza a la nueva', async () => {
    const { fetch, lentas, resolverLentas } = servidorConTemporadaLenta();
    global.fetch = fetch;
    const nav = navegacionFalsa();
    const vista = render(<ComparadorScreen navigation={nav} route={{ params: { season: '2025' } }} />);
    await waitFor(() => expect(lentas).toHaveLength(2));
    vista.rerender(<ComparadorScreen navigation={nav} route={{ params: { season: '2026' } }} />);
    await screen.findByText('PRUEBA');
    await act(async () => { resolverLentas(); });
    await vaciarMicrotareas();
    expect(screen.getByText('TEMPORADA 2026 • CARA A CARA')).toBeTruthy();
    expect(screen.getByText('PRUEBA')).toBeTruthy();
    expect(screen.queryByText('ANTIGUA')).toBeNull();
  });

  test('Historial: la respuesta tardía de 1950 no reemplaza el error de la temporada elegida después', async () => {
    const lenta = diferido();
    global.fetch = crearServidor({ '/1950.json': () => lenta.promesa });
    render(<HistorialWebScreen navigation={navegacionFalsa()} />);
    await screen.findByText('Italian Grand Prix');
    const elegir = async anio => {
      fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada' }));
      fireEvent.press(await screen.findByRole('button', { name: `Temporada ${anio}` }));
    };
    await elegir('1950');
    await screen.findByText('Cargando carreras de 1950...');
    await AsyncStorage.removeItem(`${CLAVES.cache}jolpica_v1_history_2024`);
    global.fetch = crearServidor({ '/1950.json': () => lenta.promesa, '/2024.json': () => Promise.resolve(respuestaHttp(503)) });
    await elegir('2024');
    await screen.findByText('No se pudieron cargar las carreras de 2024.');

    await act(async () => { lenta.resolver(okResponse(raceResponse([silverstone]))); });
    await vaciarMicrotareas();
    expect(screen.getByText('No se pudieron cargar las carreras de 2024.')).toBeTruthy();
    expect(screen.getByText('Temporada 2024')).toBeTruthy();
    expect(screen.queryByText('British Grand Prix')).toBeNull();
  });

  test('Detalle GP: al cambiar de sesión, la respuesta tardía de la anterior no aparece bajo la nueva', async () => {
    const lentaA = diferido();
    global.fetch = crearServidor({
      '/session_result?session_key=7782': () => lentaA.promesa,
      '/session_result?session_key=7783': [filaResultado({ session_key: 7783, driver_number: 82 })],
      '/drivers?session_key=7783': [pilotoOpenF1({ session_key: 7783, driver_number: 82, full_name: 'Piloto de la carrera' })],
    });
    const sesiones = [
      sesionOpenF1({ idSesion: 1, session_key: 7782, tipo: 'Clasificación' }),
      sesionOpenF1({ idSesion: 2, session_key: 7783, tipo: 'Carrera' }),
    ];
    render(<DetalleGPScreen route={{ params: { meeting: meetingOpenF1(sesiones) } }} navigation={navegacionFalsa()} />);
    fireEvent.press(screen.getByText('Clasificación'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('session_key=7782'), expect.anything()));
    fireEvent.press(screen.getByText('Carrera'));
    await screen.findByText('Piloto de la carrera');

    await act(async () => { lentaA.resolver(okResponse([filaResultado()])); });
    await vaciarMicrotareas();
    expect(screen.getByText('RESULTADOS: Carrera')).toBeTruthy();
    expect(screen.getByText('Piloto de la carrera')).toBeTruthy();
    expect(screen.queryByText(/Piloto de ensayo|Piloto #81/)).toBeNull();
  });
});

describe('Coherencia de favoritos entre pantallas', () => {
  test('marcar en Perfil del piloto actualiza Clasificación y Favoritos montados; quitar en Favoritos actualiza Perfil', async () => {
    // Un único árbol (como el Stack real): RNTL ignora eventos sobre raíces de render anteriores.
    const navClasificacion = navegacionFalsa();
    const navFavoritos = navegacionFalsa();
    const navPerfil = navegacionFalsa();
    const arbolCon = parametrosPerfil => (<>
      <View testID="clasificacion"><ClasificacionScreen navigation={navClasificacion} /></View>
      <View testID="favoritos"><FavoritosScreen navigation={navFavoritos} /></View>
      {parametrosPerfil && <View testID="perfil"><PerfilPilotoScreen route={{ params: parametrosPerfil }} navigation={navPerfil} /></View>}
    </>);
    const arbol = render(arbolCon(null));
    const clasificacion = within(arbol.getByTestId('clasificacion'));
    const favoritos = within(arbol.getByTestId('favoritos'));
    await clasificacion.findByText('A. PRUEBA');
    await waitFor(() => expect(favoritos.queryByText('Cargando favoritos...')).toBeNull());

    fireEvent.press(clasificacion.getByText('A. PRUEBA'));
    const [, params] = navClasificacion.navigate.mock.calls.find(([ruta]) => ruta === 'PerfilPiloto');
    arbol.rerender(arbolCon(params));
    const perfil = within(arbol.getByTestId('perfil'));
    fireEvent.press(await perfil.findByRole('button', { name: 'Añadir piloto a favoritos' }));

    await perfil.findByRole('button', { name: 'Quitar piloto de favoritos' });
    await waitFor(() => expect(clasificacion.getAllByTestId('icon-star')).toHaveLength(2));
    await favoritos.findByText('Ana Prueba');

    fireEvent.press(favoritos.getByLabelText('Quitar piloto favorito Ana Prueba'));
    await perfil.findByRole('button', { name: 'Añadir piloto a favoritos' });
    await waitFor(() => expect(clasificacion.queryAllByTestId('icon-star')).toHaveLength(0));
    expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  });

  test('marcar una escudería en Clasificación la muestra en Favoritos ya montado sin evento focus', async () => {
    const arbol = render(<>
      <View testID="clasificacion"><ClasificacionScreen navigation={navegacionFalsa()} /></View>
      <View testID="favoritos"><FavoritosScreen navigation={navegacionFalsa()} /></View>
    </>);
    const clasificacion = within(arbol.getByTestId('clasificacion'));
    const favoritos = within(arbol.getByTestId('favoritos'));
    await clasificacion.findByText('A. PRUEBA');
    await favoritos.findByText('No tienes escuderías favoritas guardadas.');
    fireEvent.press(clasificacion.getByText('CONSTRUCTORES'));
    fireEvent.press(clasificacion.getByLabelText('Marcar escudería favorita Equipo de prueba'));
    expect(await favoritos.findByLabelText('Quitar escudería favorita Equipo de prueba')).toBeTruthy();
    expect(favoritos.queryByText('No tienes escuderías favoritas guardadas.')).toBeNull();
    expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual(['equipo_prueba']);
  });

  // DEFECTO: la torre de En Vivo marca a Russell como favorito ("★" y "(FAVORITO)") con datos fijos, aunque el usuario no lo haya guardado.
  test('En Vivo no marca como favorito a un piloto que el usuario no guardó', async () => {
    await LocalStorageManager.guardarFavorito('piloto_prueba');
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    render(<LiveScreen navigation={navegacionFalsa()} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await vaciarMicrotareas();
    const marcados = screen.queryAllByTestId('icon-star');
    fireEvent.press(screen.getByText('RADIO'));
    expect({ estrellas: marcados.length, etiquetaFavorito: screen.queryAllByText(/\(FAVORITO\)/).length })
      .toEqual({ estrellas: 0, etiquetaFavorito: 0 });
  });
});
