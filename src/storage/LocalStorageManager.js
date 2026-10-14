import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * LocalStorageManager - Administrador de persistencia en AsyncStorage
 * Gestiona el caché con expiración, pilotos favoritos y ajustes locales del aficionado.
 * Cumple con RNF-PER-01, RNF-PER-02, CU-02 y CU-06 del SRS.
 */
class LocalStorageManager {
  static CACHE_PREFIX = '@f1fan_cache_';
  static FAVORITES_KEY = '@f1fan_favorite_driver';
  static FAVORITE_TEAMS_KEY = '@f1fan_favorite_teams';
  static SETTINGS_KEY = '@f1fan_user_settings';
  static ALERTS_KEY = '@f1fan_alerts_settings';

  /**
   * Guarda un objeto en caché junto con su marca de tiempo (timestamp)
   * @param {string} key 
   * @param {any} value 
   */
  async guardarCache(key, value) {
    try {
      const payload = {
        timestamp: Date.now(),
        data: value,
      };
      await AsyncStorage.setItem(LocalStorageManager.CACHE_PREFIX + key, JSON.stringify(payload));
    } catch (error) {
      console.warn(`[LocalStorageManager] Error al guardar caché para "${key}":`, error);
    }
  }

  /**
   * Obtiene un elemento del caché si no ha expirado
   * @param {string} key 
   * @param {number} maxAgeMs Tiempo máximo de validez en ms (ej: 3600000 para 1 hora)
   * @returns {Promise<any|null>} Datos almacenados o null si expiró/no existe
   */
  async obtenerCache(key, maxAgeMs = 3600000) {
    try {
      const item = await AsyncStorage.getItem(LocalStorageManager.CACHE_PREFIX + key);
      if (!item) return null;

      const payload = JSON.parse(item);
      const isExpired = Date.now() - payload.timestamp > maxAgeMs;

      if (isExpired && maxAgeMs > 0) {
        return null;
      }
      return payload.data;
    } catch (error) {
      console.warn(`[LocalStorageManager] Error al leer caché para "${key}":`, error);
      return null;
    }
  }

  /**
   * Obtiene la última copia guardada en caché sin importar si venció
   * Requisito RNF-PER-02 para modo sin conexión
   */
  async obtenerUltimaCopiaCache(key) {
    return this.obtenerCache(key, 0);
  }

  /**
   * Guarda el ID del piloto favorito en AsyncStorage
   * Según CU-06: Si ya existía un favorito anterior, lo reemplaza.
   * @param {number|string} pilotoId 
   */
  async guardarFavorito(pilotoId) {
    try {
      await AsyncStorage.setItem(LocalStorageManager.FAVORITES_KEY, String(pilotoId));
      return true;
    } catch (error) {
      console.warn('[LocalStorageManager] Error al guardar favorito:', error);
      return false;
    }
  }

  /**
   * Obtiene la lista de favoritos (o el ID del favorito principal)
   * @returns {Promise<Array<number|string>>}
   */
  async obtenerFavoritos() {
    try {
      const id = await AsyncStorage.getItem(LocalStorageManager.FAVORITES_KEY);
      return id ? [Number(id) || id] : [];
    } catch (error) {
      console.warn('[LocalStorageManager] Error al obtener favoritos:', error);
      return [];
    }
  }

  /**
   * Elimina el piloto favorito de AsyncStorage
   * @param {number|string} pilotoId 
   */
  async eliminarFavorito(pilotoId) {
    try {
      const actual = await AsyncStorage.getItem(LocalStorageManager.FAVORITES_KEY);
      if (actual && String(actual) === String(pilotoId)) {
        await AsyncStorage.removeItem(LocalStorageManager.FAVORITES_KEY);
      }
      return true;
    } catch (error) {
      console.warn('[LocalStorageManager] Error al eliminar favorito:', error);
      return false;
    }
  }

  /**
   * Comprueba si un piloto específico es el favorito
   * @param {number|string} pilotoId 
   * @returns {Promise<boolean>}
   */
  async esFavorito(pilotoId) {
    try {
      const actual = await AsyncStorage.getItem(LocalStorageManager.FAVORITES_KEY);
      return actual ? String(actual) === String(pilotoId) : false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gestión de Escuderías Favoritas
   */
  async obtenerEscuderiasFavoritas() {
    try {
      const data = await AsyncStorage.getItem(LocalStorageManager.FAVORITE_TEAMS_KEY);
      return data ? JSON.parse(data) : ['mercedes', 'mclaren'];
    } catch (e) {
      return ['mercedes', 'mclaren'];
    }
  }

  async toggleEscuderiaFavorita(equipoId) {
    try {
      const lista = await this.obtenerEscuderiasFavoritas();
      let nuevaLista;
      if (lista.includes(equipoId)) {
        nuevaLista = lista.filter(id => id !== equipoId);
      } else {
        nuevaLista = [...lista, equipoId];
      }
      await AsyncStorage.setItem(LocalStorageManager.FAVORITE_TEAMS_KEY, JSON.stringify(nuevaLista));
      return nuevaLista;
    } catch (e) {
      return [];
    }
  }

  /**
   * Gestión de Ajustes de Usuario (Modo Experto, Anti-Spoilers, Unidades)
   */
  async obtenerAjustes() {
    try {
      const data = await AsyncStorage.getItem(LocalStorageManager.SETTINGS_KEY);
      if (data) return JSON.parse(data);
      return {
        modoExperto: false,
        evitarSpoilers: false,
        unidades: 'km/h', // 'km/h' o 'mph'
        horaChilenaActivada: true,
      };
    } catch (e) {
      return {
        modoExperto: false,
        evitarSpoilers: false,
        unidades: 'km/h',
        horaChilenaActivada: true,
      };
    }
  }

  async guardarAjustes(nuevosAjustes) {
    try {
      const actual = await this.obtenerAjustes();
      const updated = { ...actual, ...nuevosAjustes };
      await AsyncStorage.setItem(LocalStorageManager.SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return null;
    }
  }

  /**
   * Gestión de Alertas (Boxes, Radio, Safety Car)
   */
  async obtenerAlertas() {
    try {
      const data = await AsyncStorage.getItem(LocalStorageManager.ALERTS_KEY);
      if (data) return JSON.parse(data);
      return {
        boxes: true,
        radio: true,
        safetyCar: true,
      };
    } catch (e) {
      return { boxes: true, radio: true, safetyCar: true };
    }
  }

  async guardarAlertas(nuevasAlertas) {
    try {
      const actual = await this.obtenerAlertas();
      const updated = { ...actual, ...nuevasAlertas };
      await AsyncStorage.setItem(LocalStorageManager.ALERTS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return null;
    }
  }
}

export default new LocalStorageManager();

