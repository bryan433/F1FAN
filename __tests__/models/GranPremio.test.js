import { GranPremio } from '../../src/models/GranPremio';

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-02T12:00:00Z'));
});
afterEach(() => { jest.useRealTimers(); });

test('usa el nombre oficial como nombre corto ausente, conserva el breve explícito y no fija una temporada', () => {
  const unnamedShort = new GranPremio({ idMeeting: 'gp_a', nombreOficial: 'Gran Premio de prueba' });
  expect(unnamedShort.nombreCorto).toBe('Gran Premio de prueba');
  expect(unnamedShort.season).toBeNull();
  expect(unnamedShort.temporada).toBeNull();
  const namedShort = new GranPremio({ idMeeting: 'gp_b', nombreOficial: 'Otro Gran Premio', nombreCorto: 'GP corto', temporada: 2026, round: '07' });
  expect(namedShort.nombreCorto).toBe('GP corto');
  expect(namedShort.season).toBe(2026);
  expect(namedShort.round).toBe('07');
});

test.each(['RACE', 'Carrera'])('sin fechaCarreraUTC conserva el contrato de contador usando la sesión %s', tipo => {
  const gp = new GranPremio({
    idMeeting: 'gp_a', nombreOficial: 'GP de prueba',
    fechaInicio: '2026-11-02T13:00:00Z',
    sesiones: [
      { tipo: 'Practice 1', fechaHoraUTC: '2026-11-02T13:00:00Z' },
      { tipo, fechaHoraUTC: '2026-11-03T14:30:00Z' },
    ],
  });
  expect(gp.calcularTiempoRestante()).toEqual({ days: 1, hours: 2, minutes: 30, seconds: 0, isPassed: false });
});

test('conserva el respaldo existente a fechaInicio cuando no hay sesión de carrera', () => {
  const gp = new GranPremio({
    idMeeting: 'gp_a', nombreOficial: 'GP de prueba', fechaInicio: '2026-11-02T14:00:00Z',
    sesiones: [{ fechaHoraUTC: null }],
  });
  expect(gp.calcularTiempoRestante()).toEqual({ days: 0, hours: 2, minutes: 0, seconds: 0, isPassed: false });
  // Compatibilidad del modelo; Inicio actualmente entrega fechaCarreraUTC directamente al contador.
});
