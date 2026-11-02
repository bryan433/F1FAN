// Registros sintéticos con los formatos que F1DataService admite actualmente.
// No representan clasificaciones ni resultados oficiales de una temporada.
export function driverRecord(overrides = {}) {
  return {
    idPiloto: 101,
    numero: 21,
    nombre: 'Piloto',
    apellido: 'De prueba',
    codigo: 'PDP',
    pais: 'País de prueba',
    teamId: 'equipo_prueba',
    teamName: 'Equipo de prueba',
    colorHex: '#123456',
    puntos: 10,
    victorias: 1,
    podios: 2,
    poles: 1,
    posicionCampeonato: 2,
    urlFoto: 'https://example.invalid/piloto.png',
    ...overrides,
  };
}

export function apiDriverRecord(overrides = {}) {
  return {
    driver_number: 102,
    first_name: 'Segundo',
    last_name: 'Piloto',
    name_acronym: 'SDP',
    country_code: 'TST',
    team_name: 'Otro equipo',
    team_colour: '654321',
    points: '35',
    headshot_url: 'https://example.invalid/otro-piloto.png',
    ...overrides,
  };
}

export function teamRecord(overrides = {}) {
  return {
    idEscuderia: 'equipo_prueba',
    nombre: 'Equipo de prueba',
    colorHex: '#123456',
    puntos: 50,
    posicionCampeonato: 1,
    pilotos: [101, 102],
    ...overrides,
  };
}
