import React from 'react';
import { Alert, Animated } from 'react-native';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import AppNavigator from '../../src/navigation/AppNavigator';
import F1DataService from '../../src/services/F1DataService';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { driverStanding, secondDriverStanding, constructorStanding, standingsResponse, okStandings } from '../fixtures/jolpicaStandings';
import { calendarRace } from '../fixtures/calendar';
import { raceResponse } from '../fixtures/jolpica';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

// Se ejecutan los servicios, modelos, caché y componentes reales; solo HTTP,
// AsyncStorage, el reloj y la animación nativa se controlan en las pruebas.
const originalFetch = global.fetch;
const years = ['2026', '2025', '2024', '1950'];
let clock;
let tables;

function seasonsResponse() {
  return { MRData: { total: String(years.length), SeasonTable: { Seasons: years.map(season => ({ season })) } } };
}

function respond(url) {
  if (url.includes('/seasons.json')) return Promise.resolve(okStandings(seasonsResponse()));
  if (url.endsWith('/2026.json')) return Promise.resolve(okStandings(raceResponse([calendarRace()])));
  const match = url.match(/\/(\d{4})\/(driver|constructor)standings.json/);
  if (!match) throw new Error(`Petición inesperada: ${url}`);
  const [, season, kind] = match;
  return Promise.resolve(okStandings(standingsResponse(kind, tables[season][kind], { season })));
}

function openClassification(route) {
  const navigation = { navigate: jest.fn(), addListener: jest.fn(() => jest.fn()) };
  return { ...render(<ClasificacionScreen navigation={navigation} route={route} />), navigation };
}

async function selectSeason(year) {
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada de clasificación' }));
  const options = within(screen.getByLabelText('Temporadas disponibles'));
  fireEvent.press(await options.findByRole('button', { name: `Temporada ${year}` }));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  clock = Date.parse('2026-11-12T12:00:00Z');
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(
    jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing,
  );
  F1DataService.isOfflineMode = false;
  F1DataService.listeners = [];
  tables = {
    '2026': { driver: [driverStanding(), secondDriverStanding()], constructor: [constructorStanding()] },
    '2025': {
      driver: [
        driverStanding({ points: '45', wins: '1', position: '3', positionText: '3',
          Constructors: [{ constructorId: 'equipo_prueba', name: 'Equipo histórico' }] }),
        driverStanding({ points: '30', wins: '0', position: '5', positionText: '5',
          Driver: { driverId: 'historica', permanentNumber: '83', givenName: 'Carla', familyName: 'Histórica', code: 'HIS' },
          Constructors: [{ constructorId: 'otro_equipo', name: 'Otro equipo histórico' }] }),
      ],
      constructor: [constructorStanding({ points: '80', wins: '1', position: '2', positionText: '2',
        Constructor: { constructorId: 'equipo_prueba', name: 'Equipo histórico' } })],
    },
    '2024': {
      driver: [driverStanding({ points: '4', wins: '0', Driver: { driverId: 'antiguo', givenName: 'Diego', familyName: 'Antiguo' } })],
      constructor: [constructorStanding({ points: '4', Constructor: { constructorId: 'antiguo', name: 'Equipo antiguo' } })],
    },
    '1950': { driver: [], constructor: [] },
  };
  global.fetch = jest.fn(respond);
});

afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test('inicia con el año de Santiago incluso cuando UTC ya corresponde al año siguiente', async () => {
  clock = Date.parse('2027-01-01T01:00:00Z'); // En Santiago aún es 31 de diciembre de 2026.
  const service = jest.spyOn(F1DataService, 'getChampionshipStandings');
  openClassification();
  expect(screen.getByText('CAMPEONATO MUNDIAL 2026')).toBeTruthy();
  expect(screen.getByText('Consultando posiciones...')).toBeTruthy();
  await screen.findByText('A. PRUEBA');
  expect(service).toHaveBeenCalledWith('2026');
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test.each(['2025', 2025])('respeta una temporada explícita válida de navegación: %s', async season => {
  const service = jest.spyOn(F1DataService, 'getChampionshipStandings');
  openClassification({ params: { season } });
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByText('CAMPEONATO MUNDIAL 2025')).toBeTruthy();
  expect(service).toHaveBeenCalledWith('2025');
  expect(global.fetch.mock.calls.every(([url]) => url.includes('/2025/'))).toBe(true);
});

test.each(['abc', '1949'])('descarta una temporada inicial inválida (%s) y usa el año actual', async season => {
  openClassification({ params: { season } });
  await screen.findByText('A. PRUEBA');
  expect(screen.getByText('CAMPEONATO MUNDIAL 2026')).toBeTruthy();
  expect(global.fetch.mock.calls.every(([url]) => url.includes('/2026/'))).toBe(true);
});

test('abre el selector reutilizado, consulta solo la lista publicada y permite cancelar sin recargar', async () => {
  const service = jest.spyOn(F1DataService, 'getChampionshipStandings');
  openClassification();
  await screen.findByText('A. PRUEBA');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada de clasificación' }));
  expect(screen.getByText('Cargando temporadas...')).toBeTruthy();
  const options = within(screen.getByLabelText('Temporadas disponibles'));
  await options.findByRole('button', { name: 'Temporada 1950' });
  expect(options.getAllByRole('button').map(node => node.props.accessibilityLabel))
    .toEqual(years.map(year => `Temporada ${year}`));
  expect(options.getByRole('button', { name: 'Temporada 2026' }).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  expect(screen.getByText('A. PRUEBA')).toBeTruthy();
  expect(service).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

test('cambiar a 2025 consulta ambos campeonatos, actualiza posiciones, puntos y equipos y conserva el año entre pestañas', async () => {
  const service = jest.spyOn(F1DataService, 'getChampionshipStandings');
  const { navigation } = openClassification();
  await screen.findByText('B. ENSAYO');
  await selectSeason('2025');
  expect(screen.getByText('CAMPEONATO MUNDIAL 2025')).toBeTruthy();
  expect(screen.getByText('Consultando posiciones...')).toBeTruthy();
  expect(screen.queryByText('B. ENSAYO')).toBeNull();
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByText('45')).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('Equipo histórico')).toBeTruthy();
  expect(screen.queryByText('125.5')).toBeNull();
  fireEvent.press(screen.getByText('A. PRUEBA'));
  expect(navigation.navigate).toHaveBeenCalledWith('PerfilPiloto', {
    driverId: 81, driver: expect.objectContaining({
      season: '2025', source: 'jolpica', driverId: 'piloto_prueba',
      puntos: 45, victorias: 1, posicionCampeonato: 3, nombreEscuderia: 'Equipo histórico',
    }),
  });
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.getByText('80')).toBeTruthy();
  expect(screen.getByText('2')).toBeTruthy();
  expect(screen.queryByText('225.5')).toBeNull();
  expect(screen.getByText('CAMPEONATO MUNDIAL 2025')).toBeTruthy();
  fireEvent.press(screen.getByText('PILOTOS'));
  expect(screen.getByText('C. HISTÓRICA')).toBeTruthy();
  fireEvent.press(screen.getByText('Comparar'));
  expect(navigation.navigate).toHaveBeenCalledWith('Comparador', { season: '2025' });
  expect(service.mock.calls).toEqual([['2026'], ['2025']]);
  expect(global.fetch.mock.calls.filter(([url]) => url.includes('/2025/'))).toHaveLength(2);
});

test('mantiene CONSTRUCTORES activo durante el cambio de año y el año al volver a PILOTOS', async () => {
  openClassification();
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  await selectSeason('2025');
  await screen.findByText('80');
  expect(screen.queryByText('C. HISTÓRICA')).toBeNull();
  expect(screen.getByText('Equipo histórico')).toBeTruthy();
  fireEvent.press(screen.getByText('PILOTOS'));
  expect(screen.getByText('C. HISTÓRICA')).toBeTruthy();
  expect(screen.getByText('CAMPEONATO MUNDIAL 2025')).toBeTruthy();
});

test('conserva la búsqueda al cambiar de temporada y filtra únicamente sus pilotos y equipos', async () => {
  openClassification();
  await screen.findByText('B. ENSAYO');
  fireEvent.changeText(screen.getByLabelText('Filtrar tabla de clasificación'), 'históric');
  expect(screen.queryByText('A. PRUEBA')).toBeNull();
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByLabelText('Filtrar tabla de clasificación').props.value).toBe('históric');
  expect(screen.getByText('A. PRUEBA')).toBeTruthy(); // Coincide su equipo de 2025.
  expect(screen.queryByText('B. ENSAYO')).toBeNull();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.getByText('Equipo histórico')).toBeTruthy();
  await selectSeason('2026');
  await waitFor(() => expect(screen.queryByText('Consultando posiciones...')).toBeNull());
  expect(screen.queryByText('Equipo histórico')).toBeNull();
  expect(screen.queryByText('Equipo de prueba')).toBeNull();
  fireEvent.press(screen.getByLabelText('Limpiar filtro de clasificación'));
  expect(screen.getByText('Equipo de prueba')).toBeTruthy();
});

test('seleccionar de nuevo el mismo año no recarga y volver a otro ya consultado reutiliza caché', async () => {
  const service = jest.spyOn(F1DataService, 'getChampionshipStandings');
  openClassification();
  await screen.findByText('A. PRUEBA');
  await selectSeason('2026');
  expect(screen.queryByText('Selecciona una temporada')).toBeNull();
  expect(service).toHaveBeenCalledTimes(1);
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  await selectSeason('2026');
  await screen.findByText('B. ENSAYO');
  expect(screen.getByText('Pilotos · Jolpica · caché local · ronda 20')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(5); // Dos tablas por año y una lista.
});

test('favoritos de pilotos y constructores conservan identidad y persistencia al cambiar de temporada', async () => {
  const previousTeams = await LocalStorageManager.obtenerEscuderiasFavoritas();
  openClassification();
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getByLabelText('Marcar piloto favorito Ana Prueba'));
  await screen.findByLabelText('Quitar piloto favorito Ana Prueba');
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByLabelText('Quitar piloto favorito Ana Prueba')).toBeTruthy();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  fireEvent.press(screen.getByLabelText('Marcar escudería favorita Equipo histórico'));
  await screen.findByLabelText('Quitar escudería favorita Equipo histórico');
  await selectSeason('2026');
  await screen.findByText('225.5');
  expect(screen.getByLabelText('Quitar escudería favorita Equipo de prueba')).toBeTruthy();
  fireEvent.press(screen.getByText('PILOTOS'));
  fireEvent.press(screen.getByLabelText('Quitar piloto favorito Ana Prueba'));
  await screen.findByLabelText('Marcar piloto favorito Ana Prueba');
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByLabelText('Marcar piloto favorito Ana Prueba')).toBeTruthy();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual([...previousTeams, 'equipo_prueba']);
  expect(global.fetch).toHaveBeenCalledTimes(5);
});

test('una temporada vacía no recupera participantes del año anterior y mantiene el año visible', async () => {
  openClassification();
  await screen.findByText('B. ENSAYO');
  await selectSeason('1950');
  await screen.findByText('Pilotos: No hay clasificación disponible para esta temporada.');
  expect(screen.getByText('Constructores: No hay clasificación disponible para esta temporada.')).toBeTruthy();
  expect(screen.getByText('CAMPEONATO MUNDIAL 1950')).toBeTruthy();
  expect(screen.queryByText('A. PRUEBA')).toBeNull();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.queryByText('Equipo de prueba')).toBeNull();
});

test('HTTP 404 en un año nuevo informa el error sin desconexión ficticia ni datos de otro año y permite reintentar', async () => {
  global.fetch.mockImplementation(url => url.includes('/2025/')
    ? Promise.resolve({ ok: false, status: 404 }) : respond(url));
  openClassification();
  await screen.findByText('A. PRUEBA');
  await selectSeason('2025');
  await screen.findByText('Pilotos: No se pudo actualizar (Jolpica HTTP 404).');
  expect(screen.getByText('Constructores: No se pudo actualizar (Jolpica HTTP 404).')).toBeTruthy();
  expect(screen.queryByText(/Sin conexión|A\. PRUEBA|225.5/)).toBeNull();
  expect(screen.getByText('CAMPEONATO MUNDIAL 2025')).toBeTruthy();
  global.fetch.mockImplementation(respond);
  fireEvent.press(screen.getByText('Reintentar / Actualizar'));
  expect(await screen.findByText('C. HISTÓRICA')).toBeTruthy();
});

test('un fallo parcial conserva solo la tabla válida de la temporada seleccionada', async () => {
  global.fetch.mockImplementation(url => url.includes('/2025/constructorstandings')
    ? Promise.resolve({ ok: false, status: 503 }) : respond(url));
  openClassification();
  await screen.findByText('A. PRUEBA');
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByText('Constructores: No se pudo actualizar (Jolpica HTTP 503).')).toBeTruthy();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.queryByText('225.5')).toBeNull();
  expect(screen.queryByText('Equipo de prueba')).toBeNull();
});

test('una copia vencida de la temporada elegida se identifica como caché sin mezclar años', async () => {
  await F1DataService.getChampionshipStandings('2025');
  clock += 3600001;
  global.fetch.mockImplementation(url => url.includes('/2025/')
    ? Promise.resolve({ ok: false, status: 503 }) : respond(url));
  openClassification();
  await screen.findByText('B. ENSAYO');
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByText('Pilotos · Jolpica · última copia guardada · ronda 20')).toBeTruthy();
  expect(screen.getByText('Pilotos: No se pudo actualizar (Jolpica HTTP 503).')).toBeTruthy();
  expect(screen.queryByText('B. ENSAYO')).toBeNull();
  expect(screen.queryByText('125.5')).toBeNull();
});

test('informa errores al obtener los años y permite reintentar sin borrar la clasificación', async () => {
  global.fetch.mockImplementation(url => url.includes('/seasons.json')
    ? Promise.resolve({ ok: false, status: 503 }) : respond(url));
  openClassification();
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada de clasificación' }));
  await screen.findByText('No se pudieron cargar las temporadas de Jolpica.');
  global.fetch.mockImplementation(respond);
  fireEvent.press(screen.getByText('Reintentar temporadas'));
  fireEvent.press(await within(screen.getByLabelText('Temporadas disponibles')).findByRole('button', { name: 'Temporada 2025' }));
  expect(await screen.findByText('C. HISTÓRICA')).toBeTruthy();
});

test('una lista de años vacía no inventa opciones y permite cerrar conservando la tabla', async () => {
  global.fetch.mockImplementation(url => url.includes('/seasons.json')
    ? Promise.resolve(okStandings({ MRData: { total: '0', SeasonTable: { Seasons: [] } } })) : respond(url));
  openClassification();
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada de clasificación' }));
  await screen.findByText('No hay temporadas disponibles.');
  expect(within(screen.getByLabelText('Temporadas disponibles')).queryAllByRole('button')).toHaveLength(0);
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  expect(screen.getByText('A. PRUEBA')).toBeTruthy();
});

test('cerrar y reabrir mientras carga la lista no duplica la consulta de temporadas', async () => {
  let resolveSeasons;
  global.fetch.mockImplementation(url => url.includes('/seasons.json')
    ? new Promise(resolve => { resolveSeasons = resolve; }) : respond(url));
  openClassification();
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada de clasificación' }));
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada de clasificación' }));
  await waitFor(() => expect(global.fetch.mock.calls.filter(([url]) => url.includes('/seasons.json'))).toHaveLength(1));
  await act(async () => { resolveSeasons(okStandings(seasonsResponse())); });
  expect(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2025' })).toBeTruthy();
});

test.each(['success', 'error'])('una respuesta tardía (%s) no sustituye las tablas del último año seleccionado', async kind => {
  const pending = [];
  global.fetch.mockImplementation(url => url.includes('/2025/')
    ? new Promise(resolve => pending.push({ url, resolve })) : respond(url));
  openClassification();
  await screen.findByText('A. PRUEBA');
  await selectSeason('2025');
  expect(screen.getByText('Consultando posiciones...')).toBeTruthy();
  await selectSeason('2024');
  await screen.findByText('D. ANTIGUO');
  expect(pending).toHaveLength(2);
  await act(async () => {
    await Promise.all(pending.map(async ({ url, resolve }) => resolve(kind === 'success'
      ? await respond(url) : { ok: false, status: 503 })));
  });
  expect(screen.getByText('CAMPEONATO MUNDIAL 2024')).toBeTruthy();
  expect(screen.getByText('D. ANTIGUO')).toBeTruthy();
  expect(screen.queryByText('C. HISTÓRICA')).toBeNull();
  expect(screen.queryByText(/HTTP 503|Consultando posiciones/)).toBeNull();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.getByText('Equipo antiguo')).toBeTruthy();
  expect(screen.queryByText('Equipo histórico')).toBeNull();
});

test('se puede elegir otro año antes de terminar la carga inicial y su respuesta tardía se descarta', async () => {
  const pending = [];
  global.fetch.mockImplementation(url => url.includes('/2026/')
    ? new Promise(resolve => pending.push({ url, resolve })) : respond(url));
  openClassification();
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  await act(async () => { await Promise.all(pending.map(async ({ url, resolve }) => resolve(await respond(url)))); });
  expect(screen.getByText('CAMPEONATO MUNDIAL 2025')).toBeTruthy();
  expect(screen.queryByText('B. ENSAYO')).toBeNull();
});

test('una nueva temporada explícita recibida por navegación actualiza ambas tablas', async () => {
  const { navigation, rerender } = openClassification();
  await screen.findByText('B. ENSAYO');
  rerender(<ClasificacionScreen navigation={navigation} route={{ params: { season: '2025' } }} />);
  await screen.findByText('C. HISTÓRICA');
  expect(screen.getByText('CAMPEONATO MUNDIAL 2025')).toBeTruthy();
  expect(screen.queryByText('B. ENSAYO')).toBeNull();
});

test('los valores ausentes del año elegido siguen desconocidos al abrir el perfil, sin rellenarlos desde otra temporada', async () => {
  tables['2025'].driver = [driverStanding({ points: undefined, wins: undefined, position: undefined, positionText: undefined, Constructors: undefined })];
  const { navigation } = openClassification();
  await screen.findByText('B. ENSAYO');
  await selectSeason('2025');
  await screen.findByText('A. PRUEBA');
  expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
  expect(screen.queryByText('125.5')).toBeNull();
  fireEvent.press(screen.getByText('A. PRUEBA'));
  expect(navigation.navigate).toHaveBeenCalledWith('PerfilPiloto', {
    driverId: 81, driver: expect.objectContaining({ season: '2025', puntos: null, victorias: null, posicionCampeonato: null }),
  });
});

test('AppNavigator conserva el año histórico en perfil, Comparador y al regresar; los destinos reutilizan datos sin nuevo HTTP', async () => {
  clock = Date.parse('2026-11-02T12:00:00Z'); // El GP de la fixture todavía es futuro.
  render(<AppNavigator />);
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByLabelText(/^Tablas, tab/));
  await screen.findByText('B. ENSAYO');
  await selectSeason('2025');
  await screen.findByText('C. HISTÓRICA');
  fireEvent.press(screen.getByText('A. PRUEBA'));
  await screen.findByText('RENDIMIENTO EN EL CAMPEONATO 2025');
  expect(screen.getByText('45')).toBeTruthy();
  expect(screen.getByText('Equipo histórico')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
  await screen.findByText('CAMPEONATO MUNDIAL 2025');
  fireEvent.press(screen.getByText('Comparar'));
  await screen.findByText('TEMPORADA 2025 • CARA A CARA');
  expect(screen.getByText('HISTÓRICA')).toBeTruthy();
  expect(screen.getByText('45')).toBeTruthy();
  expect(screen.getByText('30')).toBeTruthy();
  expect(screen.queryByText('125.5')).toBeNull();
  fireEvent.press(screen.getByLabelText('Volver'));
  await screen.findByText('CAMPEONATO MUNDIAL 2025');
  expect(screen.getByText('C. HISTÓRICA')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(6); // Inicio, dos tablas por año y lista.
});
