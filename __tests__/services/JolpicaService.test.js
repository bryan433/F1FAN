import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { getSeasons, getSeasonCalendar, getSeasonHistory, transformRaces, filterHistoricalRaces } from '../../src/services/JolpicaService';
import { seasonsResponse, bahrain, monza, silverstone, bahrainSchedule, sprintSchedule, winners2024, qualifying2024, raceResponse, okResponse } from '../fixtures/jolpica';

jest.mock('../../src/storage/LocalStorageManager', () => ({
  obtenerCache: jest.fn(),
  guardarCache: jest.fn(),
  obtenerUltimaCopiaCache: jest.fn(),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
  LocalStorageManager.obtenerCache.mockResolvedValue(null);
  LocalStorageManager.obtenerUltimaCopiaCache.mockResolvedValue(null);
  LocalStorageManager.guardarCache.mockResolvedValue(undefined);
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('consulta las temporadas, incluye 1950 y ordena de más reciente a más antigua', async () => {
  global.fetch.mockResolvedValue(okResponse(seasonsResponse));

  await expect(getSeasons()).resolves.toEqual({ data: ['2024', '2023', '1950'], warning: null });

  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith(
    'https://api.jolpi.ca/ergast/f1/seasons.json?limit=100',
    expect.objectContaining({ signal: expect.anything() }),
  );
});

test('transforma y une resultados por ronda sin confundir ganador con primero de clasificación', () => {
  expect(transformRaces([monza, bahrain], winners2024, qualifying2024)).toEqual([
    { round: 1, gp: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit', winner: 'M. VERSTAPPEN', qualifyingFirst: 'M. VERSTAPPEN' },
    { round: 16, gp: 'Italian Grand Prix', circuit: 'Autodromo Nazionale di Monza', winner: 'C. LECLERC', qualifyingFirst: 'L. NORRIS' },
  ]);
});

test('no inventa ganador ni clasificación cuando no existen resultados', () => {
  expect(transformRaces([bahrain])).toEqual([
    { round: 1, gp: 'Bahrain Grand Prix', circuit: 'Bahrain International Circuit', winner: null, qualifyingFirst: null },
  ]);
});

test('conserva todos los ganadores cuando Jolpica informa una victoria compartida', () => {
  const results = [{
    ...bahrain,
    Results: [
      { position: '1', Driver: { givenName: 'Piloto', familyName: 'Uno' } },
      { position: '1', Driver: { givenName: 'Piloto', familyName: 'Dos' } },
    ],
  }];
  expect(transformRaces([bahrain], results)[0].winner).toBe('P. UNO / P. DOS');
});

test('filtra por ganador, clasificación, GP o circuito sin distinguir mayúsculas y tolera datos ausentes', () => {
  const races = transformRaces([bahrain, monza], winners2024, qualifying2024);
  expect(filterHistoricalRaces(races, ' leCLerc ')).toEqual([races[1]]);
  expect(filterHistoricalRaces(races, 'NORRIS')).toEqual([races[1]]);
  expect(filterHistoricalRaces(races, 'Bahrain Grand')).toEqual([races[0]]);
  expect(filterHistoricalRaces(races, 'monza')).toEqual([races[1]]);
  expect(filterHistoricalRaces(races, '   ')).toEqual(races);
  expect(filterHistoricalRaces(transformRaces([bahrain]), 'piloto inexistente')).toEqual([]);
});

test('consulta únicamente el año solicitado y guarda su historial completo con una clave propia', async () => {
  global.fetch
    .mockResolvedValueOnce(okResponse(raceResponse([bahrain, monza])))
    .mockResolvedValueOnce(okResponse(raceResponse(winners2024)))
    .mockResolvedValueOnce(okResponse(raceResponse(qualifying2024)));

  const result = await getSeasonHistory('2024');

  expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([
    'https://api.jolpi.ca/ergast/f1/2024.json',
    'https://api.jolpi.ca/ergast/f1/2024/results/1.json?limit=100',
    'https://api.jolpi.ca/ergast/f1/2024/qualifying/1.json?limit=100',
  ]);
  expect(result.warning).toBeNull();
  expect(LocalStorageManager.guardarCache).toHaveBeenCalledWith('jolpica_v1_history_2024', result.data);
});

test('reutiliza una caché vigente sin hacer peticiones', async () => {
  const cached = transformRaces([bahrain], winners2024, qualifying2024);
  LocalStorageManager.obtenerCache.mockResolvedValue(cached);

  await expect(getSeasonHistory('2024')).resolves.toEqual({ data: cached, warning: null });
  expect(LocalStorageManager.obtenerCache).toHaveBeenCalledWith('jolpica_v1_history_2024', 3600000);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('recupera la última copia del mismo año y avisa cuando falla la red', async () => {
  const cached = transformRaces([bahrain]);
  global.fetch.mockRejectedValue(new Error('Sin conexión'));
  LocalStorageManager.obtenerUltimaCopiaCache.mockResolvedValue(cached);

  const result = await getSeasonHistory('2024');

  expect(result.data).toEqual(cached);
  expect(result.warning).toContain('última copia guardada');
  expect(LocalStorageManager.obtenerUltimaCopiaCache).toHaveBeenCalledWith('jolpica_v1_history_2024');
});

test('propaga el error HTTP si no existe una copia guardada', async () => {
  global.fetch.mockResolvedValue({ ok: false, status: 503 });
  await expect(getSeasonHistory('2024')).rejects.toThrow('Jolpica HTTP 503');
});

test('rechaza una respuesta mal formada en lugar de presentarla como temporada vacía', async () => {
  global.fetch.mockResolvedValue(okResponse({ MRData: {} }));
  await expect(getSeasons()).rejects.toThrow('Respuesta de Jolpica no válida');
  expect(LocalStorageManager.guardarCache).not.toHaveBeenCalled();
});

test('devuelve calendario parcial y aviso si falla la clasificación, sin guardar la respuesta incompleta', async () => {
  global.fetch
    .mockResolvedValueOnce(okResponse(raceResponse([bahrain])))
    .mockResolvedValueOnce(okResponse(raceResponse([winners2024[0]])))
    .mockRejectedValueOnce(new Error('Sin clasificación'));

  const result = await getSeasonHistory('2024');

  expect(result.data[0]).toMatchObject({ winner: 'M. VERSTAPPEN', qualifyingFirst: null });
  expect(result.warning).toContain('No se pudieron cargar todos los resultados');
  expect(LocalStorageManager.guardarCache).not.toHaveBeenCalled();
});

test('no consulta resultados adicionales cuando la temporada no tiene carreras', async () => {
  global.fetch.mockResolvedValue(okResponse(raceResponse([])));
  await expect(getSeasonHistory('2024')).resolves.toEqual({ data: [], warning: null });
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('recorre las páginas de temporadas cuando la API no devuelve todos los años juntos', async () => {
  global.fetch
    .mockResolvedValueOnce(okResponse({ MRData: { total: '2', SeasonTable: { Seasons: [{ season: '1950' }] } } }))
    .mockResolvedValueOnce(okResponse({ MRData: { total: '2', SeasonTable: { Seasons: [{ season: '2024' }] } } }));

  await expect(getSeasons()).resolves.toEqual({ data: ['2024', '1950'], warning: null });
  expect(global.fetch.mock.calls[1][0]).toBe('https://api.jolpi.ca/ergast/f1/seasons.json?limit=100&offset=1');
});

test('interrumpe una petición que supera el tiempo máximo y propaga el error sin caché', async () => {
  jest.useFakeTimers();
  try {
    global.fetch.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Tiempo agotado')));
    }));
    const assertion = expect(getSeasonHistory('2024')).rejects.toThrow('Tiempo agotado');
    await jest.advanceTimersByTimeAsync(10000);
    await assertion;
  } finally {
    jest.useRealTimers();
  }
});

describe('getSeasonCalendar', () => {
  test('conserva el calendario, circuito y horarios UTC completos sin consultar resultados', async () => {
    const races = [bahrainSchedule, sprintSchedule];
    global.fetch.mockResolvedValue(okResponse(raceResponse(races)));

    await expect(getSeasonCalendar(2024)).resolves.toEqual({ data: races, warning: null });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.jolpi.ca/ergast/f1/2024.json',
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(LocalStorageManager.guardarCache).toHaveBeenCalledWith('jolpica_v1_calendar_2024', races);
  });

  test.each([
    ['sin horarios de carrera ni sesiones', silverstone],
    ['con una práctica sin hora', { ...silverstone, FirstPractice: { date: '1950-05-11' } }],
  ])('no inventa datos opcionales: %s', async (description, race) => {
    global.fetch.mockResolvedValue(okResponse(raceResponse([race])));

    const result = await getSeasonCalendar('1950');

    expect(result).toEqual({ data: [race], warning: null });
    expect(result.data[0]).not.toHaveProperty('time');
    expect(result.data[0]).not.toHaveProperty('esLive');
    expect(result.data[0]).not.toHaveProperty('vueltaActual');
  });

  test('conserva SprintShootout cuando la API utiliza ese nombre en lugar de SprintQualifying', async () => {
    const { SprintQualifying, ...race } = sprintSchedule;
    const legacyRace = { ...race, SprintShootout: SprintQualifying };
    global.fetch.mockResolvedValue(okResponse(raceResponse([legacyRace])));

    const result = await getSeasonCalendar('2024');

    expect(result.data).toEqual([legacyRace]);
    expect(result.data[0]).not.toHaveProperty('SprintQualifying');
  });

  test('propaga el error HTTP cuando no existe un calendario guardado', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 503 });

    await expect(getSeasonCalendar('2024')).rejects.toThrow('Jolpica HTTP 503');

    expect(LocalStorageManager.obtenerUltimaCopiaCache).toHaveBeenCalledWith('jolpica_v1_calendar_2024');
    expect(LocalStorageManager.guardarCache).not.toHaveBeenCalled();
  });

  test('reutiliza el calendario vigente con una clave diferente a la del Historial', async () => {
    LocalStorageManager.obtenerCache.mockImplementation(async key => (
      key === 'jolpica_v1_calendar_2024' ? [bahrainSchedule] : null
    ));

    await expect(getSeasonCalendar('2024')).resolves.toEqual({ data: [bahrainSchedule], warning: null });

    expect(LocalStorageManager.obtenerCache).toHaveBeenCalledWith('jolpica_v1_calendar_2024', 3600000);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('recupera el último calendario del mismo año y avisa si falla la red', async () => {
    global.fetch.mockRejectedValue(new Error('Sin conexión'));
    LocalStorageManager.obtenerUltimaCopiaCache.mockImplementation(async key => (
      key === 'jolpica_v1_calendar_2024' ? [bahrainSchedule] : null
    ));

    const result = await getSeasonCalendar('2024');

    expect(result.data).toEqual([bahrainSchedule]);
    expect(result.warning).toBe('No se pudo actualizar con Jolpica. Mostrando la última copia guardada.');
    expect(LocalStorageManager.obtenerUltimaCopiaCache).toHaveBeenCalledWith('jolpica_v1_calendar_2024');
    expect(LocalStorageManager.guardarCache).not.toHaveBeenCalled();
  });

  test('recupera todas las páginas del calendario conservando sus horarios', async () => {
    global.fetch
      .mockResolvedValueOnce(okResponse({ MRData: { total: '2', RaceTable: { Races: [bahrainSchedule] } } }))
      .mockResolvedValueOnce(okResponse({ MRData: { total: '2', RaceTable: { Races: [sprintSchedule] } } }));

    await expect(getSeasonCalendar('2024')).resolves.toEqual({
      data: [bahrainSchedule, sprintSchedule],
      warning: null,
    });

    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://api.jolpi.ca/ergast/f1/2024.json',
      'https://api.jolpi.ca/ergast/f1/2024.json?offset=1',
    ]);
    expect(LocalStorageManager.guardarCache).toHaveBeenCalledWith(
      'jolpica_v1_calendar_2024', [bahrainSchedule, sprintSchedule],
    );
  });

  test('devuelve un calendario vacío sin agregar carreras ni consultar otros endpoints', async () => {
    global.fetch.mockResolvedValue(okResponse(raceResponse([])));

    await expect(getSeasonCalendar('2024')).resolves.toEqual({ data: [], warning: null });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(LocalStorageManager.guardarCache).toHaveBeenCalledWith('jolpica_v1_calendar_2024', []);
  });

  test('rechaza un año no válido antes de consultar la red o la caché', async () => {
    await expect(getSeasonCalendar('1949')).rejects.toThrow('Temporada no válida.');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(LocalStorageManager.obtenerCache).not.toHaveBeenCalled();
  });
});
