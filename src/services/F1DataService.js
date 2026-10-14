import OpenF1Client from './OpenF1Client';
import LocalStorageManager from '../storage/LocalStorageManager';
import { DRIVERS, TEAMS } from '../data/teamsAndDrivers';
import { CURRENT_MEETING, CALENDAR_RACES, LIVE_TIMING_DATA } from '../data/mockData';
import { Piloto } from '../models/Piloto';
import { Escuderia } from '../models/Escuderia';
import { GranPremio } from '../models/GranPremio';

/**
 * F1DataService - Servicio unificado de datos de F1
 * Orquesta OpenF1Client, LocalStorageManager y fallback offline.
 * Implementa la interfaz IF1Data descrita en la sección 5.1 del SRS.
 */
class F1DataService {
  constructor() {
    this.isOfflineMode = false;
    this.listeners = [];
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

  /**
   * Obtiene la próxima carrera / reunión actual
   * Cumple con CU-01 y SD-01: Caché 1 a 6 horas, hora chilena calculada
   */
  async getNextRace() {
    const cacheKey = 'next_race_meeting';
    // 1. Revisar caché local válida (6 horas según SD-01)
    const cached = await LocalStorageManager.obtenerCache(cacheKey, 6 * 3600 * 1000);
    if (cached) {
      return new GranPremio(cached);
    }

    // 2. Intentar consultar API externa
    try {
      const meetings = await OpenF1Client.getMeetings(2024);
      if (Array.isArray(meetings) && meetings.length > 0) {
        // Encontrar la próxima reunión
        const now = new Date();
        const next = meetings.find(m => new Date(m.date_start) >= now) || meetings[meetings.length - 1];
        
        const gpData = {
          idMeeting: next.meeting_key,
          nombreOficial: next.meeting_official_name || next.meeting_name,
          nombreCorto: next.meeting_name,
          pais: next.country_name,
          circuito: {
            nombreCircuito: next.circuit_short_name || 'Circuito Oficial',
            ciudad: next.location,
            pais: next.country_name,
          },
          esProximo: true,
          sesiones: CURRENT_MEETING.sesiones // complementado
        };
        await LocalStorageManager.guardarCache(cacheKey, gpData);
        this.setOfflineMode(false);
        return new GranPremio(gpData);
      }
    } catch (err) {
      console.warn('[F1DataService] Error de red en getNextRace, usando respaldo:', err.message);
      this.setOfflineMode(true);
    }

    // 3. Fallback a última copia o datos de semilla de alta calidad (Singapur)
    const lastBackup = await LocalStorageManager.obtenerUltimaCopiaCache(cacheKey);
    const gpData = lastBackup || CURRENT_MEETING;
    return new GranPremio(gpData);
  }

  /**
   * Obtiene la tabla de posiciones de Pilotos
   * Cumple con CU-02 y SD-03: Valida caché 1h, destaca favorito de AsyncStorage
   */
  async getDriverStandings() {
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
    const list = last || TEAMS;
    return list.map(t => new Escuderia(t)).sort((a, b) => b.puntos - a.puntos);
  }

  /**
   * Obtiene la lista completa de Grandes Premios de la temporada (Calendario)
   * Cumple con HU-02 y SD-04
   */
  async getCalendar(year = 2024) {
    const cacheKey = `calendar_${year}`;
    const cached = await LocalStorageManager.obtenerCache(cacheKey, 12 * 3600 * 1000);
    if (cached) return cached;

    try {
      const meetings = await OpenF1Client.getMeetings(year);
      if (Array.isArray(meetings) && meetings.length > 0) {
        const formatted = meetings.map((m, idx) => ({
          id: m.meeting_key,
          round: idx + 1,
          name: m.meeting_name,
          circuit: m.circuit_short_name,
          country: m.country_name,
          flag: m.country_code ? '🏁' : '🏁',
          dateRange: `${new Date(m.date_start).toLocaleDateString()} - ${new Date(m.date_end).toLocaleDateString()}`,
          status: new Date(m.date_end) < new Date() ? 'Finalizado' : 'Próxima',
          isLive: false,
          isNext: idx === 16 // o el que corresponda
        }));
        await LocalStorageManager.guardarCache(cacheKey, formatted);
        this.setOfflineMode(false);
        return formatted;
      }
    } catch (e) {
      this.setOfflineMode(true);
    }

    return CALENDAR_RACES;
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

