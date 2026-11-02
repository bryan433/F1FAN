/**
 * Utilidades para manejo y conversión de fechas a la hora local chilena (America/Santiago)
 * Conforme a HU-02 y sección 1.2 del SRS de F1Fan.
 */

export const CHILE_TIMEZONE = 'America/Santiago';

/** Valida una fecha de calendario sin convertir una hora ausente en medianoche. */
export function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function combineUtcDateTime(date, time) {
  if (!isValidCalendarDate(date) || typeof time !== 'string') return null;
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|\+00:00)$/.test(time)) return null;
  const value = `${date}T${time}`;
  return Number.isFinite(new Date(value).getTime()) ? value : null;
}

/** Devuelve null si no se puede garantizar una conversión a Santiago. */
export function getChileDateTimeParts(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('es-CL', {
      timeZone: CHILE_TIMEZONE,
      year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return {
      dia: fields.weekday[0].toUpperCase() + fields.weekday.slice(1),
      horaChile: `${fields.hour}:${fields.minute}`,
      fechaChile: `${fields.year}-${fields.month}-${fields.day}`,
    };
  } catch (error) {
    return null;
  }
}

export function unknownTimeRemaining() {
  return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: null, isUnknown: true };
}

/**
 * Convierte una fecha ISO/UTC a formato de hora local chilena
 * @param {string|Date} dateInput 
 * @param {object} options 
 * @returns {string} Fecha u hora formateada en huso horario de Chile
 */
export function formatToChileTime(dateInput, options = {}) {
  if (!dateInput) return '--:--';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  const defaultOptions = {
    timeZone: CHILE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options
  };

  try {
    return new Intl.DateTimeFormat('es-CL', defaultOptions).format(date);
  } catch (e) {
    // Fallback si la plataforma no soporta Intl completo
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}

/**
 * Formatea fecha completa (ej: "Viernes 20 Sept, 08:30 CLT")
 */
export function formatChileFullDate(dateInput) {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  try {
    const formatted = new Intl.DateTimeFormat('es-CL', {
      timeZone: CHILE_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
    return `${formatted} CLT`;
  } catch (e) {
    return date.toLocaleDateString();
  }
}

/**
 * Calcula la diferencia de tiempo hasta un evento futuro para el contador regresivo
 * @param {string|Date} targetDate 
 * @returns {{days: number, hours: number, minutes: number, seconds: number, isPassed: boolean}}
 */
export function calculateTimeRemaining(targetDate) {
  if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
  
  // Si ya es un objeto formateado, retornarlo de inmediato
  if (typeof targetDate === 'object' && typeof targetDate.days === 'number') {
    return targetDate;
  }

  let target;
  if (typeof targetDate === 'string' || typeof targetDate === 'number') {
    target = new Date(targetDate).getTime();
  } else if (targetDate instanceof Date || typeof targetDate.getTime === 'function') {
    target = targetDate.getTime();
  } else {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
  }

  const now = Date.now();
  const diff = target - now;

  if (diff <= 0 || isNaN(diff)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isPassed: false };
}

