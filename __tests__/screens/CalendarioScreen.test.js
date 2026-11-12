import React from 'react';
import { Animated, ScrollView } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CalendarioScreen from '../../src/screens/CalendarioScreen';
import DetalleGPScreen from '../../src/screens/DetalleGPScreen';
import HomeScreen from '../../src/screens/HomeScreen';
import F1DataService from '../../src/services/F1DataService';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { GranPremio } from '../../src/models/GranPremio';
import { calendarRace } from '../fixtures/calendar';
import { raceResponse, okResponse } from '../fixtures/jolpica';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const originalFetch = global.fetch;
const now = Date.parse('2026-11-02T12:00:00Z');

function openCalendar() {
  const navigation = { navigate: jest.fn() };
  return { ...render(<CalendarioScreen navigation={navigation} />), navigation };
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(now);
  jest.spyOn(Animated, 'timing').mockImplementation(
    jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing,
  );
  await AsyncStorage.clear();
  F1DataService.isOfflineMode = false;
  F1DataService.calendarWarning = null;
  F1DataService.listeners = [];
  global.fetch = jest.fn().mockResolvedValue(okResponse(raceResponse([calendarRace()])));
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

test('carga el calendario actual con el servicio real, una sola consulta y horarios de Santiago', async () => {
  const getCalendar = jest.spyOn(F1DataService, 'getCalendar');
  openCalendar();
  expect(screen.getByText('Cargando calendario de carreras...')).toBeTruthy();
  expect(await screen.findByText('GP de prueba')).toBeTruthy();
  expect(screen.getByText('TEMPORADA 2026 • HORA DE SANTIAGO')).toBeTruthy();
  expect(screen.getByText('Circuito de prueba')).toBeTruthy();
  expect(screen.getByText('ROUND 1')).toBeTruthy();
  expect(screen.getByText('2026-11-08')).toBeTruthy();
  expect(screen.getByText('14:00 (Santiago)')).toBeTruthy();
  expect(getCalendar).toHaveBeenCalledTimes(1);
  expect(getCalendar).toHaveBeenCalledWith('2026');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toBe('https://api.jolpi.ca/ergast/f1/2026.json');
  expect(screen.queryByText(/2024|Singapur|09:00 CLT|Ganador:/i)).toBeNull();
});

test('el año del encabezado y del servicio respetan Santiago al cambiar el año UTC', async () => {
  Date.now.mockReturnValue(Date.parse('2027-01-01T01:00:00Z'));
  openCalendar();
  await screen.findByText('GP de prueba');
  expect(screen.getByText('TEMPORADA 2026 • HORA DE SANTIAGO')).toBeTruthy();
  expect(global.fetch.mock.calls[0][0]).toBe('https://api.jolpi.ca/ergast/f1/2026.json');
});

test('filtra próximas y anteriores por fecha sin declarar resultados oficiales ni repetir la API', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([
    calendarRace({ round: '1', raceName: 'GP anterior', date: '2026-10-25' }),
    calendarRace({ round: '2', raceName: 'GP futuro' }),
    calendarRace({ round: '3', raceName: 'GP sin fecha', date: undefined, time: undefined }),
  ])));
  openCalendar();
  await screen.findByText('GP anterior');
  expect(screen.getByText('GP futuro')).toBeTruthy();
  expect(screen.getByText('GP sin fecha')).toBeTruthy();

  fireEvent.press(screen.getByText('PRÓXIMAS'));
  expect(screen.getByText('GP futuro')).toBeTruthy();
  expect(screen.queryByText('GP anterior')).toBeNull();
  expect(screen.queryByText('GP sin fecha')).toBeNull();

  fireEvent.press(screen.getByText('ANTERIORES'));
  expect(screen.getByText('GP anterior')).toBeTruthy();
  expect(screen.queryByText('GP futuro')).toBeNull();
  expect(screen.queryByText(/FINALIZADO|Ganador:|RESULTADOS/)).toBeNull();

  fireEvent.press(screen.getByText('TODO'));
  expect(screen.getByText('GP sin fecha')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('sin hora compara solo días UTC completos y deja el día ambiguo visible en TODO', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([
    calendarRace({ round: '1', raceName: 'GP de ayer', date: '2026-11-01', time: undefined }),
    calendarRace({ round: '2', raceName: 'GP de hoy', date: '2026-11-02', time: undefined }),
    calendarRace({ round: '3', raceName: 'GP de mañana', date: '2026-11-03', time: undefined }),
  ])));
  openCalendar();
  await screen.findByText('GP de hoy');
  expect(screen.getByText('2026-11-02 (fecha UTC)')).toBeTruthy();
  fireEvent.press(screen.getByText('PRÓXIMAS'));
  expect(screen.getByText('GP de mañana')).toBeTruthy();
  expect(screen.queryByText('GP de hoy')).toBeNull();
  fireEvent.press(screen.getByText('ANTERIORES'));
  expect(screen.getByText('GP de ayer')).toBeTruthy();
  expect(screen.queryByText('GP de hoy')).toBeNull();
  fireEvent.press(screen.getByText('TODO'));
  expect(screen.getByText('GP de hoy')).toBeTruthy();
});

test('distingue un filtro vacío de un calendario sin publicaciones', async () => {
  openCalendar();
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByText('ANTERIORES'));
  expect(screen.getByText('No hay Grandes Premios para este filtro.')).toBeTruthy();
  expect(screen.queryByText('No hay Grandes Premios publicados para esta temporada.')).toBeNull();
});

test('un calendario vacío informa ausencia y permite volver a consultar sin GP de respaldo', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([])));
  openCalendar();
  expect(await screen.findByText('No hay Grandes Premios publicados para esta temporada.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Volver a consultar' })).toBeTruthy();
  expect(screen.queryByText(/Singapur|Marina Bay|20 - 22 Sep|09:00/)).toBeNull();

  await AsyncStorage.clear();
  global.fetch.mockResolvedValue(okResponse(raceResponse([calendarRace()])));
  fireEvent.press(screen.getByText('Volver a consultar'));
  expect(await screen.findByText('GP de prueba')).toBeTruthy();
});

test('un error HTTP muestra reintento y no afirma que está mostrando una caché inexistente', async () => {
  global.fetch.mockResolvedValueOnce({ ok: false, status: 503 });
  openCalendar();
  expect(await screen.findByText('No se pudo cargar el calendario.')).toBeTruthy();
  expect(screen.queryByText(/Mostrando calendario almacenado|última copia guardada/)).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('GP de prueba')).toBeTruthy();
  expect(screen.queryByText('No se pudo cargar el calendario.')).toBeNull();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('el rechazo de red sin caché se muestra como error', async () => {
  global.fetch.mockRejectedValue(new Error('Sin conexión'));
  openCalendar();
  expect(await screen.findByText('No se pudo cargar el calendario.')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
});

test('al recuperar una caché vencida conserva sus datos y el aviso real del servicio', async () => {
  Date.now.mockReturnValue(now - 7200000);
  await LocalStorageManager.guardarCache('jolpica_v1_calendar_2026', [calendarRace()]);
  Date.now.mockReturnValue(now);
  global.fetch.mockRejectedValue(new Error('Sin conexión'));
  openCalendar();
  expect(await screen.findByText('GP de prueba')).toBeTruthy();
  expect(screen.getByText('No se pudo actualizar con Jolpica. Mostrando la última copia guardada.')).toBeTruthy();
});

test('tolera un GP sin nombre, circuito, fecha ni hora sin recuperar datos ficticios', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([
    calendarRace({ raceName: undefined, Circuit: undefined, date: undefined, time: undefined }),
  ])));
  openCalendar();
  expect(await screen.findByText('Nombre del GP no disponible')).toBeTruthy();
  expect(screen.getByText('Circuito no disponible')).toBeTruthy();
  expect(screen.getByText('Fecha por confirmar')).toBeTruthy();
  expect(screen.getByText('Hora por confirmar')).toBeTruthy();
  expect(screen.queryByText(/Singapur|Marina Bay|20 - 22 Sep|09:00 CLT/)).toBeNull();
});

test('Calendario envía el modelo original a DetalleGP y este muestra el GP seleccionado', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([
    calendarRace({ round: '07', raceName: 'GP seleccionado' }),
  ])));
  const view = openCalendar();
  await screen.findByText('GP seleccionado');
  fireEvent.press(screen.getByText('GP seleccionado'));
  const [routeName, params] = view.navigation.navigate.mock.calls[0];
  expect(routeName).toBe('DetalleGP');
  expect(params.meeting).toBeInstanceOf(GranPremio);
  expect(params.meeting).toMatchObject({ season: '2026', round: '07', id: 'jolpica:2026:07', idMeeting: 'jolpica:2026:07' });

  view.unmount();
  render(<DetalleGPScreen route={{ params }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  expect(screen.getByText('GP seleccionado')).toBeTruthy();
  expect(screen.getByText('Temporada 2026 • Ronda 07')).toBeTruthy();
  expect(screen.getByText('Practice 1')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('Inicio envía el mismo contrato de GranPremio a DetalleGP sin una consulta adicional', async () => {
  const navigation = { navigate: jest.fn() };
  const view = render(<HomeScreen navigation={navigation} />);
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByText('Ver detalle del GP'));
  const [routeName, params] = navigation.navigate.mock.calls[0];
  expect(routeName).toBe('DetalleGP');
  expect(params.meeting).toBeInstanceOf(GranPremio);
  expect(params.meeting.idMeeting).toBe('jolpica:2026:1');
  view.unmount();
  render(<DetalleGPScreen route={{ params }} navigation={{ goBack: jest.fn(), navigate: jest.fn() }} />);
  expect(screen.getByText('GP de prueba')).toBeTruthy();
  expect(screen.getByText('Viernes 10:00 (Santiago)')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('conserva las rutas registradas de Historial y Perfil', async () => {
  const { navigation } = openCalendar();
  await screen.findByText('GP de prueba');
  fireEvent.press(screen.getByText('Registro Histórico'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('HistorialWeb');
  fireEvent.press(screen.getByText('DM'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Perfil');
});

test('una actualización fallida termina la carga y no mantiene un calendario anterior como vigente', async () => {
  openCalendar();
  await screen.findByText('GP de prueba');
  await AsyncStorage.clear();
  global.fetch.mockRejectedValue(new Error('Sin conexión'));
  await act(async () => {
    await screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh();
  });
  expect(screen.getByText('No se pudo cargar el calendario.')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
  expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(false);
});

test('permite buscar en tiempo real por nombre, país o circuito y limpiar la búsqueda', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([
    calendarRace({ round: '1', raceName: 'Gran Premio de Mónaco', Circuit: { circuitName: 'Monte Carlo', Location: { country: 'Monaco' } } }),
    calendarRace({ round: '2', raceName: 'Gran Premio de Monza', Circuit: { circuitName: 'Autodromo Nazionale Monza', Location: { country: 'Italy' } } }),
  ])));
  openCalendar();
  await screen.findByText('Gran Premio de Mónaco');
  expect(screen.getByText('Gran Premio de Monza')).toBeTruthy();

  const searchInput = screen.getByLabelText('Buscar carrera en el calendario');
  fireEvent.changeText(searchInput, 'Mónaco');
  expect(screen.getByText('Gran Premio de Mónaco')).toBeTruthy();
  expect(screen.queryByText('Gran Premio de Monza')).toBeNull();

  fireEvent.changeText(searchInput, 'Inexistente');
  expect(screen.getByText('No se encontraron carreras para "Inexistente".')).toBeTruthy();
  expect(screen.queryByText('Gran Premio de Mónaco')).toBeNull();

  fireEvent.press(screen.getByText('Limpiar búsqueda'));
  expect(screen.getByText('Gran Premio de Mónaco')).toBeTruthy();
  expect(screen.getByText('Gran Premio de Monza')).toBeTruthy();
});
