import React from 'react';
import { Animated } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import HistorialWebScreen from '../../src/screens/HistorialWebScreen';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { seasonsResponse, bahrain, monza, silverstone, winners2024, qualifying2024, raceResponse, okResponse } from '../fixtures/jolpica';

jest.mock('../../src/storage/LocalStorageManager', () => ({
  obtenerCache: jest.fn(),
  guardarCache: jest.fn(),
  obtenerUltimaCopiaCache: jest.fn(),
}));

const originalFetch = global.fetch;

function respond(url) {
  const path = url.replace('https://api.jolpi.ca/ergast/f1', '');
  const responses = {
    '/seasons.json?limit=100': seasonsResponse,
    '/2024.json': raceResponse([bahrain, monza]),
    '/2024/results/1.json?limit=100': raceResponse(winners2024),
    '/2024/qualifying/1.json?limit=100': raceResponse(qualifying2024),
    '/1950.json': raceResponse([silverstone]),
    '/1950/results/1.json?limit=100': raceResponse([]),
    '/1950/qualifying/1.json?limit=100': raceResponse([]),
    '/2023.json': raceResponse([]),
  };
  if (!responses[path]) throw new Error(`Petición inesperada: ${path}`);
  return Promise.resolve(okResponse(responses[path]));
}

function openHistory() {
  return render(<HistorialWebScreen navigation={{ goBack: jest.fn() }} />);
}

async function selectSeason(year) {
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada' }));
  fireEvent.press(await screen.findByRole('button', { name: `Temporada ${year}` }));
}

beforeEach(() => {
  jest.clearAllMocks();
  // Usar la animación inmediata de React Native evita temporizadores visuales en estos casos.
  jest.spyOn(Animated, 'timing').mockImplementation(
    jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing,
  );
  LocalStorageManager.obtenerCache.mockResolvedValue(null);
  LocalStorageManager.obtenerUltimaCopiaCache.mockResolvedValue(null);
  LocalStorageManager.guardarCache.mockResolvedValue(undefined);
  global.fetch = jest.fn(respond);
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test('muestra carga inicial y solo descarga la temporada más reciente de la lista recibida', async () => {
  openHistory();
  expect(screen.getByText('Cargando temporadas...')).toBeTruthy();

  expect(await screen.findByText('Italian Grand Prix')).toBeTruthy();
  expect(screen.getByText('Temporada 2024')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(4);
  expect(global.fetch.mock.calls.some(([url]) => url.includes('/1950') || url.includes('/2023'))).toBe(false);
});

test('permite elegir 1950 y reemplaza las filas anteriores con los datos de ese año', async () => {
  openHistory();
  await screen.findByText('Italian Grand Prix');

  await selectSeason('1950');

  expect(await screen.findByText('British Grand Prix')).toBeTruthy();
  expect(screen.getByText('Temporada 1950')).toBeTruthy();
  expect(screen.queryByText('Italian Grand Prix')).toBeNull();
  expect(screen.getAllByText('—')).toHaveLength(2);
  expect(global.fetch).toHaveBeenCalledWith('https://api.jolpi.ca/ergast/f1/1950.json', expect.anything());
});

test('filtra los resultados por piloto, muestra búsqueda vacía y permite limpiarla sin consultar la red', async () => {
  openHistory();
  await screen.findByText('Italian Grand Prix');
  const requests = global.fetch.mock.calls.length;
  const input = screen.getByLabelText('Buscar en el historial');

  fireEvent.changeText(input, ' leCLerc ');
  expect(screen.getByText('Italian Grand Prix')).toBeTruthy();
  expect(screen.queryByText('Bahrain Grand Prix')).toBeNull();

  fireEvent.changeText(input, 'sin coincidencias');
  expect(screen.getByText('No se encontraron carreras con ese filtro.')).toBeTruthy();

  fireEvent.press(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
  expect(screen.getByText('Bahrain Grand Prix')).toBeTruthy();
  expect(screen.getByText('Italian Grand Prix')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(requests);
});

test('muestra el error de temporadas y permite reintentar', async () => {
  global.fetch.mockRejectedValueOnce(new Error('Sin conexión'));
  openHistory();

  expect(await screen.findByText('No se pudieron cargar las temporadas de Jolpica.')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Italian Grand Prix')).toBeTruthy();
});

test('muestra el error de la temporada seleccionada y reintenta sin volver a descargar la lista de años', async () => {
  global.fetch.mockImplementation(url => url.endsWith('/2024.json')
    ? Promise.resolve({ ok: false, status: 503 })
    : respond(url));
  openHistory();

  expect(await screen.findByText('No se pudieron cargar las carreras de 2024.')).toBeTruthy();
  global.fetch.mockImplementation(respond);
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Italian Grand Prix')).toBeTruthy();
  expect(global.fetch.mock.calls.filter(([url]) => url.includes('/seasons.json'))).toHaveLength(1);
});

test('distingue una temporada sin carreras de una búsqueda sin coincidencias', async () => {
  openHistory();
  await screen.findByText('Italian Grand Prix');

  await selectSeason('2023');

  expect(await screen.findByText('No hay carreras disponibles para esta temporada.')).toBeTruthy();
  expect(screen.queryByText('No se encontraron carreras con ese filtro.')).toBeNull();
});

test('informa cuando Jolpica no devuelve temporadas y no intenta cargar carreras', async () => {
  global.fetch.mockResolvedValue(okResponse({ MRData: { total: '0', SeasonTable: { Seasons: [] } } }));
  openHistory();

  expect(await screen.findByText('No hay temporadas disponibles.')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('selecciona un año reciente recibido de la API sin depender de 2023 o 2024', async () => {
  global.fetch.mockImplementation(url => Promise.resolve(okResponse(url.includes('/seasons.json')
    ? { MRData: { total: '2', SeasonTable: { Seasons: [{ season: '1950' }, { season: '2026' }] } } }
    : raceResponse([]))));
  openHistory();

  await screen.findByText('No hay carreras disponibles para esta temporada.');
  expect(screen.getByText('Temporada 2026')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledWith('https://api.jolpi.ca/ergast/f1/2026.json', expect.anything());
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('presenta datos parciales con aviso y permite completar la clasificación al reintentar', async () => {
  global.fetch.mockImplementation(url => url.includes('/qualifying/')
    ? Promise.reject(new Error('Clasificación no disponible'))
    : respond(url));
  openHistory();
  await screen.findByText('Italian Grand Prix');
  expect(screen.getByText('No se pudieron cargar todos los resultados. Los datos no disponibles se muestran con —.')).toBeTruthy();
  expect(screen.getByText('C. LECLERC')).toBeTruthy();

  global.fetch.mockImplementation(respond);
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar actualización' }));

  expect(await screen.findByText('L. NORRIS')).toBeTruthy();
  expect(screen.queryByText('No se pudieron cargar todos los resultados. Los datos no disponibles se muestran con —.')).toBeNull();
});

test('una respuesta lenta de otro año no sobrescribe la temporada actual', async () => {
  let finishOldRequest;
  global.fetch.mockImplementation(url => url.endsWith('/1950.json')
    ? new Promise(resolve => { finishOldRequest = resolve; })
    : respond(url));
  openHistory();
  await screen.findByText('Italian Grand Prix');

  await selectSeason('1950');
  await waitFor(() => expect(finishOldRequest).toEqual(expect.any(Function)));
  expect(screen.getByText('Cargando carreras de 1950...')).toBeTruthy();
  await selectSeason('2024');
  await screen.findByText('Italian Grand Prix');

  await act(async () => {
    finishOldRequest(okResponse(raceResponse([silverstone])));
  });

  expect(screen.getByText('Italian Grand Prix')).toBeTruthy();
  expect(screen.getByText('Temporada 2024')).toBeTruthy();
  expect(screen.queryByText('British Grand Prix')).toBeNull();
});
