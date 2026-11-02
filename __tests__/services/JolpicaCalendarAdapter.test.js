import { adaptSeasonCalendar, selectUpcomingGrandPrix, unavailableNextRace } from '../../src/services/JolpicaCalendarAdapter';
import { GranPremio } from '../../src/models/GranPremio';
import { Sesion } from '../../src/models/Sesion';
import { calendarRace } from '../fixtures/calendar';

const now = Date.parse('2026-11-01T12:00:00Z');

test('conserva identidad original y crea modelos con los campos de Inicio, Calendario y Detalle', () => {
  const [gp] = adaptSeasonCalendar([calendarRace({ round: '07' })], 2026, now);
  expect(gp).toBeInstanceOf(GranPremio);
  expect(gp).toMatchObject({
    season: '2026', temporada: 2026, round: '07', idMeeting: 'jolpica:2026:07',
    id: 'jolpica:2026:07', nombreOficial: 'GP de prueba', name: 'GP de prueba',
    circuit: 'Circuito de prueba', country: 'País de prueba',
    esProximo: true, isNext: true, status: 'Próxima', isLive: false,
    fechaCarreraUTC: '2026-11-08T17:00:00Z', fechaFin: null,
  });
  expect(gp.circuito).toMatchObject({ idCircuito: 'test_circuit', longitudKm: null, numeroVueltas: null });
  expect(gp.sesiones.every(session => session instanceof Sesion)).toBe(true);
  expect(gp.sesiones.every(session => session.idMeeting === gp.idMeeting)).toBe(true);
  expect(gp.localChileHour).toBe('14:00 (Santiago)');
});

test('ordena por fechas reales, incluye sprint y no depende del orden de las propiedades', () => {
  const raw = calendarRace({
    ThirdPractice: { date: '2026-11-06', time: '14:00:00Z' },
    SecondPractice: { date: '2026-11-05', time: '16:00:00Z' },
    SprintQualifying: { date: '2026-11-06', time: '18:00:00Z' },
    Sprint: { date: '2026-11-07', time: '12:00:00Z' },
  });
  const [gp] = adaptSeasonCalendar([raw], '2026', now);
  expect(gp.sesiones.map(session => session.tipo)).toEqual([
    'Practice 2', 'Practice 1', 'Practice 3', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Carrera',
  ]);
  expect(gp.sesiones.every(session => session.esLive === false
    && session.vueltaActual === null && session.totalVueltas === null)).toBe(true);
});

test('acepta SprintShootout y no duplica la sesión si están presentes ambos nombres', () => {
  const session = { date: '2026-11-06', time: '18:00:00Z' };
  const [legacy] = adaptSeasonCalendar([calendarRace({ SprintShootout: session })], '2026', now);
  expect(legacy.sesiones.find(item => item.tipo === 'Sprint Qualifying').sourceKey).toBe('SprintShootout');
  const [both] = adaptSeasonCalendar([calendarRace({ SprintShootout: session, SprintQualifying: session })], '2026', now);
  expect(both.sesiones.filter(item => item.tipo === 'Sprint Qualifying')).toHaveLength(1);
});

test('una sesión sin hora conserva fecha pero no inventa hora UTC, día chileno o duración', () => {
  const [gp] = adaptSeasonCalendar([calendarRace({ FirstPractice: { date: '2026-11-06' }, time: undefined })], '2026', now);
  expect(gp.sesiones[0]).toMatchObject({ date: '2026-11-06', time: null, fechaHoraUTC: null, dia: null, horaChile: null });
  expect(gp.sesiones[0].obtenerHoraLocal()).toBeNull();
  expect(gp.fechaCarreraUTC).toBeNull();
  expect(gp.localChileHour).toBe('Hora por confirmar');
  expect(gp.calcularTiempoRestante()).toMatchObject({ isUnknown: true, isPassed: null });
  expect(gp.esProximo).toBe(true); // La fecha futura sí está publicada; el contador sigue siendo desconocido.
});

test('no agrega prácticas ausentes y mantiene cada GP con sus propias sesiones', () => {
  const first = calendarRace({ round: '1', FirstPractice: undefined, Qualifying: undefined });
  const second = calendarRace({ round: '2', date: '2026-11-15', FirstPractice: undefined, Qualifying: undefined });
  const races = adaptSeasonCalendar([second, first], '2026', now);
  expect(races.map(gp => gp.round)).toEqual(['1', '2']);
  expect(races.map(gp => gp.sesiones.map(session => session.fechaHoraUTC))).toEqual([
    ['2026-11-08T17:00:00Z'], ['2026-11-15T17:00:00Z'],
  ]);
  expect(races[0].sesiones[0].idSesion).not.toBe(races[1].sesiones[0].idSesion);
});

test('selecciona por fecha de carrera, no por ronda, orden de respuesta ni prácticas futuras', () => {
  const races = adaptSeasonCalendar([
    calendarRace({ round: '1', date: '2026-11-15' }),
    calendarRace({ round: '2', date: '2026-11-03' }),
    calendarRace({ round: '3', date: '2026-10-25' }),
  ], '2026', now);
  expect(selectUpcomingGrandPrix(races, now).race.round).toBe('2');
  expect(races.filter(gp => gp.esProximo).map(gp => gp.round)).toEqual(['2']);
  expect(races[2]).toMatchObject({ status: 'Estado no confirmado', esProximo: false });
});

test('no considera próxima una carrera cuyo inicio ya llegó ni afirma que terminó', () => {
  const races = adaptSeasonCalendar([calendarRace({ date: '2026-11-01', time: '12:00:00Z' })], '2026', now);
  expect(selectUpcomingGrandPrix(races, now)).toEqual({ race: null, reason: 'sin_proxima_carrera' });
  expect(races[0].sesiones.find(session => session.tipo === 'Carrera').estado).toBe('Estado no confirmado');
});

test.each([
  { date: undefined }, { date: '2026-02-30' }, { date: '2026-11-01', time: undefined },
])('devuelve incertidumbre explícita si no puede ubicar la carrera: %j', fields => {
  const races = adaptSeasonCalendar([calendarRace(fields)], '2026', now);
  expect(selectUpcomingGrandPrix(races, now)).toEqual({ race: null, reason: 'calendario_incompleto' });
});

test('no permite que una respuesta de otro año se convierta en el GP solicitado', () => {
  expect(() => adaptSeasonCalendar([calendarRace({ season: '2025' })], '2026', now)).toThrow('Identidad de Gran Premio no válida');
});

test('la ausencia es explícita, no contiene un GP inventado y mantiene el acceso al contador', () => {
  const result = unavailableNextRace('sin_proxima_carrera', 2026);
  expect(result).toMatchObject({ disponible: false, estadoConsulta: 'sin_proxima_carrera', idMeeting: null, season: null, round: null, sesiones: [] });
  expect(result.calcularTiempoRestante()).toMatchObject({ isUnknown: true, isPassed: null });
});
