import LocalStorageManager from '../storage/LocalStorageManager';

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';
const SEASONS_CACHE_KEY = 'jolpica_v1_seasons';
const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchCollection(path, tableName, collectionName, extractPage) {
  const items = [];
  let offset = 0;

  while (true) {
    const pagePath = offset === 0
      ? path
      : `${path}${path.includes('?') ? '&' : '?'}offset=${offset}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let payload;
    try {
      const response = await fetch(`${BASE_URL}${pagePath}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Jolpica HTTP ${response.status}`);
      payload = await response.json();
    } finally {
      clearTimeout(timeout);
    }

    const collection = payload?.MRData?.[tableName]?.[collectionName];
    const page = extractPage ? extractPage(collection) : collection;
    if (!Array.isArray(page)) throw new Error('Respuesta de Jolpica no válida.');
    items.push(...page);
    offset += page.length;
    const total = Number(payload.MRData.total ?? offset);
    if (!Number.isFinite(total) || total < 0) throw new Error('Paginación de Jolpica no válida.');
    if (offset >= total) return items;
    if (page.length === 0) throw new Error('Respuesta incompleta de Jolpica.');
  }
}

async function loadWithCache(key, maxAgeMs, loader, includeOrigin = false) {
  const cached = await LocalStorageManager.obtenerCache(key, maxAgeMs);
  if (Array.isArray(cached)) return { data: cached, warning: null, ...(includeOrigin ? { origin: 'cache' } : {}) };

  try {
    const result = await loader();
    // Una respuesta parcial no reemplaza una copia completa ya guardada.
    if (!result.warning) await LocalStorageManager.guardarCache(key, result.data);
    return { ...result, ...(includeOrigin ? { origin: 'api' } : {}) };
  } catch (error) {
    const backup = await LocalStorageManager.obtenerUltimaCopiaCache(key);
    if (Array.isArray(backup)) {
      return {
        data: backup,
        warning: 'No se pudo actualizar con Jolpica. Mostrando la última copia guardada.',
        ...(includeOrigin ? { origin: 'stale-cache', error: error.message } : {}),
      };
    }
    throw error;
  }
}

// Separadas de las copias antiguas de OpenF1 y de los datos del Historial.
const standingsRequests = new Map();

function getSeasonStandings(year, kind) {
  if (!/^\d{4}$/.test(String(year)) || Number(year) < 1950) {
    return Promise.reject(new Error('Temporada no válida.'));
  }
  const key = `jolpica_v2_${kind}_standings_${year}`;
  if (standingsRequests.has(key)) return standingsRequests.get(key);
  const collection = kind === 'driver' ? 'DriverStandings' : 'ConstructorStandings';
  const request = loadWithCache(key, 3600000, async () => ({
    data: await fetchCollection(`/${year}/${kind}standings.json?limit=100`, 'StandingsTable', 'StandingsLists', lists => {
      if (!Array.isArray(lists)) throw new Error('Clasificación de Jolpica no válida.');
      return lists.flatMap(list => {
        if (String(list.season) !== String(year) || !Array.isArray(list[collection])) {
          throw new Error('La clasificación no corresponde a la temporada solicitada.');
        }
        return list[collection].map(entry => {
          const id = kind === 'driver' ? entry.Driver?.driverId : entry.Constructor?.constructorId;
          if (!id) throw new Error('Clasificación sin identidad de participante.');
          return { ...entry, season: String(list.season), round: list.round ?? null };
        });
      });
    }),
    warning: null,
  }), true).finally(() => standingsRequests.delete(key));
  standingsRequests.set(key, request);
  return request;
}

export function getSeasonDriverStandings(year) {
  return getSeasonStandings(year, 'driver');
}

export function getSeasonConstructorStandings(year) {
  return getSeasonStandings(year, 'constructor');
}

function driverName(driver) {
  if (!driver) return null;
  const initial = driver.givenName ? `${driver.givenName[0]}.` : '';
  return [initial, driver.familyName].filter(Boolean).join(' ').toUpperCase() || null;
}

function firstPlacedDrivers(results) {
  if (!Array.isArray(results)) return null;
  return results.filter(result => String(result.position) === '1')
    .map(result => driverName(result.Driver)).filter(Boolean).join(' / ') || null;
}

export function transformRaces(races, winnerRaces = [], qualifyingRaces = []) {
  const winners = new Map(winnerRaces.map(race => [String(race.round), race.Results]));
  const qualifying = new Map(qualifyingRaces.map(race => [String(race.round), race.QualifyingResults]));

  return races.map(race => ({
    round: Number(race.round),
    gp: race.raceName || 'Sin datos',
    circuit: race.Circuit?.circuitName || 'Sin datos',
    winner: firstPlacedDrivers(winners.get(String(race.round))),
    qualifyingFirst: firstPlacedDrivers(qualifying.get(String(race.round))),
  })).sort((a, b) => a.round - b.round);
}

export function filterHistoricalRaces(races, query) {
  const search = query.trim().toLowerCase();
  if (!search) return races;
  return races.filter(race => [race.gp, race.circuit, race.winner, race.qualifyingFirst]
    .some(value => (value || '').toLowerCase().includes(search)));
}

export function getSeasons() {
  return loadWithCache(SEASONS_CACHE_KEY, DAY_MS, async () => {
    const seasons = await fetchCollection('/seasons.json?limit=100', 'SeasonTable', 'Seasons');
    const years = [...new Set(seasons.map(item => String(item.season)))]
      .filter(year => /^\d{4}$/.test(year) && Number(year) >= 1950)
      .sort((a, b) => Number(b) - Number(a));
    return { data: years, warning: null };
  });
}

/**
 * Devuelve { data, warning } con las carreras originales de Jolpica.
 * Conserva los campos UTC y las sesiones opcionales sin completar datos ausentes.
 * La caché de calendario es independiente del formato transformado del Historial.
 */
export function getSeasonCalendar(year) {
  if (!/^\d{4}$/.test(String(year)) || Number(year) < 1950) {
    return Promise.reject(new Error('Temporada no válida.'));
  }
  return loadWithCache(`jolpica_v1_calendar_${year}`, 60 * 60 * 1000, async () => ({
    data: await fetchCollection(`/${year}.json`, 'RaceTable', 'Races'),
    warning: null,
  }));
}

export function getSeasonHistory(year) {
  if (!/^\d{4}$/.test(String(year)) || Number(year) < 1950) {
    return Promise.reject(new Error('Temporada no válida.'));
  }
  return loadWithCache(`jolpica_v1_history_${year}`, 60 * 60 * 1000, async () => {
    const races = await fetchCollection(`/${year}.json`, 'RaceTable', 'Races');
    if (races.length === 0) return { data: [], warning: null };

    const [winners, qualifying] = await Promise.allSettled([
      fetchCollection(`/${year}/results/1.json?limit=100`, 'RaceTable', 'Races'),
      fetchCollection(`/${year}/qualifying/1.json?limit=100`, 'RaceTable', 'Races'),
    ]);
    const partial = winners.status === 'rejected' || qualifying.status === 'rejected';
    return {
      data: transformRaces(
        races,
        winners.status === 'fulfilled' ? winners.value : [],
        qualifying.status === 'fulfilled' ? qualifying.value : [],
      ),
      warning: partial
        ? 'No se pudieron cargar todos los resultados. Los datos no disponibles se muestran con —.'
        : null,
    };
  });
}
