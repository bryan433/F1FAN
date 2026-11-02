import AsyncStorage from '@react-native-async-storage/async-storage';
import F1DataService from '../../src/services/F1DataService';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import OpenF1Client from '../../src/services/OpenF1Client';
import { getSeasonDriverStandings, getSeasonConstructorStandings } from '../../src/services/JolpicaService';
import { Piloto } from '../../src/models/Piloto';
import { Escuderia } from '../../src/models/Escuderia';
import { driverStanding, secondDriverStanding, constructorStanding, standingsResponse, okStandings, mockStandingsFetch } from '../fixtures/jolpicaStandings';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const originalFetch = global.fetch;
let clock;

beforeEach(async () => {
  jest.clearAllMocks();
  clock = Date.parse('2026-11-02T12:00:00Z');
  jest.spyOn(Date, 'now').mockImplementation(() => clock);
  await AsyncStorage.clear();
  F1DataService.isOfflineMode = false;
  F1DataService.listeners = [];
  global.fetch = mockStandingsFetch();
});

afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test('usa Jolpica y la temporada actual de Santiago, con modelos, identidad y cifras publicadas', async () => {
  const oldDrivers = jest.spyOn(OpenF1Client, 'getDriverStandings');
  const oldTeams = jest.spyOn(OpenF1Client, 'getTeamStandings');
  const result = await F1DataService.getChampionshipStandings();
  expect(result).toMatchObject({ source: 'jolpica', season: '2026', drivers: { origin: 'api', round: '20' }, teams: { origin: 'api', round: '20' } });
  expect(result.drivers.data[0]).toBeInstanceOf(Piloto);
  expect(result.drivers.data[0]).toMatchObject({ idPiloto: 81, driverId: 'piloto_prueba', numero: 81, nombre: 'Ana', apellido: 'Prueba', puntos: 125.5, victorias: 3, podios: null, poles: null, posicionCampeonato: 1, season: '2026', round: '20', esFavorito: false });
  expect(result.teams.data[0]).toBeInstanceOf(Escuderia);
  expect(result.teams.data[0]).toMatchObject({ idEscuderia: 'equipo_prueba', nombre: 'Equipo de prueba', puntos: 225.5, posicionCampeonato: 1, victorias: 3 });
  expect(global.fetch.mock.calls.map(call => call[0])).toEqual([
    'https://api.jolpi.ca/ergast/f1/2026/driverstandings.json?limit=100',
    'https://api.jolpi.ca/ergast/f1/2026/constructorstandings.json?limit=100',
  ]);
  expect(oldDrivers).not.toHaveBeenCalled();
  expect(oldTeams).not.toHaveBeenCalled();
});

test('el cambio de año UTC no adelanta la temporada de Santiago', async () => {
  clock = Date.parse('2027-01-01T01:00:00Z');
  expect((await F1DataService.getChampionshipStandings()).season).toBe('2026');
});

test('una temporada histórica solo se consulta explícitamente y conserva su identificación', async () => {
  global.fetch = mockStandingsFetch({ season: '2024' });
  const result = await F1DataService.getChampionshipStandings(2024);
  expect(result.season).toBe('2024');
  expect(result.drivers.data[0].season).toBe('2024');
  expect(global.fetch.mock.calls.every(([url]) => url.includes('/2024/'))).toBe(true);
});

test('reutiliza caché reciente del mismo origen y año, releyendo el favorito persistido', async () => {
  await F1DataService.getChampionshipStandings();
  await LocalStorageManager.guardarFavorito(81);
  const result = await F1DataService.getChampionshipStandings();
  expect(result.drivers.origin).toBe('cache');
  expect(result.teams.origin).toBe('cache');
  expect(result.drivers.data[0].esFavorito).toBe(true);
  expect(result.drivers.data[1].esFavorito).toBe(false);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('deduplica peticiones simultáneas de las dos tablas', async () => {
  const results = await Promise.all([F1DataService.getChampionshipStandings(), F1DataService.getChampionshipStandings()]);
  expect(results[0].drivers.data).toEqual(results[1].drivers.data);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('HTTP 404 sin caché informa el fallo sin inventar clasificación ni marcar desconexión', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 404 });
  const result = await F1DataService.getChampionshipStandings();
  expect(result.drivers).toMatchObject({ data: [], error: 'Jolpica HTTP 404', origin: null });
  expect(result.teams).toMatchObject({ data: [], error: 'Jolpica HTTP 404', origin: null });
  expect(F1DataService.isOfflineMode).toBe(false);
});

test('un error HTTP recupera solo la última copia real de esa temporada y explica el motivo', async () => {
  await F1DataService.getChampionshipStandings();
  clock += 3600001;
  global.fetch.mockResolvedValue({ ok: false, status: 503 });
  const result = await F1DataService.getChampionshipStandings();
  expect(result.drivers).toMatchObject({ origin: 'stale-cache', error: 'Jolpica HTTP 503', round: '20' });
  expect(result.drivers.warning).toMatch(/última copia guardada/);
  expect(result.drivers.data[0].puntos).toBe(125.5);
  expect(F1DataService.isOfflineMode).toBe(false);
});

test('ignora cachés antiguas de OpenF1 y cachés de otra temporada al fallar la API', async () => {
  await LocalStorageManager.guardarCache('driver_standings', [{ id: 4, puntos: 999 }]);
  await LocalStorageManager.guardarCache('team_standings', [{ id: 'mock', puntos: 999 }]);
  await LocalStorageManager.guardarCache('jolpica_v2_driver_standings_2024', [driverStanding()]);
  global.fetch.mockRejectedValue(new Error('Network request failed'));
  const result = await F1DataService.getChampionshipStandings();
  expect(result.drivers.data).toEqual([]);
  expect(result.teams.data).toEqual([]);
  expect(result.drivers.error).toBe('Network request failed');
});

test('un campeonato todavía no publicado permanece vacío y se guarda como respuesta vacía válida', async () => {
  global.fetch.mockResolvedValue(okStandings({ MRData: { total: '0', StandingsTable: { StandingsLists: [] } } }));
  const first = await F1DataService.getChampionshipStandings();
  expect(first.drivers.data).toEqual([]);
  expect(first.drivers.error).toBeNull();
  const second = await F1DataService.getChampionshipStandings();
  expect(second.drivers.origin).toBe('cache');
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('preserva la tabla disponible cuando falla la otra, sin confundir sus estados', async () => {
  const success = global.fetch;
  global.fetch = jest.fn(url => url.includes('/driverstandings') ? success(url) : Promise.resolve({ ok: false, status: 404 }));
  const result = await F1DataService.getChampionshipStandings();
  expect(result.drivers.data).toHaveLength(2);
  expect(result.drivers.error).toBeNull();
  expect(result.teams.data).toEqual([]);
  expect(result.teams.error).toBe('Jolpica HTTP 404');
});

test('campos ausentes no se convierten en puntos, victorias, número ni posiciones inventados', async () => {
  global.fetch = mockStandingsFetch({ drivers: [driverStanding({ points: undefined, wins: '', position: undefined, positionText: 'D', Constructors: undefined, Driver: { driverId: 'sin_numero' } })], teams: [constructorStanding({ points: undefined, wins: undefined, position: undefined, positionText: 'E' })] });
  await LocalStorageManager.guardarFavorito('sin_numero');
  const result = await F1DataService.getChampionshipStandings();
  expect(result.drivers.data[0]).toMatchObject({ idPiloto: 'sin_numero', numero: null, puntos: null, victorias: null, posicionCampeonato: null, positionText: 'D', nombreEscuderia: 'No disponible', codigo: 'sin_numero', esFavorito: true });
  expect(result.teams.data[0]).toMatchObject({ puntos: null, posicionCampeonato: null, positionText: 'E', victorias: null });
});

test('los ceros publicados se conservan y no se sustituyen por datos locales', async () => {
  global.fetch = mockStandingsFetch({ drivers: [driverStanding({ points: '0', wins: '0' })], teams: [constructorStanding({ points: '0', wins: '0' })] });
  const result = await F1DataService.getChampionshipStandings();
  expect(result.drivers.data[0]).toMatchObject({ puntos: 0, victorias: 0 });
  expect(result.teams.data[0].puntos).toBe(0);
});

test('conserva todos los constructores publicados para un piloto, sin atribuirle uno ficticio', async () => {
  global.fetch = mockStandingsFetch({ drivers: [driverStanding({ Constructors: [{ constructorId: 'a', name: 'Equipo A' }, { constructorId: 'b', name: 'Equipo B' }] })] });
  expect((await F1DataService.getChampionshipStandings()).drivers.data[0].nombreEscuderia).toBe('Equipo A / Equipo B');
});

test('pagina los pilotos completos y mantiene temporada y ronda en cada registro', async () => {
  global.fetch.mockResolvedValueOnce(okStandings(standingsResponse('driver', [driverStanding()], { total: 2 })))
    .mockResolvedValueOnce(okStandings(standingsResponse('driver', [secondDriverStanding()], { total: 2 })));
  const result = await getSeasonDriverStandings(2026);
  expect(result.data).toHaveLength(2);
  expect(result.data.every(entry => entry.season === '2026' && entry.round === '20')).toBe(true);
  expect(global.fetch.mock.calls[1][0]).toContain('&offset=1');
});

test.each([
  ['temporada equivocada', standingsResponse('driver', [driverStanding()], { season: '2024' })],
  ['estructura inválida', { MRData: { total: '1', StandingsTable: {} } }],
  ['identidad ausente', standingsResponse('driver', [driverStanding({ Driver: {} })])],
])('rechaza %s sin contaminar la caché de la temporada solicitada', async (_label, payload) => {
  global.fetch.mockResolvedValue(okStandings(payload));
  await expect(getSeasonDriverStandings(2026)).rejects.toThrow();
  expect(await LocalStorageManager.obtenerUltimaCopiaCache('jolpica_v2_driver_standings_2026')).toBeNull();
});

test('el timeout aborta la petición y permite recuperarse en un reintento posterior', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('Tiempo de espera agotado')));
  }));
  const request = getSeasonDriverStandings(2026);
  const assertion = expect(request).rejects.toThrow('Tiempo de espera agotado');
  await jest.advanceTimersByTimeAsync(10000);
  await assertion;
  jest.useRealTimers();
  global.fetch = mockStandingsFetch();
  expect((await getSeasonDriverStandings(2026)).origin).toBe('api');
});

test.each([1949, 'current', 'incorrecto'])('rechaza temporada inválida %s antes de consultar la API', async year => {
  await expect(F1DataService.getChampionshipStandings(year)).rejects.toThrow('Temporada no válida');
  await expect(getSeasonDriverStandings(year)).rejects.toThrow('Temporada no válida');
  await expect(getSeasonConstructorStandings(year)).rejects.toThrow('Temporada no válida');
  expect(global.fetch).not.toHaveBeenCalled();
});
