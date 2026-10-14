/**
 * OpenF1Client - Cliente HTTP para la API comunitaria OpenF1
 * Endpoint base: https://api.openf1.org/v1/
 * Cumple con RNF-01 (< 3s), RNF-02 (no sobrepasar 30 req/min) y Tabla 4 del SRS.
 */
class OpenF1Client {
  constructor() {
    this.baseUrl = 'https://api.openf1.org/v1';
    this.requestQueue = [];
    this.lastRequestTimestamp = 0;
    this.minIntervalMs = 2100; // ~28 peticiones por minuto como máximo para respetar RNF-02
  }

  /**
   * Ejecuta peticiones HTTP con control de tasa (rate limiting) y timeout seguro
   * @param {string} endpoint 
   * @param {object} params 
   */
  async fetchWithRateLimit(endpoint, params = {}) {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTimestamp;
    if (timeSinceLast < this.minIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, this.minIntervalMs - timeSinceLast));
    }
    this.lastRequestTimestamp = Date.now();

    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 segundos de timeout

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenF1 Error HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`[OpenF1Client] Falló petición a ${endpoint}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene la lista de pilotos oficiales
   * Endpoint: /drivers
   */
  async getDrivers(params = {}) {
    return this.fetchWithRateLimit('/drivers', params);
  }

  /**
   * Obtiene la lista de meetings / Grandes Premios de una temporada
   * Endpoint: /meetings?year=YYYY
   * @param {number} year 
   */
  async getMeetings(year = 2024) {
    return this.fetchWithRateLimit('/meetings', { year });
  }

  /**
   * Obtiene las sesiones de un Gran Premio específico
   * Endpoint: /sessions?meeting_key=ID
   * @param {number} meetingId 
   */
  async getSessions(meetingId) {
    return this.fetchWithRateLimit('/sessions', { meeting_key: meetingId });
  }

  /**
   * Obtiene los resultados de una sesión terminada
   * Endpoint: /session_result?session_key=ID
   * @param {number} sessionId 
   */
  async getSessionResults(sessionId) {
    return this.fetchWithRateLimit('/session_result', { session_key: sessionId });
  }

  /**
   * Obtiene la clasificación general del campeonato de pilotos
   * Endpoint: /championship_drivers
   */
  async getDriverStandings(year = 2024) {
    return this.fetchWithRateLimit('/championship_drivers', { year });
  }

  /**
   * Obtiene la clasificación general del campeonato de constructores
   * Endpoint: /championship_teams
   */
  async getTeamStandings(year = 2024) {
    return this.fetchWithRateLimit('/championship_teams', { year });
  }

  /**
   * Obtiene telemetría y coordenadas de posición para simulación / RA
   * Endpoint: /location?session_key=ID&driver_number=NUM
   * @param {number} sessionKey 
   * @param {number} driverNumber 
   */
  async getLocation(sessionKey, driverNumber) {
    return this.fetchWithRateLimit('/location', {
      session_key: sessionKey,
      ...(driverNumber ? { driver_number: driverNumber } : {})
    });
  }
}

export default new OpenF1Client();

