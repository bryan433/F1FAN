import React from 'react';
import { Alert, Animated } from 'react-native';
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import ComparadorScreen from '../../src/screens/ComparadorScreen';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import F1DataService from '../../src/services/F1DataService';
import { driverStanding, secondDriverStanding, mockStandingsFetch } from '../fixtures/jolpicaStandings';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

const originalFetch = global.fetch;
let clock;
const navigation = () => ({ navigate: jest.fn(), goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  clock = Date.parse('2026-11-02T12:00:00Z');
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(
    jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing,
  );
  F1DataService.isOfflineMode = false;
  global.fetch = mockStandingsFetch();
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test('Clasificación carga datos reales del contrato, temporada, procedencia y ronda; conserva pestañas y rutas', async () => {
  const nav = navigation();
  render(<ClasificacionScreen navigation={nav} />);
  expect(screen.getByText('Consultando posiciones...')).toBeTruthy();
  await screen.findByText('A. PRUEBA');
  expect(screen.getByText('CAMPEONATO MUNDIAL 2026')).toBeTruthy();
  expect(screen.getByText('Pilotos · Jolpica · API · ronda 20')).toBeTruthy();
  expect(screen.queryByText(/2024|Sin conexión/)).toBeNull();
  fireEvent.press(screen.getByText('A. PRUEBA'));
  expect(nav.navigate).toHaveBeenCalledWith('PerfilPiloto', { driverId: 81, driver: expect.objectContaining({ source: 'jolpica', season: '2026', driverId: 'piloto_prueba' }) });
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.getByText('225.5')).toBeTruthy();
  fireEvent.press(screen.getByText('PILOTOS'));
  expect(screen.getByText('A. PRUEBA')).toBeTruthy();
  fireEvent.press(screen.getByText('Comparar'));
  expect(nav.navigate).toHaveBeenCalledWith('Comparador', { season: '2026' });
  fireEvent.press(screen.getByText('DM'));
  expect(nav.navigate).toHaveBeenCalledWith('Perfil');
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('el foco inicial simultáneo no duplica la carga y volver al foco reutiliza caché', async () => {
  const nav = navigation();
  const service = jest.spyOn(F1DataService, 'getChampionshipStandings');
  render(<ClasificacionScreen navigation={nav} />);
  const focus = nav.addListener.mock.calls[0][1];
  await act(async () => { await focus(); });
  expect(service).toHaveBeenCalledTimes(1);
  await screen.findByText('A. PRUEBA');
  await act(async () => { await focus(); });
  expect(screen.getByText('Pilotos · Jolpica · caché local · ronda 20')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('permite guardar y eliminar el favorito real sin repetir consultas HTTP', async () => {
  render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getAllByTestId('icon-star-outline')[0]);
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Agregado a favoritos', expect.stringContaining('Ana Prueba')));
  await waitFor(() => expect(screen.getAllByTestId('icon-star')).toHaveLength(2));
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([81]);
  fireEvent.press(screen.getAllByTestId('icon-star')[1]);
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Favorito eliminado', expect.any(String)));
  await waitFor(() => expect(screen.queryAllByTestId('icon-star')).toHaveLength(0));
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('Clasificación distingue HTTP 404 de desconexión y permite reintentar sin usar respaldos', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 404 });
  render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('Pilotos: No se pudo actualizar (Jolpica HTTP 404).');
  expect(screen.queryByText(/Sin conexión|NORRIS|VERSTAPPEN|2024/)).toBeNull();
  expect(screen.getByText('Pilotos: No hay clasificación disponible para esta temporada.')).toBeTruthy();
  global.fetch = mockStandingsFetch();
  fireEvent.press(screen.getByText('Reintentar / Actualizar'));
  expect(await screen.findByText('A. PRUEBA')).toBeTruthy();
});

test('Clasificación informa una temporada vacía sin fabricar participantes', async () => {
  global.fetch = mockStandingsFetch({ drivers: [], teams: [] });
  render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('Pilotos: No hay clasificación disponible para esta temporada.');
  expect(screen.getByText('Constructores: No hay clasificación disponible para esta temporada.')).toBeTruthy();
  expect(screen.queryAllByText(/PTS \(/)).toHaveLength(0);
});

test('Clasificación conserva una tabla válida aunque la otra falle', async () => {
  const success = global.fetch;
  global.fetch = jest.fn(url => url.includes('/driverstandings') ? success(url) : Promise.resolve({ ok: false, status: 503 }));
  render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('A. PRUEBA');
  expect(screen.getByText('Constructores: No se pudo actualizar (Jolpica HTTP 503).')).toBeTruthy();
});

test('Clasificación y Comparador identifican una copia real vencida sin afirmar falta de conexión', async () => {
  await F1DataService.getChampionshipStandings();
  clock += 3600001;
  global.fetch.mockResolvedValue({ ok: false, status: 503 });
  const first = render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('A. PRUEBA');
  expect(screen.getByText('Pilotos · Jolpica · última copia guardada · ronda 20')).toBeTruthy();
  expect(screen.queryByText(/Sin conexión/)).toBeNull();
  first.unmount();
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('PRUEBA');
  expect(screen.getByText('Fuente: Jolpica · última copia guardada · ronda 20')).toBeTruthy();
  expect(screen.getByText(/No se pudo actualizar la comparación: Jolpica HTTP 503/)).toBeTruthy();
});

test('Comparador usa puntos y victorias publicados; poles, podios y delta quedan no disponibles', async () => {
  const nav = navigation();
  render(<ComparadorScreen navigation={nav} />);
  expect(screen.getByText('Cargando comparación...')).toBeTruthy();
  await screen.findByText('PRUEBA');
  expect(screen.getByText('ENSAYO')).toBeTruthy();
  expect(screen.getByText('TEMPORADA 2026 • CARA A CARA')).toBeTruthy();
  expect(screen.getByText('Fuente: Jolpica · API · ronda 20')).toBeTruthy();
  expect(screen.getByText('125.5')).toBeTruthy();
  expect(screen.getByText('100')).toBeTruthy();
  expect(screen.getAllByText('No disponible')).toHaveLength(5);
  expect(screen.queryByText(/-0.180s|TEMPORADA 2024/)).toBeNull();
  fireEvent.press(screen.getByLabelText('Intercambiar pilotos'));
  expect(screen.getAllByText(/PRUEBA|ENSAYO/).map(node => node.props.children)).toEqual(['ENSAYO', 'PRUEBA']);
  fireEvent.press(screen.getByLabelText('Volver'));
  expect(nav.goBack).toHaveBeenCalledTimes(1);
});

test('el Comparador reutiliza el campeonato de Clasificación sin consultar nuevamente la API', async () => {
  await F1DataService.getChampionshipStandings();
  render(<ComparadorScreen navigation={navigation()} route={{ params: { season: '2026' } }} />);
  await screen.findByText('PRUEBA');
  expect(screen.getByText('Fuente: Jolpica · caché local · ronda 20')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test.each([{ drivers: [] }, { drivers: [driverStanding()] }])('el Comparador con $drivers informa datos insuficientes y no inventa rivales', async ({ drivers }) => {
  global.fetch = mockStandingsFetch({ drivers });
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('Se necesitan al menos dos pilotos con clasificación disponible para comparar.');
  expect(screen.queryByText('VS')).toBeNull();
  expect(screen.queryByText(/NORRIS|VERSTAPPEN|-0.180s/)).toBeNull();
});

test('el Comparador admite datos faltantes y ceros sin presentar NaN ni barras ficticias', async () => {
  global.fetch = mockStandingsFetch({ drivers: [driverStanding({ points: undefined, wins: '0', position: undefined, positionText: 'D' }), secondDriverStanding({ points: '0', wins: '0', position: undefined, positionText: undefined })] });
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('PRUEBA');
  expect(screen.getByText('D')).toBeTruthy();
  expect(screen.getAllByText('No disponible').length).toBeGreaterThan(5);
  expect(screen.queryByText(/NaN|Infinity|Pnull/)).toBeNull();
  expect(screen.getAllByText('0')).toHaveLength(3);
});

test('el Comparador permite elegir otro piloto disponible sin comparar un piloto consigo mismo', async () => {
  global.fetch = mockStandingsFetch({ drivers: [driverStanding(), secondDriverStanding(), driverStanding({ Driver: { driverId: 'tercero', givenName: 'Carla', familyName: 'Tercera' } })] });
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('PRUEBA');
  fireEvent.press(screen.getByLabelText('Seleccionar piloto izquierdo'));
  fireEvent.press(screen.getByLabelText('Elegir a Carla Tercera'));
  expect(screen.getByText('TERCERA')).toBeTruthy();
  expect(screen.getByText('ENSAYO')).toBeTruthy();
  expect(screen.queryByText('PRUEBA')).toBeNull();
});

test('la temporada histórica explícita aparece identificada en ambas pantallas', async () => {
  global.fetch = mockStandingsFetch({ season: '2024' });
  const first = render(<ClasificacionScreen navigation={navigation()} route={{ params: { season: '2024' } }} />);
  await screen.findByText('CAMPEONATO MUNDIAL 2024');
  expect(await screen.findByText('A. PRUEBA')).toBeTruthy();
  first.unmount();
  render(<ComparadorScreen navigation={navigation()} route={{ params: { season: '2024' } }} />);
  await screen.findByText('PRUEBA');
  expect(screen.getByText('TEMPORADA 2024 • CARA A CARA')).toBeTruthy();
});

test('el Comparador informa HTTP 404 y permite un reintento real', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 404 });
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('No se pudo actualizar la comparación: Jolpica HTTP 404');
  expect(screen.queryByText(/Sin conexión|NORRIS|VERSTAPPEN/)).toBeNull();
  global.fetch = mockStandingsFetch();
  fireEvent.press(screen.getByText('Reintentar / Actualizar'));
  expect(await screen.findByText('PRUEBA')).toBeTruthy();
});

function fourAvailableDrivers() {
  return [driverStanding(), secondDriverStanding(),
    driverStanding({ position: '3', positionText: '3', points: '75', wins: '1',
      Driver: { driverId: 'tercera', permanentNumber: '83', givenName: 'Carla', familyName: 'Tercera', code: 'CAR' } }),
    driverStanding({ position: '4', positionText: '4', points: '40.5', wins: '0',
      Driver: { driverId: 'cuarto', permanentNumber: '84', givenName: 'Daniel', familyName: 'Cuarta', code: 'DAN' } }),
  ];
}

function expectPair(left, right) {
  expect(screen.getAllByText(/^(PRUEBA|ENSAYO|TERCERA|CUARTA|SIN_FICHA)$/)
    .map(node => node.props.children)).toEqual([left, right]);
}

function expectMetric(label, left, right) {
  // El Text nativo tiene un contenedor intermedio; la fila agrupa ambos valores y el título.
  const row = within(screen.getByText(label).parent.parent);
  expect(row.getAllByText(/.+/).map(node => String(node.props.children)))
    .toEqual([label, String(left), String(right)]);
}

test('seleccionar el piloto derecho conserva el izquierdo y actualiza sus estadísticas publicadas', async () => {
  global.fetch = mockStandingsFetch({ drivers: fourAvailableDrivers() });
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('PRUEBA');
  fireEvent.press(screen.getByLabelText('Seleccionar piloto derecho'));
  expect(screen.getByText('ELEGIR PILOTO DERECHO')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Elegir a Carla Tercera'));
  expectPair('PRUEBA', 'TERCERA');
  expectMetric('PUNTOS TOTALES', 125.5, 75);
  expectMetric('VICTORIAS', 3, 1);
  expectMetric('POSICIÓN PUBLICADA', '1', '3');
  expectMetric('POLE POSITIONS', 'No disponible', 'No disponible');
  expectMetric('PODIOS', 'No disponible', 'No disponible');
  expect(screen.queryByText('ELEGIR PILOTO DERECHO')).toBeNull();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test.each(['2026', '2024'])('permite cambiar ambos pilotos independientemente con la lista de la temporada %s', async season => {
  global.fetch = mockStandingsFetch({ drivers: fourAvailableDrivers(), season });
  const service = jest.spyOn(F1DataService, 'getChampionshipStandings');
  render(<ComparadorScreen navigation={navigation()} route={season === '2024' ? { params: { season } } : undefined} />);
  await screen.findByText('PRUEBA');
  fireEvent.press(screen.getByLabelText('Seleccionar piloto izquierdo'));
  fireEvent.press(screen.getByLabelText('Elegir a Daniel Cuarta'));
  expectPair('CUARTA', 'ENSAYO');
  expectMetric('PUNTOS TOTALES', 40.5, 100);
  fireEvent.press(screen.getByLabelText('Seleccionar piloto derecho'));
  fireEvent.press(screen.getByLabelText('Elegir a Carla Tercera'));
  expectPair('CUARTA', 'TERCERA');
  expectMetric('PUNTOS TOTALES', 40.5, 75);
  expectMetric('VICTORIAS', 0, 1);
  expectMetric('POSICIÓN PUBLICADA', '4', '3');
  expect(screen.getByText(`TEMPORADA ${season} • CARA A CARA`)).toBeTruthy();
  expect(service).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch.mock.calls.every(([url]) => url.includes(`/${season}/`))).toBe(true);
});

test.each([
  ['izquierdo', 'Bruno Ensayo'],
  ['derecho', 'Ana Prueba'],
])('impide seleccionar al rival al editar el lado %s', async (side, opponent) => {
  global.fetch = mockStandingsFetch({ drivers: fourAvailableDrivers() });
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('PRUEBA');
  fireEvent.press(screen.getByLabelText(`Seleccionar piloto ${side}`));
  const blocked = screen.getByLabelText(`Elegir a ${opponent}`);
  expect(blocked.props.accessibilityState.disabled).toBe(true);
  fireEvent.press(blocked);
  expectPair('PRUEBA', 'ENSAYO');
  expect(screen.getByText(`ELEGIR PILOTO ${side.toUpperCase()}`)).toBeTruthy();
  expectMetric('PUNTOS TOTALES', 125.5, 100);
  expect(screen.getByText('Seleccionado en el otro lado')).toBeTruthy();
});

test('cancelar conserva la comparación y ambos controles generales intercambian la pareja elegida', async () => {
  global.fetch = mockStandingsFetch({ drivers: fourAvailableDrivers() });
  const nav = navigation();
  render(<ComparadorScreen navigation={nav} />);
  await screen.findByText('PRUEBA');
  fireEvent.press(screen.getByLabelText('Seleccionar piloto izquierdo'));
  fireEvent.press(screen.getByText('Cancelar selección'));
  expectPair('PRUEBA', 'ENSAYO');
  expect(screen.queryByText('ELEGIR PILOTO IZQUIERDO')).toBeNull();
  fireEvent.press(screen.getByLabelText('Seleccionar piloto izquierdo'));
  fireEvent.press(screen.getByLabelText('Elegir a Carla Tercera'));
  fireEvent.press(screen.getByLabelText('Seleccionar piloto derecho'));
  fireEvent.press(screen.getByLabelText('Elegir a Daniel Cuarta'));
  fireEvent.press(screen.getByText('INTERCAMBIAR PILOTOS'));
  expectPair('CUARTA', 'TERCERA');
  expectMetric('PUNTOS TOTALES', 40.5, 75);
  fireEvent.press(screen.getByLabelText('Intercambiar pilotos'));
  expectPair('TERCERA', 'CUARTA');
  expectMetric('PUNTOS TOTALES', 75, 40.5);
  fireEvent.press(screen.getByLabelText('Volver'));
  expect(nav.goBack).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('un piloto con ficha y estadísticas incompletas sigue siendo seleccionable sin inventar valores', async () => {
  global.fetch = mockStandingsFetch({ drivers: [driverStanding(), secondDriverStanding(), driverStanding({
    Driver: { driverId: 'sin_ficha' }, Constructors: undefined,
    points: undefined, wins: undefined, position: undefined, positionText: undefined,
  })] });
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('PRUEBA');
  fireEvent.press(screen.getByLabelText('Seleccionar piloto derecho'));
  fireEvent.press(screen.getByLabelText('Elegir a sin_ficha'));
  expectPair('PRUEBA', 'SIN_FICHA');
  expectMetric('PUNTOS TOTALES', 125.5, 'No disponible');
  expectMetric('VICTORIAS', 3, 'No disponible');
  expectMetric('POSICIÓN PUBLICADA', '1', 'No disponible');
  expectMetric('POLE POSITIONS', 'No disponible', 'No disponible');
  expectMetric('PODIOS', 'No disponible', 'No disponible');
  expect(screen.queryByText(/NaN|Infinity|-0.180s/)).toBeNull();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('con dos pilotos solo permite conservar la selección propia o intercambiar ambos lados', async () => {
  render(<ComparadorScreen navigation={navigation()} />);
  await screen.findByText('PRUEBA');
  fireEvent.press(screen.getByLabelText('Seleccionar piloto derecho'));
  expect(screen.getByLabelText('Elegir a Ana Prueba').props.accessibilityState.disabled).toBe(true);
  expect(screen.getByLabelText('Elegir a Bruno Ensayo').props.accessibilityState.disabled).toBe(false);
  fireEvent.press(screen.getByLabelText('Elegir a Bruno Ensayo'));
  expectPair('PRUEBA', 'ENSAYO');
  fireEvent.press(screen.getByText('INTERCAMBIAR PILOTOS'));
  expectPair('ENSAYO', 'PRUEBA');
  expectMetric('PUNTOS TOTALES', 100, 125.5);
});
