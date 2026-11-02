// Entorno compartido de las suites de integridad y usabilidad.
// Reutiliza los fixtures sintéticos existentes; no representa datos oficiales.
import { calendarRace } from '../../fixtures/calendar';
import { raceResponse, okResponse, seasonsResponse, bahrain, monza, silverstone, winners2024, qualifying2024 } from '../../fixtures/jolpica';
import { standingsResponse, driverStanding, secondDriverStanding, constructorStanding } from '../../fixtures/jolpicaStandings';

export const AHORA = Date.parse('2026-11-02T12:00:00Z');
export const BASE_JOLPICA = 'https://api.jolpi.ca/ergast/f1';
export const BASE_OPENF1 = 'https://api.openf1.org/v1';
export const CLAVES = {
  pilotos: '@f1fan_favorite_drivers',
  pilotoLegado: '@f1fan_favorite_driver',
  escuderias: '@f1fan_favorite_teams',
  ajustes: '@f1fan_user_settings',
  alertas: '@f1fan_alerts_settings',
  cache: '@f1fan_cache_',
};

// ---- Sesión OpenF1 sintética para DetalleGP ------------------------------------------
export const sesionOpenF1 = (overrides = {}) => ({
  idSesion: 7782, session_key: 7782, tipo: 'Carrera', estado: 'Finalizado', source: 'openf1', ...overrides,
});
export const meetingOpenF1 = (sesiones = [sesionOpenF1()]) => ({
  source: 'openf1', meeting_key: 1143, nombreCorto: 'GP controlado', sesiones,
});
export const filaResultado = (overrides = {}) => ({
  session_key: 7782, meeting_key: 1143, driver_number: 81, position: 1, duration: 77.565, gap_to_leader: 0, ...overrides,
});
export const pilotoOpenF1 = (overrides = {}) => ({
  session_key: 7782, driver_number: 81, full_name: 'Piloto de ensayo', team_name: 'Equipo de ensayo', team_colour: '123ABC', ...overrides,
});

export function rutasPorDefecto() {
  return {
    '/2026.json': raceResponse([calendarRace()]),
    '/seasons.json?limit=100': seasonsResponse,
    '/2024.json': raceResponse([bahrain, monza]),
    '/2024/results/1.json?limit=100': raceResponse(winners2024),
    '/2024/qualifying/1.json?limit=100': raceResponse(qualifying2024),
    '/1950.json': raceResponse([silverstone]),
    '/1950/results/1.json?limit=100': raceResponse([]),
    '/1950/qualifying/1.json?limit=100': raceResponse([]),
    '/2023.json': raceResponse([]),
    '/2026/driverstandings.json?limit=100': standingsResponse('driver', [driverStanding(), secondDriverStanding()]),
    '/2026/constructorstandings.json?limit=100': standingsResponse('constructor', [constructorStanding()]),
    '/session_result?session_key=7782': [filaResultado()],
    '/drivers?session_key=7782': [pilotoOpenF1()],
    // Sesión por defecto de F1DataService.getLiveTiming (En Vivo).
    '/session_result?session_key=9157': [],
  };
}

export function rutaDe(url) {
  if (url.startsWith(BASE_JOLPICA)) return url.slice(BASE_JOLPICA.length);
  if (url.startsWith(BASE_OPENF1)) return url.slice(BASE_OPENF1.length);
  return url;
}

/**
 * fetch falso por ruta. Un valor función recibe (url, init) y devuelve la respuesta;
 * cualquier otro valor se entrega como JSON con HTTP 200.
 */
export function crearServidor(extra = {}) {
  const rutas = { ...rutasPorDefecto(), ...extra };
  return jest.fn(async (url, init) => {
    const ruta = rutaDe(url);
    if (!(ruta in rutas)) throw new Error(`Petición inesperada en la prueba: ${url}`);
    const valor = rutas[ruta];
    return typeof valor === 'function' ? valor(url, init) : okResponse(valor);
  });
}

export function diferido() {
  let resolver;
  let rechazar;
  const promesa = new Promise((res, rej) => { resolver = res; rechazar = rej; });
  return { promesa, resolver, rechazar };
}

// ---- Modos de fallo de red -----------------------------------------------------------
export const respuestaHttp = status => ({ ok: false, status, json: async () => ({}) });
export const errorAbortado = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });

export const MODOS_FALLO = [
  ['rechazo de red (TypeError)', () => Promise.reject(new TypeError('Network request failed'))],
  ['HTTP 404', () => Promise.resolve(respuestaHttp(404))],
  ['HTTP 500', () => Promise.resolve(respuestaHttp(500))],
  ['HTTP 503', () => Promise.resolve(respuestaHttp(503))],
  ['tiempo de espera (AbortError)', () => Promise.reject(errorAbortado())],
  ['JSON malformado', () => Promise.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token < in JSON at position 0'); } })],
  ['carga vacía', () => Promise.resolve({ ok: true, status: 200, json: async () => ({}) })],
];

/** fetch que falla con el modo indicado mientras `estado.fallando` sea verdadero. */
export function servidorConFallo(modo, { rutasQueFallan = () => true, extra = {} } = {}) {
  const exito = crearServidor(extra);
  const estado = { fallando: true };
  const fetch = jest.fn((url, init) => (estado.fallando && rutasQueFallan(rutaDe(url)) ? modo(url, init) : exito(url, init)));
  return { fetch, estado };
}

// ---- Navegación falsa ----------------------------------------------------------------
export function navegacionFalsa(extra = {}) {
  const oyentes = {};
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    addListener: jest.fn((evento, callback) => {
      oyentes[evento] = callback;
      return jest.fn(() => { delete oyentes[evento]; });
    }),
    emitir: evento => oyentes[evento]?.(),
    ...extra,
  };
}

/** Restablece el estado de los singletons de servicios entre pruebas. */
export function reiniciarServicios({ F1DataService, OpenF1Client } = {}) {
  if (F1DataService) {
    F1DataService.isOfflineMode = false;
    F1DataService.calendarWarning = null;
    F1DataService.listeners = [];
  }
  if (OpenF1Client) {
    // Evita esperas reales de 2,1 s del limitador de tasa entre consultas consecutivas.
    OpenF1Client.lastRequestTimestamp = 0;
    OpenF1Client.minIntervalMs = 0;
  }
}

export const animacionInmediata = () => jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing;
