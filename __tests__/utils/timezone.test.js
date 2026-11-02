import { combineUtcDateTime, getChileDateTimeParts, isValidCalendarDate } from '../../src/utils/timezone';

test.each([
  ['2026-01-15T15:00:00Z', '12:00', '2026-01-15'],
  ['2026-07-15T15:00:00Z', '11:00', '2026-07-15'],
  ['2026-07-15T02:30:00Z', '22:30', '2026-07-14'],
  ['2026-01-01T01:00:00Z', '22:00', '2025-12-31'],
])('convierte %s a Santiago con cambio estacional y de fecha', (utc, hour, date) => {
  expect(getChileDateTimeParts(utc)).toMatchObject({ horaChile: hour, fechaChile: date });
});

test('obtiene el día de la semana desde la fecha chilena, no desde el día UTC', () => {
  expect(getChileDateTimeParts('2026-07-15T02:30:00Z').dia).toBe('Martes');
});

test.each([
  [undefined, '12:00:00Z'], ['2026-11-08', undefined], ['2026-02-30', '12:00:00Z'],
  ['2026-11-08', '25:00:00Z'], ['2026-11-08', '12:00:00'],
])('no completa ni acepta fecha/hora UTC inválida: %s %s', (date, time) => {
  expect(combineUtcDateTime(date, time)).toBeNull();
});

test('conserva el instante UTC original y valida años bisiestos', () => {
  expect(combineUtcDateTime('2024-02-29', '11:30:00Z')).toBe('2024-02-29T11:30:00Z');
  expect(isValidCalendarDate('2024-02-29')).toBe(true);
  expect(isValidCalendarDate('2026-02-29')).toBe(false);
});

test('si Intl falla, deja la hora desconocida en lugar de usar la zona del dispositivo', () => {
  const formatter = jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => { throw new Error('Intl no disponible'); });
  try {
    expect(getChileDateTimeParts('2026-07-15T15:00:00Z')).toBeNull();
  } finally {
    formatter.mockRestore();
  }
});
