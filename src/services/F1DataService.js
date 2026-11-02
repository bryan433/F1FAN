import OpenF1Client from './OpenF1Client';
import LocalStorageManager from '../storage/LocalStorageManager';
import { DRIVERS, TEAMS } from '../data/teamsAndDrivers';
import { LIVE_TIMING_DATA } from '../data/mockData';
import { Piloto } from '../models/Piloto';
import { Escuderia } from '../models/Escuderia';
import { getSeasonCalendar, getSeasons, getSeasonDriverStandings, getSeasonConstructorStandings } from './JolpicaService';
import { adaptSeasonCalendar, selectUpcomingGrandPrix, unavailableNextRace } from './JolpicaCalendarAdapter';
import { getChileDateTimeParts } from '../utils/timezone';

function publishedNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/**
 * F1DataService - Servicio unificado de datos de F1
 * Orquesta OpenF1Client, LocalStorageManager y fallback offline.
 * Implementa la interfaz IF1Data descrita en la sección 5.1 del SRS.
 */
class F1DataService {
  constructor() {
    this.isOfflineMode = false;
    this.listeners = [];
    this.calendarWarning = null;
  }

  subscribeConnectionChange(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  setOfflineMode(status) {
    if (this.isOfflineMode !== status) {
      this.isOfflineMode = status;
      this.listeners.forEach(fn => fn(this.isOfflineMode));
    }
  }

  /** Clasificación verificable. No utiliza los respaldos de demostración antiguos.
   * Las incidencias son propias de cada tabla: un HTTP 404 no implica desconexión.
   */
  async getChampionshipStandings(year) {
    const localDate = getChileDateTimeParts(Date.now());
    const season = String(year ?? localDate?.fechaChile.slice(0, 4));
    if (!/^\d{4}$/.test(season) || Number(season) < 1950) throw new Error('Temporada no válida.');
    const [driverResult, teamResult] = await Promise.allSettled([
      getSeasonDriverStandings(season), getSeasonConstructorStandings(season),
    ]);
    const favorites = await LocalStorageManager.obtenerFavoritos();
    const table = (result, transform) => result.status === 'fulfilled'
      ? {
        data: result.value.data.map(transform), origin: result.value.origin,
        warning: result.value.warning, error: result.value.error || null,
        round: result.value.data[0]?.round ?? null,
      }
      : { data: [], origin: null, warning: null, error: result.reason.message, round: null };
    const drivers = table(driverResult, entry => {
      const driver = entry.Driver;
      const number = publishedNumber(driver.permanentNumber);
      const id = number ?? driver.driverId;
      return Object.assign(new Piloto({
        idPiloto: id, numero: number, nombre: driver.givenName || '', apellido: driver.familyName || '',
        codigo: driver.code || driver.driverId, pais: driver.nationality || '',
        escuderiaId: entry.Constructors?.map(team => team.constructorId).join(' / ') || null,
        nombreEscuderia: entry.Constructors?.map(team => team.name).filter(Boolean).join(' / ') || 'No disponible',
        puntos: publishedNumber(entry.points), victorias: publishedNumber(entry.wins),
        podios: null, poles: null, posicionCampeonato: publishedNumber(entry.position),
        esFavorito: favorites.some(favorite => [String(id), driver.driverId].includes(String(favorite))),
      }), { source: 'jolpica', season, round: entry.round, driverId: driver.driverId, positionText: entry.positionText || null });
    });
    const teams = table(teamResult, entry => Object.assign(new Escuderia({
      idEscuderia: entry.Constructor.constructorId, nombre: entry.Constructor.name || 'No disponible',
      puntos: publishedNumber(entry.points), posicionCampeonato: publishedNumber(entry.position),
    }), { source: 'jolpica', season, round: entry.round, victorias: publishedNumber(entry.wins), positionText: entry.positionText || null }));
    return { source: 'jolpica', season, drivers, teams };
  }

  async _getCalendarResult(year, now) {
    const { data, warning } = await getSeasonCalendar(year);
    return { data: adaptSeasonCalendar(data, year, now, warning), warning };
  }

  /**
   * Devuelve un GranPremio o un estado con disponible:false y sesiones:[].
   * La ausencia no usa un GP anterior como respaldo. Inicio deberá representar
   * estadoConsulta en la siguiente etapa; su acceso al contador sigue siendo válido.
   */
  async getNextRace() {
    const now = Date.now();
    const localDate = getChileDateTimeParts(now);
    if (!localDate) throw new Error('No se pudo determinar la fecha de Santiago.');
    const year = Number(localDate.fechaChile.slice(0, 4));
    const warnings = [];
    const finish = (selection, queriedYear) => {
      const warning = [...new Set(warnings.filter(Boolean))].join(' ') || null;
      this.setOfflineMode(Boolean(warning));
      return selection.race
        ? Object.assign(selection.race, { warning })
        : unavailableNextRace(selection.reason, queriedYear, warning);
    };

    try {
      const current = await this._getCalendarResult(year, now);
      warnings.push(current.warning);
      const selection = selectUpcomingGrandPrix(current.data, now);
      if (selection.reason !== 'sin_proxima_carrera') return finish(selection, year);

      // Consultar solo temporadas futuras publicadas, una por vez y hasta hallar la próxima.
      const published = await getSeasons();
      warnings.push(published.warning);
      const futureYears = published.data.filter(value => Number(value) > year)
        .sort((a, b) => Number(a) - Number(b));
      for (const futureYear of futureYears) {
        const calendar = await this._getCalendarResult(futureYear, now);
        warnings.push(calendar.warning);
        const upcoming = selectUpcomingGrandPrix(calendar.data, now);
        if (upcoming.reason !== 'sin_proxima_carrera') return finish(upcoming, Number(futureYear));
      }
      return finish({ race: null, reason: 'sin_proxima_carrera' }, year);
    } catch (error) {
      this.setOfflineMode(true);
      throw error;
    }
  }

  /**
   * Obtiene la tabla de posiciones de Pilotos
   * Cumple con CU-02 y SD-03: Valida caché 1h, destaca favorito de AsyncStorage
   */
  async getDriverStandings() {
    // Contrato legado: las pantallas de Clasificación y Comparador usan getChampionshipStandings.
    const cacheKey = 'driver_standings';
    const favoriteDrivers = await LocalStorageManager.obtenerFavoritos();
    const primaryFavId = favoriteDrivers[0] || null;

    // Intentar leer de caché (1 hora)
    const cached = await LocalStorageManager.obtenerCache(cacheKey, 3600 * 1000);
    if (cached) {
      return this._formatDriverStandings(cached, primaryFavId);
    }

    // Intentar consultar API
    try {
      const apiStandings = await OpenF1Client.getDriverStandings(2024);
      if (Array.isArray(apiStandings) && apiStandings.length > 0) {
        await LocalStorageManager.guardarCache(cacheKey, apiStandings);
        this.setOfflineMode(false);
        return this._formatDriverStandings(apiStandings, primaryFavId);
      }
    } catch (err) {
      console.warn('[F1DataService] Error en getDriverStandings:', err.message);
      this.setOfflineMode(true);
    }

    // Usar datos locales
    const lastBackup = await LocalStorageManager.obtenerUltimaCopiaCache(cacheKey);
    const list = lastBackup || DRIVERS;
    return this._formatDriverStandings(list, primaryFavId);
  }

  _formatDriverStandings(driversRaw, favoriteId) {
    return driversRaw.map((d, index) => {
      const id = d.idPiloto || d.driver_number || d.id;
      const isFav = String(id) === String(favoriteId) || d.esFavorito;
      return new Piloto({
        idPiloto: id,
        numero: d.numero || d.driver_number || id,
        nombre: d.nombre || d.first_name || d.broadcast_name || 'Piloto',
        apellido: d.apellido || d.last_name || '',
        codigo: d.codigo || d.name_acronym || 'F1',
        pais: d.pais || d.country_code || 'F1',
        bandera: d.bandera || '🏁',
        escuderiaId: d.teamId || d.team_name,
        nombreEscuderia: d.teamName || d.team_name || 'F1 Team',
        colorHex: d.colorHex || (d.team_colour ? `#${d.team_colour}` : '#FFFFFF'),
        puntos: Number(d.puntos !== undefined ? d.puntos : d.points) || 0,
        victorias: d.victorias || 0,
        podios: d.podios || 0,
        poles: d.poles || 0,
        posicionCampeonato: d.posicionCampeonato || index + 1,
        urlFoto: d.urlFoto || d.headshot_url || null,
        esFavorito: Boolean(isFav)
      });
    }).sort((a, b) => b.puntos - a.puntos);
  }

  /**
   * Obtiene la tabla de posiciones de Constructores
   * Cumple con CU-02 y SD-03
   */
  async getTeamStandings() {
    // Contrato legado, sin consumidores en las pantallas de clasificación actuales.
    const cacheKey = 'team_standings';
    const cached = await LocalStorageManager.obtenerCache(cacheKey, 3600 * 1000);
    if (cached) {
      return cached.map(t => new Escuderia(t));
    }

    try {
      const apiTeams = await OpenF1Client.getTeamStandings(2024);
      if (Array.isArray(apiTeams) && apiTeams.length > 0) {
        await LocalStorageManager.guardarCache(cacheKey, apiTeams);
        this.setOfflineMode(false);
        return apiTeams.map(t => new Escuderia(t));
      }
    } catch (e) {
      this.setOfflineMode(true);
    }

    const last = await LocalStorageManager.obtenerUltimaCopiaCache(cacheKey);
    // El respaldo local usa nombres de campo distintos a los del modelo.
    const list = last || TEAMS.map(team => ({
      ...team,
      idEscuderia: team.id,
      nombre: team.name,
      puntos: team.points,
    }));
    return list.map(t => new Escuderia(t)).sort((a, b) => b.puntos - a.puntos);
  }

  /**
   * Conserva un arreglo compatible con Calendario y Detalle, con season/round
   * originales y sesiones propias. No marca como Finalizado un inicio pasado:
   * eso requeriría resultados confirmados y un cambio posterior del filtro de UI.
   * calendarWarning conserva el aviso incluso cuando el calendario está vacío.
   */
  async getCalendar(year) {
    try {
      const localDate = getChileDateTimeParts(Date.now());
      const selectedYear = year ?? (localDate ? Number(localDate.fechaChile.slice(0, 4)) : null);
      const result = await this._getCalendarResult(selectedYear, Date.now());
      this.calendarWarning = result.warning;
      this.setOfflineMode(Boolean(result.warning));
      return result.data;
    } catch (error) {
      this.calendarWarning = null;
      this.setOfflineMode(true);
      throw error;
    }
  }

  /**
   * Obtiene datos en vivo para la torre de tiempos (Live Timing)
   */
  async getLiveTiming(sessionId = 9157) {
    try {
      const res = await OpenF1Client.getSessionResults(sessionId);
      if (Array.isArray(res) && res.length > 0) {
        this.setOfflineMode(false);
        return res;
      }
    } catch (e) {
      this.setOfflineMode(true);
    }
    return LIVE_TIMING_DATA;
  }

  /**
   * Obtiene información detallada de un piloto específico
   */
  async getDriverById(driverId) {
    const standings = await this.getDriverStandings();
    return standings.find(p => String(p.idPiloto) === String(driverId)) || standings[0];
  }
}

export default new F1DataService();

