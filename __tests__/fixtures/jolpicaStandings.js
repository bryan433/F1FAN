// Datos sintéticos exclusivamente para probar el contrato documentado de Jolpica.
export const driverStanding = (overrides = {}) => ({
  position: '1', positionText: '1', points: '125.5', wins: '3',
  Driver: { driverId: 'piloto_prueba', permanentNumber: '81', givenName: 'Ana', familyName: 'Prueba', code: 'ANA', nationality: 'Chilean' },
  Constructors: [{ constructorId: 'equipo_prueba', name: 'Equipo de prueba' }],
  ...overrides,
});

export const secondDriverStanding = (overrides = {}) => driverStanding({
  position: '2', positionText: '2', points: '100', wins: '0',
  Driver: { driverId: 'piloto_ensayo', permanentNumber: '82', givenName: 'Bruno', familyName: 'Ensayo', code: 'BRU' },
  ...overrides,
});

export const constructorStanding = (overrides = {}) => ({
  position: '1', positionText: '1', points: '225.5', wins: '3',
  Constructor: { constructorId: 'equipo_prueba', name: 'Equipo de prueba' },
  ...overrides,
});

export function standingsResponse(kind, entries, { season = '2026', round = '20', total = entries.length } = {}) {
  const collection = kind === 'driver' ? 'DriverStandings' : 'ConstructorStandings';
  return {
    MRData: { total: String(total), StandingsTable: {
      season, StandingsLists: [{ season, round, [collection]: entries }],
    } },
  };
}

export const okStandings = payload => ({ ok: true, json: async () => payload });

export function mockStandingsFetch({ drivers = [driverStanding(), secondDriverStanding()], teams = [constructorStanding()], season = '2026' } = {}) {
  return jest.fn(async url => {
    const kind = url.includes('/driverstandings.json') ? 'driver' : url.includes('/constructorstandings.json') ? 'constructor' : null;
    if (!kind) throw new Error(`Endpoint inesperado en el test: ${url}`);
    return okStandings(standingsResponse(kind, kind === 'driver' ? drivers : teams, { season }));
  });
}
