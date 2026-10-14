import { TEAMS, DRIVERS } from './teamsAndDrivers';

export const CURRENT_MEETING = {
  idMeeting: 1245,
  nombreOficial: 'FORMULA 1 SINGAPORE AIRLINES SINGAPORE GRAND PRIX 2024',
  nombreCorto: 'GRAN PREMIO DE SINGAPUR',
  pais: 'Singapur',
  ciudad: 'Marina Bay',
  bandera: '🇸🇬',
  temporada: 2024,
  round: 17,
  totalRounds: 24,
  esProximo: true,
  estado: 'En curso',
  // Sábado / Domingo de carrera para el contador
  targetRaceTime: new Date(Date.now() + (2 * 24 * 3600 + 14 * 3600 + 38 * 60) * 1000).toISOString(),
  circuito: {
    nombreCircuito: 'Marina Bay Street Circuit',
    ciudad: 'Marina Bay',
    pais: 'Singapur',
    longitudKm: 5.063,
    numeroVueltas: 62,
    numeroCurvas: 19,
    recordVuelta: '1:29.525',
    recordAutor: 'Lewis Hamilton (2023)',
    temperaturaAire: '29°C',
    temperaturaPista: '38°C',
    humedad: '76%',
    viento: '12 km/h'
  },
  sesiones: [
    {
      idSesion: 9156,
      tipo: 'Practice 1',
      dia: 'Viernes',
      horaChile: '08:30',
      fechaHoraUTC: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      estado: 'Finalizado',
      badge: 'FINALIZADO',
      resultadoLider: 'Charles Leclerc (1:31.763)'
    },
    {
      idSesion: 9157,
      tipo: 'Practice 2',
      dia: 'Viernes',
      horaChile: '12:00',
      fechaHoraUTC: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      estado: 'En curso',
      badge: 'EN VIVO - VUELTA 12',
      vueltaActual: 12,
      totalVueltas: 25,
      esLive: true
    },
    {
      idSesion: 9158,
      tipo: 'Practice 3',
      dia: 'Sábado',
      horaChile: '08:30',
      fechaHoraUTC: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      estado: 'Programado',
      badge: 'MAÑANA'
    },
    {
      idSesion: 9159,
      tipo: 'Qualifying',
      dia: 'Sábado',
      horaChile: '11:00',
      fechaHoraUTC: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      estado: 'Programado',
      badge: 'CLASIFICACIÓN'
    },
    {
      idSesion: 9160,
      tipo: 'Carrera',
      dia: 'Domingo',
      horaChile: '09:00',
      fechaHoraUTC: new Date(Date.now() + (2 * 24 * 3600 + 14 * 3600) * 1000).toISOString(),
      estado: 'Programado',
      badge: 'GRAN PREMIO'
    }
  ]
};

export const LIVE_TIMING_DATA = [
  { position: 1, driverCode: 'NOR', driverNumber: 4, driverName: 'L. NORRIS', team: 'McLaren', color: '#FF8000', gap: 'LEADER', interval: '-', time: '1:29.812', tyre: 'S', lap: 12, pitStops: 0, sector1: '26.8', sector2: '37.1', sector3: '25.9' },
  { position: 2, driverCode: 'VER', driverNumber: 1, driverName: 'M. VERSTAPPEN', team: 'Red Bull Racing', color: '#3671C6', gap: '+0.184', interval: '+0.184', time: '1:29.996', tyre: 'M', lap: 12, pitStops: 0, sector1: '26.9', sector2: '37.0', sector3: '26.1' },
  { position: 3, driverCode: 'RUS', driverNumber: 63, driverName: 'G. RUSSELL', team: 'Mercedes', color: '#27F4D2', gap: '+0.212', interval: '+0.028', time: '1:30.024', tyre: 'M', lap: 11, pitStops: 0, sector1: '27.0', sector2: '36.9', sector3: '26.1', isFavorite: true },
  { position: 4, driverCode: 'LEC', driverNumber: 16, driverName: 'C. LECLERC', team: 'Ferrari', color: '#E8002D', gap: '+0.447', interval: '+0.235', time: '1:30.259', tyre: 'H', lap: 13, pitStops: 0, sector1: '27.1', sector2: '37.2', sector3: '25.9' },
  { position: 5, driverCode: 'HAM', driverNumber: 44, driverName: 'L. HAMILTON', team: 'Mercedes', color: '#27F4D2', gap: '+0.690', interval: '+0.243', time: '1:30.502', tyre: 'M', lap: 10, pitStops: 0, sector1: '27.2', sector2: '37.1', sector3: '26.2' },
  { position: 6, driverCode: 'PIA', driverNumber: 81, driverName: 'O. PIASTRI', team: 'McLaren', color: '#FF8000', gap: '+0.712', interval: '+0.022', time: '1:30.524', tyre: 'S', lap: 12, pitStops: 0, sector1: '27.0', sector2: '37.4', sector3: '26.1' },
  { position: 7, driverCode: 'ALO', driverNumber: 14, driverName: 'F. ALONSO', team: 'Aston Martin', color: '#229971', gap: '+1.038', interval: '+0.326', time: '1:30.850', tyre: 'H', lap: 9, pitStops: 0, sector1: '27.3', sector2: '37.3', sector3: '26.2' }
];

export const TELEMETRY_SAMPLE = {
  driver: 'G. RUSSELL',
  team: 'Mercedes',
  number: 63,
  speed: 312,
  gear: 7,
  rpm: 11840,
  drs: true,
  throttle: 98,
  brake: 0,
  lapTime: '1:30.024',
  tyreCompound: 'MEDIUM',
  tyreAge: 11
};

export const CALENDAR_RACES = [
  {
    id: 13,
    round: 13,
    name: 'Gran Premio de Bélgica',
    circuit: 'Circuit de Spa-Francorchamps',
    country: 'Bélgica',
    flag: '🇧🇪',
    dateRange: '26 - 28 Jul',
    winner: 'HAM',
    status: 'Finalizado',
    isNext: false
  },
  {
    id: 14,
    round: 14,
    name: 'Gran Premio de Países Bajos',
    circuit: 'Circuit Zandvoort',
    country: 'Países Bajos',
    flag: '🇳🇱',
    dateRange: '23 - 25 Ago',
    winner: 'NOR',
    status: 'Finalizado',
    isNext: false
  },
  {
    id: 15,
    round: 15,
    name: 'Gran Premio de Italia',
    circuit: 'Autodromo Nazionale Monza',
    country: 'Italia',
    flag: '🇮🇹',
    dateRange: '30 Ago - 01 Sep',
    winner: 'LEC',
    status: 'Finalizado',
    isNext: false
  },
  {
    id: 16,
    round: 16,
    name: 'Gran Premio de Azerbaiyán',
    circuit: 'Baku City Circuit',
    country: 'Azerbaiyán',
    flag: '🇦🇿',
    dateRange: '13 - 15 Sep',
    winner: 'PIA',
    status: 'Finalizado',
    isNext: false
  },
  {
    id: 17,
    round: 17,
    name: 'Gran Premio de Singapur',
    circuit: 'Marina Bay Street Circuit',
    country: 'Singapur',
    flag: '🇸🇬',
    dateRange: '20 - 22 Sep',
    localChileHour: '09:00 CLT',
    status: 'Próxima',
    isLive: true,
    isNext: true
  },
  {
    id: 18,
    round: 18,
    name: 'Gran Premio de Estados Unidos',
    circuit: 'Circuit of The Americas',
    country: 'Austin, USA',
    flag: '🇺🇸',
    dateRange: '18 - 20 Oct',
    localChileHour: '16:00 CLT',
    status: 'Próxima',
    isNext: false
  },
  {
    id: 19,
    round: 19,
    name: 'Gran Premio de la Ciudad de México',
    circuit: 'Autódromo Hermanos Rodríguez',
    country: 'México',
    flag: '🇲🇽',
    dateRange: '25 - 27 Oct',
    localChileHour: '17:00 CLT',
    status: 'Próxima',
    isNext: false
  },
  {
    id: 20,
    round: 20,
    name: 'Gran Premio de São Paulo',
    circuit: 'Autódromo de Interlagos',
    country: 'Brasil',
    flag: '🇧🇷',
    dateRange: '01 - 03 Nov',
    localChileHour: '14:00 CLT',
    status: 'Próxima',
    isNext: false
  }
];

export const NEWS_HEADLINES = [
  {
    id: 'n1',
    category: 'SINGAPUR',
    title: 'Russell terminó P2 en FP1: "El auto se siente muy sólido con alta carga"',
    subtitle: 'El piloto británico quedó a solo 0.081s de Leclerc en una intensa sesión nocturna.',
    time: 'Hace 35 min',
    image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&q=80'
  },
  {
    id: 'n2',
    category: 'MERCEDES',
    title: 'Mercedes trae una nueva especificación de suelo a Singapur',
    subtitle: 'Toto Wolff confirma optimizaciones aerodinámicas para batallar por la pole position.',
    time: 'Hace 2 horas',
    image: 'https://images.unsplash.com/photo-1541348263662-e0c82661210e?w=600&q=80'
  },
  {
    id: 'n3',
    category: 'ESTRATEGIA',
    title: 'El calor de Marina Bay marca la degradación de neumáticos',
    subtitle: 'Pirelli anticipa estrategia a dos paradas debido a las altas temperaturas en el asfalto.',
    time: 'Hace 4 horas',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80'
  }
];

export const USER_PROFILE_MOCK = {
  nombre: 'Diego Morales',
  tag: '@diegof1',
  carrerasVistas: 47,
  polesAcertadas: 12,
  aniosFan: 9,
  pilotoFavorito: 'George Russell',
  equipoFavorito: 'Mercedes-AMG PETRONAS'
};

