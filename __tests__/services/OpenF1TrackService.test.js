import OpenF1Client, { buildQueryString } from '../../src/services/OpenF1Client';
import {
  getTrackOutline, getMeetingsForYear, filterMeetings, getSearchableSeasons, parseOpenF1Date,
  sessionCandidates, pickReferenceLap, cleanLocationPoints, TRACK_ERROR_MESSAGES, TRACK_PROGRESS,
} from '../../src/services/OpenF1TrackService';
import { normalizeTrackPoints, samplePoints, closeLoopIfNear, TRACK_CANVAS } from '../../src/utils/trackGeometry';
import {
  BASE_OPENF1, MEETINGS_2026, meetingOpenF1, sessionOpenF1, lapOpenF1, locationLoop, openF1Server, httpError,
} from '../fixtures/openf1';

const AHORA = Date.parse('2026-11-12T12:00:00Z');
const fetchOriginal = global.fetch;
const limitadorOriginal = OpenF1Client.minIntervalMs;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(AHORA);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Sin esperas reales de 2,1 s del limitador de tasa entre consultas consecutivas.
  OpenF1Client.lastRequestTimestamp = 0;
  OpenF1Client.minIntervalMs = 0;
});
afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = fetchOriginal;
});
afterAll(() => { OpenF1Client.minIntervalMs = limitadorOriginal; });

const rutasDe = fetch => fetch.mock.calls.map(([url]) => url.slice(BASE_OPENF1.length));

describe('normalizeTrackPoints', () => {
  const rectangulo = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }];

  test('escala ambos ejes por igual, centra el trazado e invierte Y para la pantalla', () => {
    // Interior de 260 × 180: la escala la fija el ancho (2,6) y el alto sobrante se reparte arriba y abajo.
    expect(normalizeTrackPoints(rectangulo, { width: 280, height: 200, padding: 10 })).toEqual([
      { x: 10, y: 165 }, { x: 270, y: 165 }, { x: 270, y: 35 }, { x: 10, y: 35 },
    ]);
  });

  test('conserva la proporción del trazado original cuando el lado limitante es el alto', () => {
    const alto = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 100 }];
    const [a, b, c] = normalizeTrackPoints(alto, { width: 280, height: 200, padding: 10 });
    expect(c.y).toBe(10);
    expect(a.y).toBe(190);
    expect((b.x - a.x) / (a.y - c.y)).toBeCloseTo(10 / 100, 5);
    expect((a.x + b.x) / 2).toBeCloseTo(140, 5);
  });

  test('sin invertir Y mantiene la orientación y respeta los límites del lienzo por defecto', () => {
    const puntos = normalizeTrackPoints(rectangulo, { invertY: false });
    expect(puntos[0]).toEqual({ x: TRACK_CANVAS.padding, y: expect.any(Number) });
    expect(puntos[2].y).toBeGreaterThan(puntos[0].y);
    puntos.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(TRACK_CANVAS.width);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(TRACK_CANVAS.height);
    });
  });

  test('descarta coordenadas no numéricas y tolera entradas vacías o degeneradas', () => {
    expect(normalizeTrackPoints([{ x: NaN, y: 1 }, { x: 5, y: null }, null, { x: '3', y: 4 }])).toEqual([]);
    expect(normalizeTrackPoints(undefined)).toEqual([]);
    expect(normalizeTrackPoints([{ x: 7, y: 7 }, { x: 7, y: 7 }], { width: 280, height: 200, padding: 10 }))
      .toEqual([{ x: 140, y: 100 }, { x: 140, y: 100 }]);
  });
});

describe('samplePoints y closeLoopIfNear', () => {
  test('samplePoints limita los segmentos y conserva el primer y el último punto', () => {
    const muchos = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: 0 }));
    const muestra = samplePoints(muchos, 150);
    expect(muestra).toHaveLength(151);
    expect(muestra[0]).toBe(muchos[0]);
    expect(muestra[150]).toBe(muchos[999]);
    const pocos = muchos.slice(0, 20);
    expect(samplePoints(pocos, 150)).toEqual(pocos);
  });

  test('closeLoopIfNear cierra solo un hueco pequeño y no inventa tramos largos', () => {
    const casiCerrado = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 5 }];
    expect(closeLoopIfNear(casiCerrado)).toEqual([...casiCerrado, { x: 0, y: 0 }]);
    const abierto = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(closeLoopIfNear(abierto)).toEqual(abierto);
  });
});

describe('OpenF1Client: filtros de comparación y vueltas', () => {
  test('buildQueryString codifica < y > del operador (no el =) y el valor; el resto igual que URLSearchParams', () => {
    expect(buildQueryString({ session_key: 9472, driver_number: 1, 'date>=': '2024-03-02T15:05:20.099Z', 'date<': '2024-03-02T15:06:56.395Z' }))
      .toBe('session_key=9472&driver_number=1&date%3E=2024-03-02T15%3A05%3A20.099Z&date%3C2024-03-02T15%3A06%3A56.395Z');
    const todos = buildQueryString({ 'date>=': 'a', 'date<=': 'b', 'date>': 'c', 'date<': 'd' });
    expect(todos).toBe('date%3E=a&date%3C=b&date%3Ec&date%3Cd');
    // Sin < ni > crudos: NSURL de iOS 16 o anterior los rechaza y la URL terminaría doblemente codificada.
    expect(todos).not.toMatch(/[<>]/);
    expect(buildQueryString({ q: 'São Paulo', year: 2024 })).toBe(new URLSearchParams({ q: 'São Paulo', year: 2024 }).toString());
    expect(buildQueryString({})).toBe('');
  });

  test('getLocation sin filtros adicionales mantiene la URL anterior y getLaps consulta /laps', async () => {
    global.fetch = openF1Server({ '/location': [], '/laps': [] });
    await OpenF1Client.getLocation(9472, 1);
    await OpenF1Client.getLaps({ session_key: 9472, lap_number: 2 });
    expect(rutasDe(global.fetch)).toEqual(['/location?session_key=9472&driver_number=1', '/laps?session_key=9472&lap_number=2']);
  });

  test('un error HTTP conserva el código de estado para distinguir "sin resultados" (404)', async () => {
    global.fetch = jest.fn(async () => httpError(404));
    await expect(OpenF1Client.getLaps({ session_key: 1 })).rejects.toMatchObject({ message: 'OpenF1 Error HTTP 404', status: 404 });
  });
});

describe('getTrackOutline', () => {
  const vueltaInicio = '2024-03-02T15:05:20.099000+00:00';
  const ventana = '&date%3E=2024-03-02T15%3A05%3A20.099Z&date%3C=2024-03-02T15%3A06%3A56.395Z';

  function servidorFeliz(extra = {}) {
    return openF1Server({
      '/sessions?meeting_key=1229': [
        sessionOpenF1({ session_key: 9468, session_name: 'Qualifying', session_type: 'Qualifying', date_start: '2024-03-01T16:00:00+00:00' }),
        sessionOpenF1({ session_key: 9471, session_name: 'Sprint', session_type: 'Race', date_start: '2024-03-02T10:00:00+00:00' }),
        sessionOpenF1(),
      ],
      '/laps?session_key=9472&lap_number=2': [
        lapOpenF1({ driver_number: 44, is_pit_out_lap: true }),
        lapOpenF1({ driver_number: 16, lap_duration: null }),
        lapOpenF1({ driver_number: 1, date_start: vueltaInicio, lap_duration: 96.296 }),
        lapOpenF1({ driver_number: 63 }),
      ],
      '/location': locationLoop(60),
      ...extra,
    });
  }

  test('elige la carrera, una vuelta válida y consulta la posición del piloto dentro de la vuelta', async () => {
    global.fetch = servidorFeliz();
    const resultado = await getTrackOutline(meetingOpenF1());

    expect(rutasDe(global.fetch)).toEqual([
      '/sessions?meeting_key=1229',
      '/laps?session_key=9472&lap_number=2',
      `/location?session_key=9472&driver_number=1${ventana}`,
    ]);
    expect(resultado).toEqual(expect.objectContaining({
      sessionKey: 9472, sessionName: 'Race', driverNumber: 1, lapNumber: 2, rawPointCount: 60, source: 'openf1',
    }));
    // 60 puntos reales más el cierre de la vuelta (el último punto está junto al primero).
    expect(resultado.points).toHaveLength(61);
    expect(resultado.points[60]).toEqual(resultado.points[0]);
    resultado.points.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(TRACK_CANVAS.padding);
      expect(p.x).toBeLessThanOrEqual(TRACK_CANVAS.width - TRACK_CANVAS.padding);
      expect(p.y).toBeGreaterThanOrEqual(TRACK_CANVAS.padding);
      expect(p.y).toBeLessThanOrEqual(TRACK_CANVAS.height - TRACK_CANVAS.padding);
    });
  });

  test('onProgress (opcional) informa cada paso en orden, antes de la consulta que lo cumple', async () => {
    const fetchFeliz = servidorFeliz();
    const pasos = [];
    global.fetch = jest.fn((...args) => fetchFeliz(...args));
    const onProgress = jest.fn(paso => pasos.push([paso, rutasDe(global.fetch).length]));
    await getTrackOutline(meetingOpenF1(), { onProgress });
    // [paso, consultas ya hechas al informarlo]
    expect(pasos).toEqual([
      [TRACK_PROGRESS.SESSION, 0],
      [TRACK_PROGRESS.LAP, 1],
      [TRACK_PROGRESS.OUTLINE, 2],
    ]);
  });

  test('onProgress se detiene en el paso que falla y no se llama sin un meeting válido', async () => {
    global.fetch = openF1Server({
      '/sessions?meeting_key=1229': [sessionOpenF1()],
    });
    const onProgress = jest.fn();
    await expect(getTrackOutline(meetingOpenF1(), { onProgress })).rejects.toMatchObject({ code: 'NO_LAPS' });
    expect(onProgress.mock.calls.map(([paso]) => paso)).toEqual([TRACK_PROGRESS.SESSION, TRACK_PROGRESS.LAP]);

    onProgress.mockClear();
    await expect(getTrackOutline(undefined, { onProgress })).rejects.toMatchObject({ code: 'INVALID_MEETING' });
    expect(onProgress).not.toHaveBeenCalled();
  });

  test('descarta puntos (0,0), coordenadas inválidas y respeta el orden temporal', async () => {
    const vuelta = locationLoop(40);
    const ruido = [
      { ...vuelta[0], x: 0, y: 0 },
      { ...vuelta[1], x: null },
      { ...vuelta[2], y: 'NaN' },
      { ...vuelta[3], x: Infinity },
    ];
    global.fetch = servidorFeliz({ '/location': [...vuelta].reverse().concat(ruido) });
    const resultado = await getTrackOutline(meetingOpenF1());
    expect(resultado.rawPointCount).toBe(40);
    expect(resultado.points.slice(0, 40)).toEqual(normalizeTrackPoints(cleanLocationPoints(vuelta)));
  });

  test('sin vueltas registradas (HTTP 404 de /laps) informa un error claro y no inventa un trazado', async () => {
    global.fetch = openF1Server({
      '/sessions?meeting_key=1229': [sessionOpenF1(), sessionOpenF1({ session_key: 9468, session_name: 'Qualifying', session_type: 'Qualifying', date_start: '2024-03-01T16:00:00+00:00' })],
    });
    await expect(getTrackOutline(meetingOpenF1())).rejects.toMatchObject({ code: 'NO_LAPS', message: TRACK_ERROR_MESSAGES.NO_LAPS });
    expect(rutasDe(global.fetch)).toEqual([
      '/sessions?meeting_key=1229',
      '/laps?session_key=9472&lap_number=2',
      '/laps?session_key=9468&lap_number=2',
    ]);
    expect(global.fetch.mock.calls.some(([url]) => url.includes('/location'))).toBe(false);
  });

  test('si la carrera no tiene vueltas usa la sesión iniciada más reciente que sí las tenga', async () => {
    global.fetch = openF1Server({
      '/sessions?meeting_key=1229': [
        sessionOpenF1({ session_key: 9467, session_name: 'Practice 3', session_type: 'Practice', date_start: '2024-03-01T12:30:00+00:00' }),
        sessionOpenF1({ session_key: 9468, session_name: 'Qualifying', session_type: 'Qualifying', date_start: '2024-03-01T16:00:00+00:00' }),
        sessionOpenF1(),
      ],
      '/laps?session_key=9472&lap_number=2': [],
      '/laps?session_key=9468&lap_number=2': [lapOpenF1({ session_key: 9468, driver_number: 81 })],
      '/location': locationLoop(30, { driver_number: 81, session_key: 9468 }),
    });
    const resultado = await getTrackOutline(meetingOpenF1());
    expect(resultado).toEqual(expect.objectContaining({ sessionKey: 9468, sessionName: 'Qualifying', driverNumber: 81 }));
    expect(rutasDe(global.fetch)[3]).toMatch(/^\/location\?session_key=9468&driver_number=81&date%3E=/);
  });

  test('un Gran Premio futuro informa que aún no se disputa sin consultar vueltas', async () => {
    global.fetch = openF1Server({
      '/sessions?meeting_key=1300': [sessionOpenF1({ session_key: 11420, meeting_key: 1300, date_start: '2026-11-22T04:00:00+00:00' })],
    });
    await expect(getTrackOutline(meetingOpenF1({ meeting_key: 1300 }))).rejects.toMatchObject({ code: 'NOT_STARTED', message: TRACK_ERROR_MESSAGES.NOT_STARTED });
    expect(rutasDe(global.fetch)).toEqual(['/sessions?meeting_key=1300']);
  });

  test('un Gran Premio cancelado lo informa como tal', async () => {
    global.fetch = openF1Server({
      '/sessions?meeting_key=1282': [sessionOpenF1({ session_key: 11254, meeting_key: 1282, is_cancelled: true })],
    });
    await expect(getTrackOutline(meetingOpenF1({ meeting_key: 1282, is_cancelled: true }))).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  test.each([
    ['HTTP 404 en /sessions', () => httpError(404), { code: 'NO_SESSIONS', message: TRACK_ERROR_MESSAGES.NO_SESSIONS }],
    ['HTTP 503 en /sessions', () => httpError(503), { code: 'NETWORK', message: 'No se pudo consultar OpenF1 (HTTP 503). Inténtalo de nuevo más tarde.' }],
    ['rechazo de red', () => Promise.reject(new TypeError('Network request failed')), { code: 'NETWORK', message: 'No se pudo conectar con OpenF1. Revisa tu conexión e inténtalo de nuevo.' }],
  ])('%s se traduce a un error en español', async (_nombre, respuesta, esperado) => {
    global.fetch = jest.fn(respuesta);
    await expect(getTrackOutline(meetingOpenF1())).rejects.toMatchObject(esperado);
  });

  test('posiciones insuficientes (solo (0,0) o 404) informan falta de datos de posición', async () => {
    global.fetch = servidorFeliz({ '/location': locationLoop(50).map(p => ({ ...p, x: 0, y: 0 })) });
    await expect(getTrackOutline(meetingOpenF1())).rejects.toMatchObject({ code: 'NO_LOCATION', message: TRACK_ERROR_MESSAGES.NO_LOCATION });
    global.fetch = servidorFeliz({ '/location': () => httpError(404) });
    await expect(getTrackOutline(meetingOpenF1())).rejects.toMatchObject({ code: 'NO_LOCATION' });
  });

  test('sin meeting_key válido no consulta la red', async () => {
    global.fetch = jest.fn();
    await expect(getTrackOutline({ nombreCorto: 'GP Jolpica', season: '2026', round: '7' })).rejects.toMatchObject({ code: 'INVALID_MEETING' });
    await expect(getTrackOutline(undefined)).rejects.toMatchObject({ code: 'INVALID_MEETING' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('Selección de sesión y vuelta', () => {
  test('sessionCandidates prioriza Race, luego Sprint y después la sesión iniciada más reciente', () => {
    const sesiones = [
      sessionOpenF1({ session_key: 1, session_name: 'Practice 1', session_type: 'Practice', date_start: '2024-02-29T11:30:00+00:00' }),
      sessionOpenF1({ session_key: 2, session_name: 'Qualifying', session_type: 'Qualifying', date_start: '2024-03-01T16:00:00+00:00' }),
      sessionOpenF1({ session_key: 3, session_name: 'Sprint', session_type: 'Race', date_start: '2024-03-01T10:00:00+00:00' }),
      sessionOpenF1({ session_key: 4, session_name: 'Race', date_start: '2024-03-02T15:00:00+00:00' }),
      sessionOpenF1({ session_key: 5, session_name: 'Practice 2', session_type: 'Practice', date_start: '2099-01-01T00:00:00+00:00' }),
      sessionOpenF1({ session_key: 6, session_name: 'Practice 3', session_type: 'Practice', date_start: '2024-03-01T12:00:00+00:00', is_cancelled: true }),
    ];
    expect(sessionCandidates(sesiones, AHORA).map(s => s.session_key)).toEqual([4, 3, 2, 1]);
  });

  test('pickReferenceLap exige duración, hora de inicio válida y que no sea vuelta de salida de boxes', () => {
    expect(pickReferenceLap([
      lapOpenF1({ driver_number: 2, lap_duration: 0 }),
      lapOpenF1({ driver_number: 3, date_start: null }),
      lapOpenF1({ driver_number: 4, is_pit_out_lap: true }),
      lapOpenF1({ driver_number: 5 }),
    ])).toEqual(expect.objectContaining({ driver_number: 5 }));
    expect(pickReferenceLap([])).toBeNull();
    expect(pickReferenceLap({ detail: 'No results found.' })).toBeNull();
  });

  test('parseOpenF1Date acepta microsegundos y rechaza valores inválidos', () => {
    expect(parseOpenF1Date('2024-03-02T15:05:20.099000+00:00')).toBe(Date.parse('2024-03-02T15:05:20.099Z'));
    expect(parseOpenF1Date('no es fecha')).toBeNull();
    expect(parseOpenF1Date(null)).toBeNull();
  });
});

describe('Búsqueda de Grandes Premios', () => {
  test('getMeetingsForYear ordena por fecha y trata HTTP 404 (sin resultados) como lista vacía', async () => {
    global.fetch = openF1Server({ '/meetings?year=2026': MEETINGS_2026 });
    expect((await getMeetingsForYear(2026)).map(m => m.meeting_key)).toEqual([1282, 1299, 1300, 1302]);
    expect(await getMeetingsForYear(2027)).toEqual([]);
  });

  test('getMeetingsForYear propaga otros errores HTTP', async () => {
    global.fetch = jest.fn(async () => httpError(500));
    await expect(getMeetingsForYear(2026)).rejects.toMatchObject({ code: 'NETWORK' });
  });

  test.each([
    ['nombre sin tildes', 'sao paulo', [1299]],
    ['país', 'united', [1300, 1302]],
    ['localidad', 'JEDDAH', [1282]],
    ['circuito', 'interlagos', [1299]],
    ['varias palabras', 'grand prix vegas', [1300]],
    ['sin coincidencias', 'zzz', []],
    ['consulta vacía', '   ', [1300, 1299, 1302, 1282]],
  ])('filterMeetings por %s', (_caso, consulta, claves) => {
    expect(filterMeetings(MEETINGS_2026, consulta).map(m => m.meeting_key)).toEqual(claves);
  });

  test('getSearchableSeasons ofrece desde 2023 hasta el año actual', () => {
    expect(getSearchableSeasons(AHORA)).toEqual([2023, 2024, 2025, 2026]);
    expect(getSearchableSeasons(Date.parse('2022-06-01T00:00:00Z'))).toEqual([2023]);
  });
});
