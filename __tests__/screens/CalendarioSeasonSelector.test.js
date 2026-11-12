import React from 'react';
import { Animated } from 'react-native';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalendarioScreen from '../../src/screens/CalendarioScreen';
import AppNavigator from '../../src/navigation/AppNavigator';
import F1DataService from '../../src/services/F1DataService';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { calendarRace } from '../fixtures/calendar';
import { raceResponse, okResponse } from '../fixtures/jolpica';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

const originalFetch = global.fetch;
const now = Date.parse('2026-11-02T12:00:00Z');
const availableSeasons = ['2026', '2025', '2024', '1950'];
const seasonsResponse = { MRData: { total: '4', SeasonTable: { Seasons: availableSeasons.map(season => ({ season })) } } };
const historicRace = (season, overrides = {}) => calendarRace({
  season, round: '07', raceName: `GP ${season}`, date: `${season}-11-08`,
  FirstPractice: { date: `${season}-11-06`, time: '13:00:00Z' },
  Qualifying: { date: `${season}-11-07`, time: '16:00:00Z' },
  ...overrides,
});
let calendars;

function respond(url) {
  if (url.endsWith('/seasons.json?limit=100')) return Promise.resolve(okResponse(seasonsResponse));
  const year = url.match(/\/(\d{4})\.json$/)?.[1];
  if (year && calendars[year]) return Promise.resolve(okResponse(raceResponse(calendars[year])));
  throw new Error(`Petición inesperada: ${url}`);
}

function openCalendar() {
  const navigation = { navigate: jest.fn() };
  return { ...render(<CalendarioScreen navigation={navigation} />), navigation };
}
async function selectSeason(year) {
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  const options = within(screen.getByLabelText('Temporadas disponibles'));
  fireEvent.press(await options.findByRole('button', { name: `Temporada ${year}` }));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.spyOn(Date, 'now').mockReturnValue(now);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(
    jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing,
  );
  F1DataService.isOfflineMode = false;
  F1DataService.calendarWarning = null;
  F1DataService.listeners = [];
  calendars = { '2026': [calendarRace()], '2025': [historicRace('2025')], '2024': [], '1950': [] };
  global.fetch = jest.fn(respond);
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test('consulta los años solo al abrir y muestra exactamente la lista publicada', async () => {
  openCalendar();
  await screen.findByText('GP de prueba');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  expect(screen.getByText('Cargando temporadas...')).toBeTruthy();
  expect(await screen.findByRole('button', { name: 'Temporada 1950' })).toBeTruthy();
  expect(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2026' }).props.accessibilityState.selected).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch).toHaveBeenLastCalledWith('https://api.jolpi.ca/ergast/f1/seasons.json?limit=100', expect.anything());
});

test('elegir 2025 consulta getCalendar(year), reemplaza los GP y conserva horarios de Santiago', async () => {
  const getCalendar = jest.spyOn(F1DataService, 'getCalendar');
  openCalendar();
  await screen.findByText('GP de prueba');
  await selectSeason('2025');
  expect(await screen.findByText('GP 2025')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
  expect(screen.getByText('TEMPORADA 2025 • HORA DE SANTIAGO')).toBeTruthy();
  expect(screen.getByText('14:00 (Santiago)')).toBeTruthy();
  expect(getCalendar.mock.calls).toEqual([['2026'], ['2025']]);
  expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([
    'https://api.jolpi.ca/ergast/f1/2026.json',
    'https://api.jolpi.ca/ergast/f1/seasons.json?limit=100',
    'https://api.jolpi.ca/ergast/f1/2025.json',
  ]);
});

test('volver a un año consultado reutiliza su caché y la lista de temporadas', async () => {
  openCalendar();
  await screen.findByText('GP de prueba');
  await selectSeason('2025');
  await screen.findByText('GP 2025');
  await selectSeason('2026');
  await screen.findByText('GP de prueba');
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

test('elegir el año actual cierra el selector sin recargar el calendario', async () => {
  const getCalendar = jest.spyOn(F1DataService, 'getCalendar');
  openCalendar();
  await screen.findByText('GP de prueba');
  await selectSeason('2026');
  expect(screen.queryByText('Selecciona una temporada')).toBeNull();
  expect(getCalendar).toHaveBeenCalledTimes(1);
  expect(screen.getByText('GP de prueba')).toBeTruthy();
});

test('cancelar el selector conserva la temporada y el contenido', async () => {
  const getCalendar = jest.spyOn(F1DataService, 'getCalendar');
  openCalendar();
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  await screen.findByRole('button', { name: 'Temporada 2025' });
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  expect(screen.getByText('TEMPORADA 2026 • HORA DE SANTIAGO')).toBeTruthy();
  expect(getCalendar).toHaveBeenCalledTimes(1);
});

test('conserva el buscador y el filtro elegido al cambiar de temporada', async () => {
  calendars['2026'] = [calendarRace({ raceName: 'GP compartido' })];
  calendars['2025'] = [historicRace('2025', { raceName: 'GP compartido' }), historicRace('2025', { round: '08', raceName: 'GP excluido' })];
  openCalendar();
  await screen.findByText('GP compartido');
  fireEvent.changeText(screen.getByLabelText('Buscar carrera en el calendario'), 'compartido');
  fireEvent.press(screen.getByRole('button', { name: 'ANTERIORES' }));
  expect(screen.getByText('No se encontraron carreras para "compartido".')).toBeTruthy();
  await selectSeason('2025');
  await screen.findByText('GP compartido');
  expect(screen.getByLabelText('Buscar carrera en el calendario').props.value).toBe('compartido');
  expect(screen.getByRole('button', { name: 'ANTERIORES' }).props.accessibilityState.selected).toBe(true);
  expect(screen.queryByText('GP excluido')).toBeNull();
  expect(screen.queryByText(/FINALIZADO|Ganador:/)).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'PRÓXIMAS' }));
  expect(screen.getByText('No se encontraron carreras para "compartido".')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'TODO' }));
  expect(screen.getByText('GP compartido')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Limpiar búsqueda'));
  expect(screen.getByText('GP excluido')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

test('una temporada vacía conserva el año seleccionado sin recuperar carreras de otro año', async () => {
  openCalendar();
  await screen.findByText('GP de prueba');
  await selectSeason('2024');
  expect(await screen.findByText('No hay Grandes Premios publicados para esta temporada.')).toBeTruthy();
  expect(screen.getByText('TEMPORADA 2024 • HORA DE SANTIAGO')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
});

test('un fallo del año elegido permite reintentar ese año sin mostrar el calendario anterior', async () => {
  global.fetch.mockImplementation(url => url.endsWith('/2025.json')
    ? Promise.resolve({ ok: false, status: 503 }) : respond(url));
  const getCalendar = jest.spyOn(F1DataService, 'getCalendar');
  openCalendar();
  await screen.findByText('GP de prueba');
  await selectSeason('2025');
  await screen.findByText('No se pudo cargar el calendario.');
  expect(screen.getByText('TEMPORADA 2025 • HORA DE SANTIAGO')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
  global.fetch.mockImplementation(respond);
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByText('GP 2025');
  expect(getCalendar).toHaveBeenLastCalledWith('2025');
});

test('recupera la copia vencida del año seleccionado con su advertencia', async () => {
  Date.now.mockReturnValue(now - 7200000);
  await LocalStorageManager.guardarCache('jolpica_v1_calendar_2025', calendars['2025']);
  Date.now.mockReturnValue(now);
  global.fetch.mockImplementation(url => url.endsWith('/2025.json') ? Promise.reject(new Error('Sin conexión')) : respond(url));
  openCalendar();
  await screen.findByText('GP de prueba');
  await selectSeason('2025');
  await screen.findByText('GP 2025');
  expect(screen.getByText('No se pudo actualizar con Jolpica. Mostrando la última copia guardada.')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
});

test('el error de temporadas ofrece reintento sin impedir consultar el calendario actual', async () => {
  global.fetch.mockImplementation(url => url.includes('/seasons.json')
    ? Promise.resolve({ ok: false, status: 503 }) : respond(url));
  openCalendar();
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  await screen.findByText('No se pudieron cargar las temporadas de Jolpica.');
  global.fetch.mockImplementation(respond);
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar temporadas' }));
  await screen.findByRole('button', { name: 'Temporada 2025' });
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  expect(screen.getByText('GP de prueba')).toBeTruthy();
});

test('una lista de temporadas vacía no fabrica años ni modifica el calendario inicial', async () => {
  global.fetch.mockImplementation(url => url.includes('/seasons.json')
    ? Promise.resolve(okResponse({ MRData: { total: '0', SeasonTable: { Seasons: [] } } })) : respond(url));
  openCalendar();
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  await screen.findByText('No hay temporadas disponibles.');
  expect(within(screen.getByLabelText('Temporadas disponibles')).queryByRole('button', { name: 'Temporada 2026' })).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  expect(screen.getByText('GP de prueba')).toBeTruthy();
});

test('una lista recuperada de caché vencida informa la advertencia y permite elegir', async () => {
  Date.now.mockReturnValue(now - 26 * 3600000);
  await LocalStorageManager.guardarCache('jolpica_v1_seasons', availableSeasons);
  Date.now.mockReturnValue(now);
  global.fetch.mockImplementation(url => url.includes('/seasons.json') ? Promise.reject(new Error('Sin conexión')) : respond(url));
  openCalendar();
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  await screen.findByRole('button', { name: 'Temporada 2025' });
  expect(screen.getByText('No se pudo actualizar con Jolpica. Mostrando la última copia guardada.')).toBeTruthy();
  fireEvent.press(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2025' }));
  await screen.findByText('GP 2025');
});

test.each(['success', 'http-error'])('la respuesta tardía %s de 2025 no reemplaza el año seleccionado después', async kind => {
  let resolveOld;
  calendars['2024'] = [historicRace('2024')];
  global.fetch.mockImplementation(url => url.endsWith('/2025.json')
    ? new Promise(resolve => { resolveOld = resolve; }) : respond(url));
  openCalendar();
  await screen.findByText('GP de prueba');
  await selectSeason('2025');
  expect(screen.getByText('Cargando calendario de carreras...')).toBeTruthy();
  await selectSeason('2024');
  await screen.findByText('GP 2024');
  await act(async () => {
    resolveOld(kind === 'success' ? okResponse(raceResponse(calendars['2025'])) : { ok: false, status: 503 });
  });
  expect(screen.getByText('GP 2024')).toBeTruthy();
  expect(screen.getByText('TEMPORADA 2024 • HORA DE SANTIAGO')).toBeTruthy();
  expect(screen.queryByText('GP 2025')).toBeNull();
  expect(screen.queryByText('No se pudo cargar el calendario.')).toBeNull();
  expect(screen.queryByText('Cargando calendario de carreras...')).toBeNull();
});

test('permite elegir mientras la consulta inicial sigue pendiente y descarta su respuesta tardía', async () => {
  let resolveInitial;
  global.fetch.mockImplementation(url => url.endsWith('/2026.json')
    ? new Promise(resolve => { resolveInitial = resolve; }) : respond(url));
  openCalendar();
  await selectSeason('2025');
  await screen.findByText('GP 2025');
  await act(async () => { resolveInitial(okResponse(raceResponse(calendars['2026']))); });
  expect(screen.getByText('GP 2025')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
});

test('cerrar y reabrir durante la carga de temporadas no duplica la consulta', async () => {
  let resolveSeasons;
  global.fetch.mockImplementation(url => url.includes('/seasons.json')
    ? new Promise(resolve => { resolveSeasons = resolve; }) : respond(url));
  openCalendar();
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  await waitFor(() => expect(global.fetch.mock.calls.filter(([url]) => url.includes('/seasons.json'))).toHaveLength(1));
  await act(async () => { resolveSeasons(okResponse(seasonsResponse)); });
  expect(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2025' })).toBeTruthy();
});

test('AppNavigator conserva temporada, ronda, búsqueda y filtro al volver del detalle', async () => {
  const getCalendar = jest.spyOn(F1DataService, 'getCalendar');
  render(<AppNavigator />);
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByLabelText(/^Calendario, tab/));
  await screen.findByText('Registro Histórico');
  await selectSeason('2025');
  await screen.findByText('GP 2025');
  fireEvent.changeText(screen.getByLabelText('Buscar carrera en el calendario'), '2025');
  fireEvent.press(screen.getByRole('button', { name: 'ANTERIORES' }));
  fireEvent.press(screen.getByText('GP 2025'));
  await screen.findByText('Temporada 2025 • Ronda 07');
  expect(screen.getByText('GP 2025')).toBeTruthy();
  expect(screen.getByText('Circuito de prueba')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
  await screen.findByText('TEMPORADA 2025 • HORA DE SANTIAGO');
  expect(screen.getByLabelText('Buscar carrera en el calendario').props.value).toBe('2025');
  expect(screen.getByRole('button', { name: 'ANTERIORES' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText('GP 2025')).toBeTruthy();
  expect(getCalendar.mock.calls).toEqual([['2026'], ['2025']]);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});
