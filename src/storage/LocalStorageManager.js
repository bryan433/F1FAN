import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveDriverFavorites } from '../utils/favorites';

const sameId = (a, b) => a !== undefined && b !== undefined
  && String(a).toLowerCase() === String(b).toLowerCase();

function sameDriver(a, b) {
  if (a.driverId && b.driverId) return sameId(a.driverId, b.driverId);
  return sameId(a.idPiloto, b.idPiloto) || sameId(a.driverId, b.idPiloto)
    || sameId(a.idPiloto, b.driverId)
    || Boolean(resolveDriverFavorites([a], [b])[0]?.current)
    || Boolean(resolveDriverFavorites([b], [a])[0]?.current);
}

function driverRecords(raw) {
  if (!raw) return [];
  let value;
  try { value = JSON.parse(raw); }
  catch (error) {
    if (/^[\[{]/.test(raw.trim())) throw error;
    value = raw; // Formato original: número/código/driverId escrito como texto.
  }
  const records = [];
  for (const item of Array.isArray(value) ? value : [value]) {
    if (item === null) continue;
    const data = typeof item === 'object' ? item : { idPiloto: item };
    const id = data.idPiloto ?? data.driverId ?? data.id;
    if (!['string', 'number'].includes(typeof id) || !String(id).trim()) throw new Error('Favorito guardado no válido.');
    const text = String(id).trim();
    const record = { ...data, idPiloto: /^\d+$/.test(text) ? Number(text) : text };
    const previous = records.findIndex(entry => sameDriver(entry, record));
    if (previous < 0) records.push(record);
    else records[previous] = { ...records[previous], ...record };
  }
  return records;
}

function matchesDriver(record, id) {
  return [record.idPiloto, record.driverId, record.codigo]
    .some(value => value !== undefined && String(value).toLowerCase() === String(id).toLowerCase());
}

function teamIds(raw) {
  const list = raw === null ? ['mercedes', 'mclaren'] : JSON.parse(raw);
  if (!Array.isArray(list)) throw new Error('Escuderías guardadas no válidas.');
  return [...new Set(list.map(item => {
    const id = typeof item === 'object' && item ? item.idEscuderia ?? item.constructorId ?? item.id : item;
    if (typeof id !== 'string' || !id.trim()) throw new Error('Identificador de escudería no válido.');
    return id.trim().toLowerCase();
  }))];
}

const AJUSTES_PREDETERMINADOS = {
  modoExperto: false,
  evitarSpoilers: false,
  unidades: 'km/h', // 'km/h' o 'mph'
  horaChilenaActivada: true,
};
const ALERTAS_PREDETERMINADAS = { boxes: true, radio: true, safetyCar: true };

// Serializa cambios de preferencias para no perder una selección al pulsar rápido.
let preferenceWrite = Promise.resolve();
const preferenceListeners = new Set();
function notifyPreferences() {
  preferenceListeners.forEach(listener => listener());
}
function updatePreferences(update) {
  const pending = preferenceWrite.then(update);
  preferenceWrite = pending.catch(() => {});
  return pending;
}

/**
 * LocalStorageManager - Administrador de persistencia en AsyncStorage
 * Gestiona el caché con expiración, pilotos favoritos y ajustes locales del aficionado.
 * Cumple con RNF-PER-01, RNF-PER-02, CU-02 y CU-06 del SRS.
 */
class LocalStorageManager {
  static CACHE_PREFIX = '@f1fan_cache_';
  static FAVORITES_KEY = '@f1fan_favorite_driver';
  static FAVORITE_DRIVERS_KEY = '@f1fan_favorite_drivers';
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
   * Agrega o actualiza un piloto sin reemplazar los demás favoritos.
   * driverId identifica al piloto aunque cambie su dorsal.
   * @param {number|string} pilotoId 
   */
  async guardarFavorito(pilotoId, piloto) {
    return updatePreferences(async () => {
      try {
        if (!['string', 'number'].includes(typeof pilotoId) || !String(pilotoId).trim()) throw new Error('Identificador de piloto no válido.');
        const value = piloto ? JSON.stringify({ idPiloto: pilotoId, driverId: piloto.driverId,
          codigo: piloto.codigo, numero: piloto.numero, nombre: piloto.nombre, apellido: piloto.apellido }) : String(pilotoId);
        const [record] = driverRecords(value);
        if (!record) throw new Error('Identificador de piloto no válido.');
        const previous = await this._leerColeccionFavoritos();
        const matching = previous.filter(entry => sameDriver(entry, record));
        // Un consumidor antiguo puede guardar solo el número: no debe borrar
        // la identidad estable ni el nombre que ya conocemos.
        const updated = Object.assign({}, ...matching, record);
        const records = [updated, ...previous.filter(entry => !sameDriver(entry, record))];
        await AsyncStorage.setItem(LocalStorageManager.FAVORITE_DRIVERS_KEY, JSON.stringify(records));
        notifyPreferences();
        return true;
      } catch (error) {
        console.warn('[LocalStorageManager] Error al guardar favorito:', error);
        return false;
      }
    });
  }

  /**
   * Obtiene los identificadores compatibles con los consumidores existentes.
   * @returns {Promise<Array<number|string>>}
   */
  async obtenerFavoritos() {
    const records = await this.obtenerDetalleFavoritos();
    return records.map(record => record.idPiloto);
  }

  // Se ejecuta dentro de la cola: migración y cambios no pueden sobrescribirse.
  async _leerColeccionFavoritos() {
    const raw = await AsyncStorage.getItem(LocalStorageManager.FAVORITE_DRIVERS_KEY);
    if (raw !== null) {
      if (!Array.isArray(JSON.parse(raw))) throw new Error('Colección de favoritos no válida.');
      return driverRecords(raw); // [] es definitivo; nunca se recupera el favorito antiguo.
    }
    const legacy = await AsyncStorage.getItem(LocalStorageManager.FAVORITES_KEY);
    const records = driverRecords(legacy);
    if (legacy !== null) {
      await AsyncStorage.setItem(LocalStorageManager.FAVORITE_DRIVERS_KEY, JSON.stringify(records));
    }
    // Se conserva la clave antigua como respaldo, pero no se vuelve a consultar
    // cuando existe la colección nueva, incluso si quedó vacía.
    return records;
  }

  async obtenerDetalleFavoritos() {
    return updatePreferences(async () => {
      try { return await this._leerColeccionFavoritos(); }
      catch (error) {
        console.warn('[LocalStorageManager] Error al obtener favoritos:', error);
        return [];
      }
    });
  }

  suscribirFavoritos(listener) {
    preferenceListeners.add(listener);
    return () => preferenceListeners.delete(listener);
  }

  /**
   * Elimina el piloto favorito de AsyncStorage
   * @param {number|string|Array<number|string>} pilotoId ID o alias de la misma identidad.
   */
  async eliminarFavorito(pilotoId) {
    return updatePreferences(async () => {
      try {
        const actual = await this._leerColeccionFavoritos();
        const ids = Array.isArray(pilotoId) ? pilotoId : [pilotoId];
        const remaining = actual.filter(record => !ids.some(id => matchesDriver(record, id)));
        if (remaining.length !== actual.length) {
          await AsyncStorage.setItem(LocalStorageManager.FAVORITE_DRIVERS_KEY, JSON.stringify(remaining));
          notifyPreferences();
        }
        return true;
      } catch (error) {
        console.warn('[LocalStorageManager] Error al eliminar favorito:', error);
        return false;
      }
    });
  }

  /**
   * Comprueba si un piloto está en la colección de favoritos.
   * @param {number|string} pilotoId 
   * @returns {Promise<boolean>}
   */
  async esFavorito(pilotoId) {
    try {
      const actual = await updatePreferences(() => this._leerColeccionFavoritos());
      return actual.some(record => matchesDriver(record, pilotoId));
    } catch (error) {
      return false;
    }
  }

  /**
   * Gestión de Escuderías Favoritas
   * Nunca inventa favoritas: si la lectura falla o lo guardado no es válido, la promesa
   * se rechaza para que cada pantalla informe el problema.
   */
  async obtenerEscuderiasFavoritas() {
    try {
      return teamIds(await AsyncStorage.getItem(LocalStorageManager.FAVORITE_TEAMS_KEY));
    } catch (error) {
      console.warn('[LocalStorageManager] Error al obtener escuderías favoritas:', error);
      throw new Error('No se pudieron leer las escuderías favoritas guardadas.');
    }
  }

  async toggleEscuderiaFavorita(equipoId) {
    return updatePreferences(async () => {
      try {
        const lista = teamIds(await AsyncStorage.getItem(LocalStorageManager.FAVORITE_TEAMS_KEY));
        equipoId = teamIds(JSON.stringify([equipoId]))[0];
        let nuevaLista;
        if (lista.includes(equipoId)) {
          nuevaLista = lista.filter(id => id !== equipoId);
        } else {
          nuevaLista = [...lista, equipoId];
        }
        await AsyncStorage.setItem(LocalStorageManager.FAVORITE_TEAMS_KEY, JSON.stringify(nuevaLista));
        notifyPreferences();
        return nuevaLista;
      } catch (e) {
        return [];
      }
    });
  }

  /**
   * Lectura interna de ajustes o alertas. Un fallo de AsyncStorage se propaga para no
   * confundir "no se pudo leer" con "no hay nada guardado"; sin valor guardado o con
   * JSON corrupto se usan los valores predeterminados.
   */
  async _leerPreferencia(clave, predeterminados) {
    const data = await AsyncStorage.getItem(clave);
    if (!data) return { ...predeterminados };
    try {
      return JSON.parse(data);
    } catch (e) {
      return { ...predeterminados };
    }
  }

  /**
   * Gestión de Ajustes de Usuario (Modo Experto, Anti-Spoilers, Unidades)
   */
  async obtenerAjustes() {
    try {
      return await this._leerPreferencia(LocalStorageManager.SETTINGS_KEY, AJUSTES_PREDETERMINADOS);
    } catch (e) {
      return { ...AJUSTES_PREDETERMINADOS };
    }
  }

  async guardarAjustes(nuevosAjustes) {
    try {
      // Si la lectura falla no se escribe: los predeterminados pisarían los ajustes reales.
      const actual = await this._leerPreferencia(LocalStorageManager.SETTINGS_KEY, AJUSTES_PREDETERMINADOS);
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
      return await this._leerPreferencia(LocalStorageManager.ALERTS_KEY, ALERTAS_PREDETERMINADAS);
    } catch (e) {
      return { ...ALERTAS_PREDETERMINADAS };
    }
  }

  async guardarAlertas(nuevasAlertas) {
    try {
      // Si la lectura falla no se escribe: los predeterminados pisarían las alertas reales.
      const actual = await this._leerPreferencia(LocalStorageManager.ALERTS_KEY, ALERTAS_PREDETERMINADAS);
      const updated = { ...actual, ...nuevasAlertas };
      await AsyncStorage.setItem(LocalStorageManager.ALERTS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return null;
    }
  }
}

export default new LocalStorageManager();

