// Datos deliberadamente sintéticos para controlar la selección y el reloj.
export function calendarRace(overrides = {}) {
  return {
    season: '2026', round: '1', raceName: 'GP de prueba',
    Circuit: {
      circuitId: 'test_circuit', circuitName: 'Circuito de prueba',
      Location: { locality: 'Ciudad de prueba', country: 'País de prueba' },
    },
    date: '2026-11-08', time: '17:00:00Z',
    FirstPractice: { date: '2026-11-06', time: '13:00:00Z' },
    Qualifying: { date: '2026-11-07', time: '16:00:00Z' },
    ...overrides,
  };
}
