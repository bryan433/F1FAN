import { Sesion } from '../../src/models/Sesion';

test.each(['2000-01-01T12:00:00Z', '2099-01-01T12:00:00Z'])('la fecha %s no convierte por sí sola una sesión en vivo o finalizada', fechaHoraUTC => {
  const session = new Sesion({ idSesion: 'sesion_a', tipo: 'Practice 1', fechaHoraUTC });
  expect(session.estado).toBe('Estado no confirmado');
  expect(session.esLive).toBe(false);
  expect(session.vueltaActual).toBeNull();
  expect(session.totalVueltas).toBeNull();
  expect(session.idMeeting).toBeNull();
});

test('preserva un estado confirmado y vuelta cero junto a la identidad y los datos UTC originales', () => {
  const session = new Sesion({
    idSesion: 'jolpica:2026:07:Race', idMeeting: 'jolpica:2026:07', tipo: 'Carrera',
    fechaHoraUTC: '2026-11-08T17:00:00Z', date: '2026-11-08', time: '17:00:00Z', sourceKey: 'Race',
    estado: 'En curso', esLive: true, vueltaActual: 0, totalVueltas: 50,
  });
  expect(session).toMatchObject({
    idSesion: 'jolpica:2026:07:Race', idMeeting: 'jolpica:2026:07',
    date: '2026-11-08', time: '17:00:00Z', sourceKey: 'Race',
    estado: 'En curso', esLive: true, vueltaActual: 0, totalVueltas: 50,
  });
});
