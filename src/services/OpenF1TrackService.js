/**
 * OpenF1TrackService - Búsqueda de Grandes Premios y trazado real del circuito desde OpenF1.
 *
 * El trazado se obtiene de datos reales: se elige la carrera del Gran Premio, una vuelta
 * completa de un piloto y sus posiciones x/y durante esa vuelta. Si OpenF1 no tiene datos
 * se informa un error en español; nunca se inventa un trazado.
 */
import OpenF1Client from './OpenF1Client';
import { TRACK_CANVAS, closeLoopIfNear, esPuntoValido, normalizeTrackPoints } from '../utils/trackGeometry';

// OpenF1 publica datos desde la temporada 2023.
export const FIRST_OPENF1_SEASON = 2023;
// La vuelta 1 parte desde la grilla; la 2 ya es una vuelta lanzada completa.
export const REFERENCE_LAP_NUMBER = 2;
const MAX_SESSION_ATTEMPTS = 3;
const MIN_TRACK_POINTS = 20;

// Pasos que getTrackOutline informa con `onProgress`, en orden.
export const TRACK_PROGRESS = {
  SESSION: 'session', // buscando la sesión de la carrera
  LAP: 'lap', // eligiendo una vuelta de referencia
  OUTLINE: 'outline', // descargando posiciones y dibujando el trazado
};

export const TRACK_ERROR_MESSAGES = {
  INVALID_MEETING: 'Gran Premio no válido: falta su identificador de OpenF1.',
  NO_SESSIONS: 'OpenF1 no tiene sesiones registradas para este Gran Premio.',
  CANCELLED: 'Este Gran Premio fue cancelado; OpenF1 no tiene vueltas para dibujar el trazado.',
  NOT_STARTED: 'Este Gran Premio aún no se disputa: OpenF1 todavía no tiene vueltas registradas para dibujar el trazado.',
  NO_LAPS: 'OpenF1 no tiene vueltas completas registradas para este Gran Premio; no es posible dibujar el trazado real.',
  NO_LOCATION: 'OpenF1 no tiene suficientes datos de posición para dibujar el trazado de este Gran Premio.',
};

const crearError = (code, message, cause) => Object.assign(new Error(message), { name: 'TrackOutlineError', code, cause });

function errorDeRed(error) {
  const status = error?.status;
  const message = status
    ? `No se pudo consultar OpenF1 (HTTP ${status}). Inténtalo de nuevo más tarde.`
    : 'No se pudo conectar con OpenF1. Revisa tu conexión e inténtalo de nuevo.';
  return crearError('NETWORK', message, error);
}

/** OpenF1 responde HTTP 404 cuando una consulta no tiene resultados: se trata como lista vacía. */
async function consultarLista(peticion) {
  try {
    const datos = await peticion();
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    if (error?.status === 404) return [];
    throw errorDeRed(error);
  }
}

/** Fecha ISO de OpenF1 a milisegundos; recorta microsegundos, que no todos los motores JS aceptan. */
export function parseOpenF1Date(valor) {
  if (typeof valor !== 'string' || !valor) return null;
  const ms = Date.parse(valor.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isFinite(ms) ? ms : null;
}

// ---- Búsqueda de Grandes Premios ----------------------------------------------------

/** Temporadas consultables en OpenF1, desde 2023 hasta el año actual. */
export function getSearchableSeasons(ahora = Date.now()) {
  const actual = Math.max(FIRST_OPENF1_SEASON, new Date(ahora).getFullYear());
  const temporadas = [];
  for (let anio = FIRST_OPENF1_SEASON; anio <= actual; anio += 1) temporadas.push(anio);
  return temporadas;
}

/** Grandes Premios de una temporada ordenados por fecha. Sin resultados (HTTP 404) devuelve []. */
export async function getMeetingsForYear(anio, { client = OpenF1Client } = {}) {
  const meetings = await consultarLista(() => client.getMeetings(anio));
  return meetings
    .filter(m => m && m.meeting_key != null)
    .map((m, indice) => ({ m, indice, inicio: parseOpenF1Date(m.date_start) }))
    .sort((a, b) => (a.inicio ?? Infinity) - (b.inicio ?? Infinity) || a.indice - b.indice)
    .map(({ m }) => m);
}

const normalizarTexto = valor => {
  const texto = String(valor ?? '');
  const sinTildes = typeof texto.normalize === 'function' ? texto.normalize('NFD').replace(/[̀-ͯ]/g, '') : texto;
  return sinTildes.toLowerCase().trim();
};

/** Filtra por nombre del Gran Premio, país, localidad o circuito (sin distinguir tildes ni mayúsculas). */
export function filterMeetings(meetings, consulta) {
  const lista = Array.isArray(meetings) ? meetings : [];
  const palabras = normalizarTexto(consulta).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return lista;
  return lista.filter(m => {
    const texto = normalizarTexto([m.meeting_name, m.meeting_official_name, m.country_name, m.location, m.circuit_short_name].join(' '));
    return palabras.every(palabra => texto.includes(palabra));
  });
}

// ---- Trazado del circuito ------------------------------------------------------------

/**
 * Sesiones candidatas para buscar una vuelta: solo las ya iniciadas y no canceladas.
 * Primero la carrera principal (session_name "Race"), luego otras de tipo "Race" (Sprint)
 * y después el resto, de la más reciente a la más antigua.
 */
export function sessionCandidates(sesiones, ahora = Date.now()) {
  const prioridad = s => (s.session_name === 'Race' ? 0 : s.session_type === 'Race' ? 1 : 2);
  return (Array.isArray(sesiones) ? sesiones : [])
    .filter(s => s && s.session_key != null && !s.is_cancelled)
    .map(s => ({ s, inicio: parseOpenF1Date(s.date_start) }))
    .filter(({ inicio }) => inicio != null && inicio <= ahora)
    .sort((a, b) => prioridad(a.s) - prioridad(b.s) || b.inicio - a.inicio)
    .map(({ s }) => s);
}

/** Primera vuelta utilizable: duración y hora de inicio válidas y que no salga de boxes. */
export function pickReferenceLap(vueltas) {
  return (Array.isArray(vueltas) ? vueltas : []).find(v => v
    && v.driver_number != null
    && typeof v.lap_duration === 'number' && Number.isFinite(v.lap_duration) && v.lap_duration > 0
    && parseOpenF1Date(v.date_start) != null
    && v.is_pit_out_lap !== true) || null;
}

/** Puntos x/y en orden temporal, sin valores inválidos ni el (0,0) que OpenF1 usa cuando no hay señal. */
export function cleanLocationPoints(filas) {
  return (Array.isArray(filas) ? filas : [])
    .map((fila, indice) => ({ x: fila?.x, y: fila?.y, t: parseOpenF1Date(fila?.date), indice }))
    .filter(p => esPuntoValido(p) && !(p.x === 0 && p.y === 0))
    .sort((a, b) => (a.t != null && b.t != null ? a.t - b.t : 0) || a.indice - b.indice)
    .map(({ x, y }) => ({ x, y }));
}

/**
 * Obtiene el trazado real de un Gran Premio de OpenF1, listo para TrackMap.
 * @param {object} meeting Gran Premio de /meetings (requiere meeting_key)
 * @param {{onProgress?:(paso:string)=>void}} [opciones] `onProgress` (opcional) recibe cada paso
 *   de TRACK_PROGRESS al comenzarlo, para mostrar el avance de la carga.
 * @returns {Promise<{points:Array<{x:number,y:number}>, sessionKey:number, sessionName:string,
 *   driverNumber:number, lapNumber:number, rawPointCount:number, source:'openf1'}>}
 * @throws Error con `code` (INVALID_MEETING, NO_SESSIONS, CANCELLED, NOT_STARTED, NO_LAPS,
 *   NO_LOCATION, NETWORK) y mensaje en español para mostrar al usuario.
 */
export async function getTrackOutline(meeting, { client = OpenF1Client, ahora = Date.now(), canvas = TRACK_CANVAS, onProgress } = {}) {
  const avisar = paso => { if (typeof onProgress === 'function') onProgress(paso); };
  const meetingKey = Number(meeting?.meeting_key);
  if (!Number.isInteger(meetingKey) || meetingKey <= 0) {
    throw crearError('INVALID_MEETING', TRACK_ERROR_MESSAGES.INVALID_MEETING);
  }

  avisar(TRACK_PROGRESS.SESSION);
  const sesiones = await consultarLista(() => client.getSessions(meetingKey));
  if (sesiones.length === 0) throw crearError('NO_SESSIONS', TRACK_ERROR_MESSAGES.NO_SESSIONS);

  const candidatas = sessionCandidates(sesiones, ahora);
  if (candidatas.length === 0) {
    const canceladas = sesiones.every(s => s?.is_cancelled) || meeting?.is_cancelled === true;
    throw crearError(canceladas ? 'CANCELLED' : 'NOT_STARTED', TRACK_ERROR_MESSAGES[canceladas ? 'CANCELLED' : 'NOT_STARTED']);
  }

  avisar(TRACK_PROGRESS.LAP);
  let sesion = null;
  let vuelta = null;
  for (const candidata of candidatas.slice(0, MAX_SESSION_ATTEMPTS)) {
    const vueltas = await consultarLista(() => client.getLaps({ session_key: candidata.session_key, lap_number: REFERENCE_LAP_NUMBER }));
    vuelta = pickReferenceLap(vueltas);
    if (vuelta) { sesion = candidata; break; }
  }
  if (!vuelta) throw crearError('NO_LAPS', TRACK_ERROR_MESSAGES.NO_LAPS);

  avisar(TRACK_PROGRESS.OUTLINE);
  const inicio = parseOpenF1Date(vuelta.date_start);
  const fin = inicio + Math.round(vuelta.lap_duration * 1000);
  const filas = await consultarLista(() => client.getLocation(sesion.session_key, vuelta.driver_number, {
    'date>=': new Date(inicio).toISOString(),
    'date<=': new Date(fin).toISOString(),
  }));
  const puntos = cleanLocationPoints(filas);
  if (puntos.length < MIN_TRACK_POINTS) throw crearError('NO_LOCATION', TRACK_ERROR_MESSAGES.NO_LOCATION);

  return {
    points: closeLoopIfNear(normalizeTrackPoints(puntos, canvas)),
    sessionKey: sesion.session_key,
    sessionName: sesion.session_name,
    driverNumber: vuelta.driver_number,
    lapNumber: vuelta.lap_number ?? REFERENCE_LAP_NUMBER,
    rawPointCount: puntos.length,
    source: 'openf1',
  };
}

export default { getTrackOutline, getMeetingsForYear, filterMeetings, getSearchableSeasons };
