import { GranPremio } from '../models/GranPremio';
import { Sesion } from '../models/Sesion';
import { combineUtcDateTime, isValidCalendarDate, unknownTimeRemaining } from '../utils/timezone';

function scheduleState(date, instant, now) {
  if (instant) return new Date(instant).getTime() > now ? 'Programado' : 'Estado no confirmado';
  if (isValidCalendarDate(date) && date > new Date(now).toISOString().slice(0, 10)) return 'Programado';
  return 'Estado no confirmado';
}

function buildSessions(race, idMeeting, now) {
  const sprintKey = race.SprintQualifying != null ? 'SprintQualifying' : 'SprintShootout';
  const definitions = [
    ['FirstPractice', 'Practice 1'], ['SecondPractice', 'Practice 2'], ['ThirdPractice', 'Practice 3'],
    [sprintKey, 'Sprint Qualifying'], ['Sprint', 'Sprint'], ['Qualifying', 'Qualifying'], ['Race', 'Carrera'],
  ];
  return definitions.flatMap(([key, tipo]) => {
    const raw = key === 'Race' ? race : race[key];
    if (!raw || typeof raw !== 'object') return [];
    const fechaHoraUTC = combineUtcDateTime(raw.date, raw.time);
    return [new Sesion({
      idSesion: `${idMeeting}:${key}`, idMeeting, tipo, fechaHoraUTC,
      date: raw.date ?? null, time: raw.time ?? null, sourceKey: key,
      estado: scheduleState(raw.date, fechaHoraUTC, now),
      esLive: false, vueltaActual: null, totalVueltas: null,
    })];
  }).sort((a, b) => {
    // Fechas/horas desconocidas quedan al final de su grupo, sin asignarles una hora.
    const dateA = isValidCalendarDate(a.date) ? a.date : '9999-99-99';
    const dateB = isValidCalendarDate(b.date) ? b.date : '9999-99-99';
    return dateA.localeCompare(dateB) || (a.fechaHoraUTC && b.fechaHoraUTC
      ? new Date(a.fechaHoraUTC).getTime() - new Date(b.fechaHoraUTC).getTime()
      : Number(!a.fechaHoraUTC) - Number(!b.fechaHoraUTC));
  });
}

/** No confunde la fecha de inicio programada con el estado real de una carrera. */
export function selectUpcomingGrandPrix(races, now = Date.now()) {
  const todayUTC = new Date(now).toISOString().slice(0, 10);
  const ambiguous = races.some(race => !race.fechaCarreraUTC && (
    !isValidCalendarDate(race.date) || race.date === todayUTC
  ));
  if (ambiguous) return { race: null, reason: 'calendario_incompleto' };
  const future = races.filter(race => race.fechaCarreraUTC
    ? new Date(race.fechaCarreraUTC).getTime() > now
    : isValidCalendarDate(race.date) && race.date > todayUTC);
  future.sort((a, b) => a.date.localeCompare(b.date)
    || (a.fechaCarreraUTC && b.fechaCarreraUTC
      ? new Date(a.fechaCarreraUTC).getTime() - new Date(b.fechaCarreraUTC).getTime()
      : Number(Boolean(a.fechaCarreraUTC)) - Number(Boolean(b.fechaCarreraUTC))));
  return future.length > 0
    ? { race: future[0], reason: 'disponible' }
    : { race: null, reason: 'sin_proxima_carrera' };
}

export function adaptSeasonCalendar(rawRaces, year, now = Date.now(), warning = null) {
  const races = rawRaces.map(raw => {
    if (String(raw.season) !== String(year) || !/^\d+$/.test(String(raw.round)) || Number(raw.round) < 1) {
      throw new Error('Identidad de Gran Premio no válida en el calendario de Jolpica.');
    }
    const id = `jolpica:${raw.season}:${raw.round}`;
    const sesiones = buildSessions(raw, id, now);
    const carrera = sesiones.find(session => session.sourceKey === 'Race');
    const gp = new GranPremio({
      idMeeting: id, season: raw.season, temporada: Number(raw.season), round: raw.round,
      totalRounds: rawRaces.length, nombreOficial: raw.raceName ?? null, nombreCorto: raw.raceName ?? null,
      pais: raw.Circuit?.Location?.country ?? null,
      circuito: {
        idCircuito: raw.Circuit?.circuitId ?? null,
        nombreCircuito: raw.Circuit?.circuitName ?? null,
        ciudad: raw.Circuit?.Location?.locality ?? null,
        pais: raw.Circuit?.Location?.country ?? null,
        longitudKm: null, numeroVueltas: null, numeroCurvas: null, recordVuelta: null,
        temperaturaAire: null, temperaturaPista: null,
      },
      sesiones, fechaInicio: sesiones.find(session => session.fechaHoraUTC)?.fechaHoraUTC ?? null,
      fechaFin: null, fechaCarreraUTC: carrera.fechaHoraUTC,
      date: raw.date ?? null, time: raw.time ?? null,
      estado: carrera.estado, warning,
    });
    return Object.assign(gp, {
      source: 'jolpica', id, name: gp.nombreOficial, circuit: gp.circuito.nombreCircuito,
      country: gp.pais, flag: null, isLive: false,
      status: carrera.estado === 'Programado' ? 'Próxima' : 'Estado no confirmado',
      localChileHour: carrera.horaChile ? `${carrera.horaChile} (Santiago)` : 'Hora por confirmar',
      dateRange: carrera.fechaChile || (isValidCalendarDate(raw.date) ? `${raw.date} (fecha UTC)` : 'Fecha por confirmar'),
      estadoConsulta: 'disponible',
    });
  }).sort((a, b) => Number(a.round) - Number(b.round));

  const { race: next } = selectUpcomingGrandPrix(races, now);
  races.forEach(race => { race.esProximo = race === next; race.isNext = race === next; });
  return races;
}

/** Estado de ausencia; no representa un GP. Conserva el acceso usado por Inicio. */
export function unavailableNextRace(reason, year, warning = null) {
  return {
    disponible: false, estadoConsulta: reason,
    estado: reason === 'calendario_incompleto'
      ? 'No se puede confirmar el próximo GP: faltan fechas u horarios.'
      : 'Sin próxima carrera publicada',
    temporadaConsultada: year, season: null, round: null, totalRounds: null,
    idMeeting: null, nombreOficial: null, nombreCorto: null,
    esProximo: false, sesiones: [], warning,
    calcularTiempoRestante: unknownTimeRemaining,
  };
}
