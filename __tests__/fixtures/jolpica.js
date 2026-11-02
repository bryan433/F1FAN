export const seasonsResponse = {
  MRData: {
    total: '3',
    SeasonTable: { Seasons: [{ season: '1950' }, { season: '2023' }, { season: '2024' }] },
  },
};

export const bahrain = {
  season: '2024',
  round: '1',
  raceName: 'Bahrain Grand Prix',
  Circuit: { circuitName: 'Bahrain International Circuit' },
  date: '2024-03-02',
};

export const monza = {
  season: '2024',
  round: '16',
  raceName: 'Italian Grand Prix',
  Circuit: { circuitName: 'Autodromo Nazionale di Monza' },
  date: '2024-09-01',
};

export const silverstone = {
  season: '1950',
  round: '1',
  raceName: 'British Grand Prix',
  Circuit: { circuitName: 'Silverstone Circuit' },
  date: '1950-05-13',
};

export const winners2024 = [
  { ...bahrain, Results: [{ position: '1', Driver: { givenName: 'Max', familyName: 'Verstappen' } }] },
  { ...monza, Results: [{ position: '1', Driver: { givenName: 'Charles', familyName: 'Leclerc' } }] },
];

export const qualifying2024 = [
  { ...bahrain, QualifyingResults: [{ position: '1', Driver: { givenName: 'Max', familyName: 'Verstappen' } }] },
  { ...monza, QualifyingResults: [{ position: '1', Driver: { givenName: 'Lando', familyName: 'Norris' } }] },
];

export const raceResponse = races => ({ MRData: { total: String(races.length), RaceTable: { Races: races } } });
export const okResponse = payload => ({ ok: true, json: async () => payload });

export const bahrainSchedule = {
  ...bahrain,
  Circuit: {
    circuitId: 'bahrain',
    circuitName: 'Bahrain International Circuit',
    Location: { locality: 'Sakhir', country: 'Bahrain' },
  },
  time: '15:00:00Z',
  FirstPractice: { date: '2024-02-29', time: '11:30:00Z' },
  SecondPractice: { date: '2024-02-29', time: '15:00:00Z' },
  ThirdPractice: { date: '2024-03-01', time: '12:30:00Z' },
  Qualifying: { date: '2024-03-01', time: '16:00:00Z' },
};

export const sprintSchedule = {
  season: '2024',
  round: '11',
  raceName: 'Austrian Grand Prix',
  Circuit: { circuitId: 'red_bull_ring', circuitName: 'Red Bull Ring' },
  date: '2024-06-30',
  time: '13:00:00Z',
  FirstPractice: { date: '2024-06-28', time: '10:30:00Z' },
  Qualifying: { date: '2024-06-29', time: '14:00:00Z' },
  Sprint: { date: '2024-06-29', time: '10:00:00Z' },
  SprintQualifying: { date: '2024-06-28', time: '14:30:00Z' },
};
