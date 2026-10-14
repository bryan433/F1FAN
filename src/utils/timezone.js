/**
 * Utilidades para manejo y conversión de fechas a la hora local chilena (America/Santiago)
 * Conforme a HU-02 y sección 1.2 del SRS de F1Fan.
 */

export const CHILE_TIMEZONE = 'America/Santiago';

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

