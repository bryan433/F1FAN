import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import F1DataService from '../../src/services/F1DataService';
import OpenF1Client from '../../src/services/OpenF1Client';
import { GranPremio } from '../../src/models/GranPremio';
import { Piloto } from '../../src/models/Piloto';
import { Escuderia } from '../../src/models/Escuderia';
import { DRIVERS, TEAMS } from '../../src/data/teamsAndDrivers';
import { LIVE_TIMING_DATA } from '../../src/data/mockData';
import { calendarRace } from '../fixtures/calendar';
import { okResponse, raceResponse } from '../fixtures/jolpica';
import { driverRecord, apiDriverRecord, teamRecord } from '../fixtures/standings';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const originalFetch = global.fetch;
const now = '2026-11-01T12:00:00Z';

beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date(now));
  await AsyncStorage.clear();
  F1DataService.isOfflineMode = false;
  F1DataService.listeners = [];
  F1DataService.calendarWarning = null;
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('getCalendar devuelve modelos con sesiones propias y deja de consultar OpenF1 para el calendario', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([calendarRace()])));
  const calendar = await F1DataService.getCalendar('2026');
  expect(Array.isArray(calendar)).toBe(true);
  expect(calendar[0]).toBeInstanceOf(GranPremio);
  expect(calendar[0]).toMatchObject({ season: '2026', round: '1', source: 'jolpica', isNext: true });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch.mock.calls[0][0]).toBe('https://api.jolpi.ca/ergast/f1/2026.json');
});

test('getNextRace usa el año actual de Santiago y devuelve el GP futuro más cercano', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([
    calendarRace({ round: '1', date: '2026-10-25' }),
    calendarRace({ round: '2', date: '2026-11-15' }),
    calendarRace({ round: '3', date: '2026-11-08' }),
  ])));
  const next = await F1DataService.getNextRace();
  expect(next).toBeInstanceOf(GranPremio);
  expect(next).toMatchObject({ disponible: true, season: '2026', round: '3', esProximo: true });
  expect(global.fetch.mock.calls.map(([url]) => url)).toEqual(['https://api.jolpi.ca/ergast/f1/2026.json']);
  expect(next.calcularTiempoRestante()).toEqual({ days: 7, hours: 5, minutes: 0, seconds: 0, isPassed: false });
});

test('el año por defecto respeta el cambio de fecha chileno en Año Nuevo', async () => {
  jest.setSystemTime(new Date('2027-01-01T01:00:00Z')); // En Santiago todavía es 2026.
  global.fetch.mockResolvedValue(okResponse(raceResponse([])));
  await F1DataService.getCalendar();
  expect(global.fetch.mock.calls[0][0]).toBe('https://api.jolpi.ca/ergast/f1/2026.json');
});

test('al terminar la temporada consulta únicamente años futuros publicados hasta encontrar un GP', async () => {
  global.fetch.mockImplementation(url => {
    if (url.endsWith('/2026.json')) return Promise.resolve(okResponse(raceResponse([calendarRace({ date: '2026-10-25' })])));
    if (url.includes('/seasons.json')) return Promise.resolve(okResponse({ MRData: { total: '4', SeasonTable: { Seasons: [
      { season: '2025' }, { season: '2026' }, { season: '2027' }, { season: '2028' },
    ] } } }));
    if (url.endsWith('/2027.json')) return Promise.resolve(okResponse(raceResponse([calendarRace({ season: '2027', date: '2027-03-07' })])));
    throw new Error(`Consulta inesperada: ${url}`);
  });
  const next = await F1DataService.getNextRace();
  expect(next).toMatchObject({ season: '2027', round: '1', esProximo: true });
  expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([
    'https://api.jolpi.ca/ergast/f1/2026.json',
    'https://api.jolpi.ca/ergast/f1/seasons.json?limit=100',
    'https://api.jolpi.ca/ergast/f1/2027.json',
  ]);
});

test('si solo hay carreras pasadas devuelve ausencia explícita y no el último GP de la temporada', async () => {
  global.fetch
    .mockResolvedValueOnce(okResponse(raceResponse([calendarRace({ date: '2026-10-25' })])))
    .mockResolvedValueOnce(okResponse({ MRData: { total: '1', SeasonTable: { Seasons: [{ season: '2026' }] } } }));
  const next = await F1DataService.getNextRace();
  expect(next).toMatchObject({ disponible: false, estadoConsulta: 'sin_proxima_carrera', esProximo: false, idMeeting: null, sesiones: [] });
});

test('si el calendario está vacío no lo reemplaza por Singapur', async () => {
  global.fetch
    .mockResolvedValueOnce(okResponse(raceResponse([])))
    .mockResolvedValueOnce(okResponse({ MRData: { total: '0', SeasonTable: { Seasons: [] } } }));
  expect(await F1DataService.getNextRace()).toMatchObject({ disponible: false, estadoConsulta: 'sin_proxima_carrera', sesiones: [] });
});

test('no oculta una fecha incompleta seleccionando otra carrera como si la primera no existiera', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([calendarRace({ date: undefined }), calendarRace({ round: '2' })])));
  expect(await F1DataService.getNextRace()).toMatchObject({ disponible: false, estadoConsulta: 'calendario_incompleto', sesiones: [] });
});

test('reutiliza la caché de Jolpica y recalcula cuál es el próximo GP al avanzar el reloj', async () => {
  const races = [calendarRace({ round: '1', date: '2026-11-01', time: '12:20:00Z' }), calendarRace({ round: '2' })];
  global.fetch.mockResolvedValue(okResponse(raceResponse(races)));
  expect((await F1DataService.getNextRace()).round).toBe('1');
  jest.setSystemTime(new Date('2026-11-01T12:30:00Z'));
  expect((await F1DataService.getNextRace()).round).toBe('2');
  expect(global.fetch).toHaveBeenCalledTimes(1);
  // Se guardan datos originales, no los estados derivados del reloj.
  expect(await LocalStorageManager.obtenerCache('jolpica_v1_calendar_2026')).toEqual(races);
});

test('si falla la red usa el calendario vencido del mismo año y conserva un aviso', async () => {
  await LocalStorageManager.guardarCache('jolpica_v1_calendar_2026', [calendarRace()]);
  jest.setSystemTime(new Date('2026-11-01T14:00:00Z'));
  global.fetch.mockRejectedValue(new Error('Sin conexión'));
  const next = await F1DataService.getNextRace();
  expect(next).toMatchObject({ disponible: true, season: '2026', round: '1' });
  expect(next.warning).toContain('última copia guardada');
  expect(F1DataService.isOfflineMode).toBe(true);
});

test('un GP vencido en caché nunca se convierte en próximo por estar sin conexión', async () => {
  await LocalStorageManager.guardarCache('jolpica_v1_calendar_2026', [calendarRace({ date: '2026-11-01', time: '15:00:00Z' })]);
  await LocalStorageManager.guardarCache('jolpica_v1_seasons', ['2026']);
  jest.setSystemTime(new Date('2026-11-03T12:00:00Z'));
  global.fetch.mockRejectedValue(new Error('Sin conexión'));
  const next = await F1DataService.getNextRace();
  expect(next).toMatchObject({ disponible: false, estadoConsulta: 'sin_proxima_carrera', sesiones: [] });
  expect(next.warning).toContain('última copia guardada');
});

test('sin copia de Jolpica propaga el error, aunque exista una antigua caché simulada', async () => {
  await LocalStorageManager.guardarCache('next_race_meeting', { nombreOficial: 'Singapur simulado', sesiones: [{ tipo: 'Practice 2' }] });
  await LocalStorageManager.guardarCache('calendar_2026', [{ name: 'Singapur simulado' }]);
  global.fetch.mockRejectedValue(new Error('Sin conexión'));
  await expect(F1DataService.getNextRace()).rejects.toThrow('Sin conexión');
  await expect(F1DataService.getCalendar('2026')).rejects.toThrow('Sin conexión');
  expect(F1DataService.isOfflineMode).toBe(true);
});

describe('notificaciones del estado de conexión', () => {
  test('notifica a todos los suscriptores solamente cuando cambia el estado', () => {
    const first = jest.fn();
    const second = jest.fn();
    F1DataService.subscribeConnectionChange(first);
    F1DataService.subscribeConnectionChange(second);

    F1DataService.setOfflineMode(false);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    F1DataService.setOfflineMode(true);
    F1DataService.setOfflineMode(true);
    F1DataService.setOfflineMode(false);
    expect(first.mock.calls).toEqual([[true], [false]]);
    expect(second.mock.calls).toEqual([[true], [false]]);
    expect(F1DataService.isOfflineMode).toBe(false);
  });

  test('cancelar una suscripción no elimina las demás y puede repetirse', () => {
    const removed = jest.fn();
    const retained = jest.fn();
    const unsubscribe = F1DataService.subscribeConnectionChange(removed);
    F1DataService.subscribeConnectionChange(retained);
    unsubscribe();
    unsubscribe();
    F1DataService.setOfflineMode(true);
    expect(removed).not.toHaveBeenCalled();
    expect(retained).toHaveBeenCalledWith(true);
    expect(retained).toHaveBeenCalledTimes(1);
  });
});

describe('clasificaciones usadas por ClasificacionScreen', () => {
  beforeEach(() => {
    // Se sustituyen únicamente las consultas externas; F1DataService y los modelos son reales.
    jest.spyOn(OpenF1Client, 'getDriverStandings').mockResolvedValue([]);
    jest.spyOn(OpenF1Client, 'getTeamStandings').mockResolvedValue([]);
  });

  afterEach(() => {
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('pilotos: usa la caché vigente, ordena por puntos y aplica el favorito persistido', async () => {
    await LocalStorageManager.guardarCache('driver_standings', [
      driverRecord({ puntos: 10 }),
      driverRecord({ idPiloto: '102', numero: 22, puntos: 30 }),
    ]);
    await LocalStorageManager.guardarFavorito(102);

    const drivers = await F1DataService.getDriverStandings();
    expect(drivers.every(driver => driver instanceof Piloto)).toBe(true);
    expect(drivers.map(driver => driver.idPiloto)).toEqual(['102', 101]);
    expect(drivers.map(driver => driver.esFavorito)).toEqual([true, false]);
    expect(drivers[0]).toMatchObject({ puntos: 30, codigo: 'PDP', nombreEscuderia: 'Equipo de prueba', colorHex: '#123456' });
    expect(drivers[0].obtenerNombreCompleto()).toBe('Piloto De prueba');
    expect(OpenF1Client.getDriverStandings).not.toHaveBeenCalled();
  });

  test('pilotos: adapta la respuesta externa, guarda datos originales y recupera el estado conectado', async () => {
    const raw = [driverRecord(), apiDriverRecord()];
    OpenF1Client.getDriverStandings.mockResolvedValue(raw);
    F1DataService.isOfflineMode = true;
    const listener = jest.fn();
    F1DataService.subscribeConnectionChange(listener);
    const drivers = await F1DataService.getDriverStandings();

    // 2024 es el comportamiento heredado de Clasificación, no el año del calendario Jolpica.
    expect(OpenF1Client.getDriverStandings).toHaveBeenCalledWith(2024);
    expect(drivers.map(driver => driver.idPiloto)).toEqual([102, 101]);
    expect(drivers[0]).toBeInstanceOf(Piloto);
    expect(drivers[0]).toMatchObject({
      numero: 102, nombre: 'Segundo', apellido: 'Piloto', codigo: 'SDP', pais: 'TST',
      escuderiaId: 'Otro equipo', nombreEscuderia: 'Otro equipo', colorHex: '#654321',
      puntos: 35, victorias: 0, podios: 0, poles: 0, esFavorito: false,
      urlFoto: 'https://example.invalid/otro-piloto.png',
    });
    expect(await LocalStorageManager.obtenerCache('driver_standings')).toEqual(raw);
    expect(F1DataService.isOfflineMode).toBe(false);
    expect(listener.mock.calls).toEqual([[false]]);

    // El favorito puede cambiar aunque se reutilice la misma clasificación en caché.
    await LocalStorageManager.guardarFavorito('101');
    const updated = await F1DataService.getDriverStandings();
    expect(updated.map(driver => driver.esFavorito)).toEqual([false, true]);
    expect(OpenF1Client.getDriverStandings).toHaveBeenCalledTimes(1);
  });

  test.each([[], null, {}])('pilotos: una respuesta vacía o inválida (%p) conserva la última copia', async response => {
    const backup = [driverRecord({ puntos: 12 }), driverRecord({ idPiloto: 102, puntos: 50 })];
    await LocalStorageManager.guardarCache('driver_standings', backup);
    jest.setSystemTime(new Date('2026-11-01T14:00:00Z'));
    OpenF1Client.getDriverStandings.mockResolvedValue(response);
    const save = jest.spyOn(LocalStorageManager, 'guardarCache');

    const drivers = await F1DataService.getDriverStandings();
    expect(drivers.map(driver => driver.puntos)).toEqual([50, 12]);
    expect(drivers[0]).toBeInstanceOf(Piloto);
    expect(OpenF1Client.getDriverStandings).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(await LocalStorageManager.obtenerUltimaCopiaCache('driver_standings')).toEqual(backup);
  });

  test('pilotos: ante error conserva la copia vencida, avisa y activa offline', async () => {
    await LocalStorageManager.guardarCache('driver_standings', [driverRecord()]);
    jest.setSystemTime(new Date('2026-11-01T14:00:00Z'));
    OpenF1Client.getDriverStandings.mockRejectedValue(new Error('Consulta de pilotos fallida'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const listener = jest.fn();
    F1DataService.subscribeConnectionChange(listener);

    const drivers = await F1DataService.getDriverStandings();
    expect(drivers).toHaveLength(1);
    expect(drivers[0]).toMatchObject({ idPiloto: 101, puntos: 10 });
    expect(F1DataService.isOfflineMode).toBe(true);
    expect(listener.mock.calls).toEqual([[true]]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[F1DataService] Error en getDriverStandings:', 'Consulta de pilotos fallida');
  });

  test('pilotos: sin respuesta ni copia utiliza el respaldo local existente, que no es una consulta oficial', async () => {
    const drivers = await F1DataService.getDriverStandings();
    expect(OpenF1Client.getDriverStandings).toHaveBeenCalledTimes(1);
    expect(drivers).toHaveLength(DRIVERS.length);
    expect(drivers.every(driver => driver instanceof Piloto)).toBe(true);
    const localDriver = DRIVERS[0];
    expect(drivers.find(driver => driver.idPiloto === localDriver.idPiloto)).toMatchObject({
      nombre: localDriver.nombre, apellido: localDriver.apellido, puntos: localDriver.puntos,
    });
    expect(drivers.map(driver => driver.puntos)).toEqual([...drivers.map(driver => driver.puntos)].sort((a, b) => b - a));
  });

  test('pilotos: mantiene cero puntos explícitos y tolera campos opcionales y puntuaciones inválidas', async () => {
    await LocalStorageManager.guardarCache('driver_standings', [
      { id: 'sin-datos', puntos: 0, points: 99 },
      { id: 'alternativo', broadcast_name: 'Nombre alternativo', points: 'dato inválido' },
    ]);
    const drivers = await F1DataService.getDriverStandings();
    expect(drivers[0]).toMatchObject({
      idPiloto: 'sin-datos', numero: 'sin-datos', nombre: 'Piloto', apellido: '',
      codigo: 'F1', nombreEscuderia: 'F1 Team', colorHex: '#FFFFFF',
      puntos: 0, esFavorito: false, urlFoto: null,
    });
    expect(drivers[1]).toMatchObject({ idPiloto: 'alternativo', nombre: 'Nombre alternativo', puntos: 0 });
    expect(OpenF1Client.getDriverStandings).not.toHaveBeenCalled();
  });

  test.each([
    ['getDriverStandings', 'driver_standings', 'getDriverStandings'],
    ['getTeamStandings', 'team_standings', 'getTeamStandings'],
  ])('%s: respeta una caché vigente vacía sin reemplazarla por datos locales', async (method, cacheKey, clientMethod) => {
    await LocalStorageManager.guardarCache(cacheKey, []);
    expect(await F1DataService[method]()).toEqual([]);
    expect(OpenF1Client[clientMethod]).not.toHaveBeenCalled();
  });

  test('escuderías: la caché vigente devuelve modelos y evita consultas externas', async () => {
    const raw = [teamRecord(), teamRecord({ idEscuderia: 'segundo_equipo', nombre: 'Segundo equipo', puntos: 20 })];
    await LocalStorageManager.guardarCache('team_standings', raw);
    const teams = await F1DataService.getTeamStandings();
    expect(teams.every(team => team instanceof Escuderia)).toBe(true);
    expect(teams[0]).toMatchObject({ idEscuderia: 'equipo_prueba', nombre: 'Equipo de prueba', puntos: 50, pilotos: [101, 102] });
    expect(teams[1]).toMatchObject({ idEscuderia: 'segundo_equipo', puntos: 20 });
    expect(OpenF1Client.getTeamStandings).not.toHaveBeenCalled();
  });

  test('escuderías: una respuesta compatible con el modelo se almacena y desactiva offline', async () => {
    const raw = [teamRecord(), teamRecord({ idEscuderia: 'segundo_equipo', puntos: 0 })];
    OpenF1Client.getTeamStandings.mockResolvedValue(raw);
    F1DataService.isOfflineMode = true;
    const teams = await F1DataService.getTeamStandings();
    expect(OpenF1Client.getTeamStandings).toHaveBeenCalledWith(2024);
    expect(teams[0]).toBeInstanceOf(Escuderia);
    expect(teams[0]).toMatchObject({ nombre: 'Equipo de prueba', puntos: 50 });
    expect(teams[1].puntos).toBe(0);
    expect(await LocalStorageManager.obtenerCache('team_standings')).toEqual(raw);
    expect(F1DataService.isOfflineMode).toBe(false);
    await F1DataService.getTeamStandings();
    expect(OpenF1Client.getTeamStandings).toHaveBeenCalledTimes(1);
  });

  test.each([[], null, {}])('escuderías: una respuesta vacía o inválida (%p) recupera y ordena la última copia', async response => {
    const backup = [teamRecord({ puntos: 12 }), teamRecord({ idEscuderia: 'segundo_equipo', puntos: 50 })];
    await LocalStorageManager.guardarCache('team_standings', backup);
    jest.setSystemTime(new Date('2026-11-01T14:00:00Z'));
    OpenF1Client.getTeamStandings.mockResolvedValue(response);
    const save = jest.spyOn(LocalStorageManager, 'guardarCache');
    const teams = await F1DataService.getTeamStandings();
    expect(teams.map(team => team.puntos)).toEqual([50, 12]);
    expect(teams[0]).toBeInstanceOf(Escuderia);
    expect(OpenF1Client.getTeamStandings).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(await LocalStorageManager.obtenerUltimaCopiaCache('team_standings')).toEqual(backup);
  });

  test('escuderías: un error externo conserva la copia vencida y activa offline', async () => {
    await LocalStorageManager.guardarCache('team_standings', [teamRecord()]);
    jest.setSystemTime(new Date('2026-11-01T14:00:00Z'));
    OpenF1Client.getTeamStandings.mockRejectedValue(new Error('Consulta de equipos fallida'));
    const teams = await F1DataService.getTeamStandings();
    expect(teams[0]).toMatchObject({ idEscuderia: 'equipo_prueba', nombre: 'Equipo de prueba', puntos: 50 });
    expect(F1DataService.isOfflineMode).toBe(true);
  });

  describe('regresión de integridad del respaldo local de escuderías', () => {
    let teams;

    beforeEach(async () => {
      teams = await F1DataService.getTeamStandings();
      expect(OpenF1Client.getTeamStandings).toHaveBeenCalledTimes(1);
      expect(teams).toHaveLength(TEAMS.length);
    });

    test('conserva identidad, nombre y puntos del respaldo local', () => {
      const expected = TEAMS.map(team => ({ idEscuderia: team.id, nombre: team.name, puntos: team.points }));
      expect(teams.every(team => team instanceof Escuderia)).toBe(true);
      expect(teams).toEqual(expect.arrayContaining(expected.map(team => expect.objectContaining(team))));
    });
  });
});

describe('getLiveTiming todavía utilizado por LiveScreen', () => {
  beforeEach(() => {
    jest.spyOn(OpenF1Client, 'getSessionResults');
  });

  afterEach(() => {
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test.each([undefined, 12345])('devuelve la respuesta no vacía sin modificarla para la sesión %p', async sessionId => {
    const response = [{ driverNumber: 101, position: 1, driverCode: 'PDP', gap: '0' }];
    OpenF1Client.getSessionResults.mockResolvedValue(response);
    F1DataService.isOfflineMode = true;
    const result = await F1DataService.getLiveTiming(sessionId);
    expect(result).toBe(response);
    // 9157 es el ID predeterminado heredado; no prueba que exista una sesión actual.
    expect(OpenF1Client.getSessionResults).toHaveBeenCalledWith(sessionId ?? 9157);
    expect(F1DataService.isOfflineMode).toBe(false);
  });

  test.each([[], null, {}])('una respuesta vacía o inválida (%p) devuelve el respaldo simulado existente', async response => {
    OpenF1Client.getSessionResults.mockResolvedValue(response);
    F1DataService.isOfflineMode = true;
    expect(await F1DataService.getLiveTiming(12345)).toBe(LIVE_TIMING_DATA);
    // Un respaldo no confirma una recuperación de conexión.
    expect(F1DataService.isOfflineMode).toBe(true);
  });

  test('un error de consulta activa offline y devuelve datos simulados sin lanzar una excepción', async () => {
    OpenF1Client.getSessionResults.mockRejectedValue(new Error('Consulta de sesión fallida'));
    const listener = jest.fn();
    F1DataService.subscribeConnectionChange(listener);
    expect(await F1DataService.getLiveTiming(12345)).toBe(LIVE_TIMING_DATA);
    expect(F1DataService.isOfflineMode).toBe(true);
    expect(listener.mock.calls).toEqual([[true]]);
  });
});

describe('ramas adicionales del calendario vigente', () => {
  test('omite una temporada futura publicada sin carreras y busca en la siguiente', async () => {
    global.fetch.mockImplementation(async url => {
      if (url.endsWith('/2026.json') || url.endsWith('/2027.json')) return okResponse(raceResponse([]));
      if (url.includes('/seasons.json')) return okResponse({ MRData: { total: '4', SeasonTable: { Seasons: [
        { season: '2029' }, { season: '2027' }, { season: '2028' }, { season: '2026' },
      ] } } });
      if (url.endsWith('/2028.json')) return okResponse(raceResponse([calendarRace({ season: '2028', date: '2028-03-05' })]));
      throw new Error(`Consulta inesperada: ${url}`);
    });
    const next = await F1DataService.getNextRace();
    expect(next).toMatchObject({ season: '2028', round: '1', disponible: true });
    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://api.jolpi.ca/ergast/f1/2026.json',
      'https://api.jolpi.ca/ergast/f1/seasons.json?limit=100',
      'https://api.jolpi.ca/ergast/f1/2027.json',
      'https://api.jolpi.ca/ergast/f1/2028.json',
    ]);
  });

  test('conserva la advertencia incluso en un calendario vacío y la limpia tras recuperarse', async () => {
    await LocalStorageManager.guardarCache('jolpica_v1_calendar_2026', []);
    jest.setSystemTime(new Date('2026-11-01T14:00:00Z'));
    global.fetch.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(okResponse(raceResponse([calendarRace()])));
    const listener = jest.fn();
    F1DataService.subscribeConnectionChange(listener);

    expect(await F1DataService.getCalendar()).toEqual([]);
    expect(F1DataService.calendarWarning).toContain('última copia guardada');
    expect(F1DataService.isOfflineMode).toBe(true);
    expect(await F1DataService.getCalendar()).toHaveLength(1);
    expect(F1DataService.calendarWarning).toBeNull();
    expect(F1DataService.isOfflineMode).toBe(false);
    expect(listener.mock.calls).toEqual([[true], [false]]);
  });

  test('una temporada inválida limpia advertencias anteriores y propaga la validación sin HTTP', async () => {
    F1DataService.calendarWarning = 'Advertencia anterior';
    await expect(F1DataService.getCalendar('no-es-un-año')).rejects.toThrow('Temporada no válida.');
    expect(F1DataService.calendarWarning).toBeNull();
    expect(F1DataService.isOfflineMode).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
