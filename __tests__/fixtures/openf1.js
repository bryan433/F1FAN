// Fixtures sintéticos con la forma de la API OpenF1 (campos verificados contra api.openf1.org/v1).
// Los valores son de prueba; no representan resultados oficiales.
export const BASE_OPENF1 = 'https://api.openf1.org/v1';

export const meetingOpenF1 = (overrides = {}) => ({
  meeting_key: 1229,
  meeting_name: 'Bahrain Grand Prix',
  meeting_official_name: 'FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2024',
  location: 'Sakhir',
  country_name: 'Bahrain',
  circuit_short_name: 'Sakhir',
  date_start: '2024-02-29T11:30:00+00:00',
  year: 2024,
  is_cancelled: false,
  ...overrides,
});

export const MEETINGS_2024 = [
  meetingOpenF1(),
  meetingOpenF1({ meeting_key: 1236, meeting_name: 'Monaco Grand Prix', meeting_official_name: 'FORMULA 1 GRAND PRIX DE MONACO 2024', location: 'Monaco', country_name: 'Monaco', circuit_short_name: 'Monte Carlo', date_start: '2024-05-24T11:30:00+00:00' }),
];

export const MEETINGS_2026 = [
  // Desordenados a propósito: la pantalla los muestra por fecha.
  meetingOpenF1({ meeting_key: 1300, meeting_name: 'Las Vegas Grand Prix', meeting_official_name: 'FORMULA 1 LAS VEGAS GRAND PRIX 2026', location: 'Las Vegas', country_name: 'United States', circuit_short_name: 'Las Vegas', date_start: '2026-11-20T00:30:00+00:00', year: 2026 }),
  meetingOpenF1({ meeting_key: 1299, meeting_name: 'São Paulo Grand Prix', meeting_official_name: 'FORMULA 1 MSC CRUISES GRANDE PRÊMIO DE SÃO PAULO 2026', location: 'São Paulo', country_name: 'Brazil', circuit_short_name: 'Interlagos', date_start: '2026-11-06T15:30:00+00:00', year: 2026 }),
  meetingOpenF1({ meeting_key: 1302, meeting_name: 'Abu Dhabi Grand Prix', meeting_official_name: 'FORMULA 1 ETIHAD AIRWAYS ABU DHABI GRAND PRIX 2026', location: 'Yas Marina', country_name: 'United Arab Emirates', circuit_short_name: 'Yas Marina Circuit', date_start: '2026-12-04T09:30:00+00:00', year: 2026 }),
  meetingOpenF1({ meeting_key: 1282, meeting_name: 'Saudi Arabian Grand Prix', meeting_official_name: 'FORMULA 1 STC SAUDI ARABIAN GRAND PRIX 2026', location: 'Jeddah', country_name: 'Saudi Arabia', circuit_short_name: 'Jeddah', date_start: '2026-04-17T13:30:00+00:00', year: 2026, is_cancelled: true }),
];

export const sessionOpenF1 = (overrides = {}) => ({
  session_key: 9472,
  session_name: 'Race',
  session_type: 'Race',
  date_start: '2024-03-02T15:00:00+00:00',
  date_end: '2024-03-02T17:00:00+00:00',
  meeting_key: 1229,
  is_cancelled: false,
  ...overrides,
});

export const lapOpenF1 = (overrides = {}) => ({
  meeting_key: 1229,
  session_key: 9472,
  driver_number: 1,
  lap_number: 2,
  date_start: '2024-03-02T15:05:20.099000+00:00',
  lap_duration: 96.296,
  is_pit_out_lap: false,
  ...overrides,
});

/** Vuelta sintética: `cantidad` puntos sobre una elipse de 4000 × 2000 unidades, con fecha creciente. */
export function locationLoop(cantidad = 60, { inicio = '2024-03-02T15:05:20.300Z', driver_number = 1, session_key = 9472 } = {}) {
  const t0 = Date.parse(inicio);
  return Array.from({ length: cantidad }, (_, i) => {
    const angulo = (2 * Math.PI * i) / cantidad;
    return {
      date: new Date(t0 + i * 250).toISOString().replace('Z', '+00:00'),
      session_key,
      meeting_key: 1229,
      driver_number,
      x: Math.round(2000 * Math.cos(angulo)) + 500,
      y: Math.round(1000 * Math.sin(angulo)) - 300,
      z: -159,
    };
  });
}

export const jsonResponse = payload => ({ ok: true, status: 200, json: async () => payload });
export const httpError = status => ({ ok: false, status, json: async () => ({ detail: 'No results found.' }) });

/**
 * fetch falso para OpenF1. Las rutas se buscan primero por ruta completa (con query) y luego
 * solo por endpoint (p. ej. '/location'). Un valor función recibe la URL y devuelve la respuesta;
 * cualquier otro valor se entrega como JSON con HTTP 200. Sin ruta, OpenF1 responde 404.
 */
export function openF1Server(rutas = {}) {
  return jest.fn(async url => {
    const ruta = url.startsWith(BASE_OPENF1) ? url.slice(BASE_OPENF1.length) : url;
    const endpoint = ruta.split('?')[0];
    const valor = ruta in rutas ? rutas[ruta] : rutas[endpoint];
    if (valor === undefined) return httpError(404);
    return typeof valor === 'function' ? valor(url) : jsonResponse(valor);
  });
}
