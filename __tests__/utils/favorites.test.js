import { resolveDriverFavorites, resolveTeamFavorites } from '../../src/utils/favorites';

const ana = { idPiloto: 81, numero: 81, driverId: 'piloto_prueba', codigo: 'ANA', nombre: 'Ana', apellido: 'Prueba', nombreEscuderia: 'Equipo actual' };

test.each([81, '81', 'piloto_prueba', 'ana'])('identifica al mismo piloto mediante %s y prioriza los datos actuales', idPiloto => {
  expect(resolveDriverFavorites([{ idPiloto }], [ana])[0]).toMatchObject({ name: 'Ana Prueba', current: ana, subtitle: 'Equipo actual' });
});

test('deduplica alias del mismo piloto y conserva todos sus IDs guardados para eliminarlo', () => {
  const result = resolveDriverFavorites([{ idPiloto: 81 }, { idPiloto: 'piloto_prueba' }], [ana]);
  expect(result).toHaveLength(1);
  expect(result[0].savedIds).toEqual([81, 'piloto_prueba']);
});

test('driverId guardado prevalece sobre un número que ahora pertenece a otro piloto', () => {
  const max = { idPiloto: 33, numero: 33, driverId: 'max_verstappen', nombre: 'Max', apellido: 'Verstappen' };
  const norris = { idPiloto: 1, numero: 1, driverId: 'norris', nombre: 'Lando', apellido: 'Norris' };
  const result = resolveDriverFavorites([{ idPiloto: 1, driverId: 'max_verstappen' }], [norris, max]);
  expect(result[0].current).toBe(max);
  expect(result[0].savedIds).toEqual(['max_verstappen']);
});

test('el identificador local 1 de Verstappen se reconoce aunque Jolpica use su número permanente 33', () => {
  const max = { idPiloto: 33, numero: 33, driverId: 'max_verstappen', codigo: 'VER', nombre: 'Max', apellido: 'Verstappen' };
  const result = resolveDriverFavorites([{ idPiloto: 1 }], [ana, max]);
  expect(result[0].current).toBe(max);
  expect(result[0].savedIds).toEqual([1]);
});

test('un piloto fuera del calendario no se confunde con otro dorsal ni pierde su nombre guardado', () => {
  const result = resolveDriverFavorites([{ idPiloto: 81, driverId: 'retirado', nombre: 'Piloto', apellido: 'Anterior' }], [ana]);
  expect(result[0]).toMatchObject({ name: 'Piloto Anterior', current: undefined, subtitle: 'Guardado; información actual no disponible' });
});

test('resuelve la identidad local antigua sin utilizar sus puntos ni su escudería histórica como datos actuales', () => {
  const result = resolveDriverFavorites([{ idPiloto: '63' }], []);
  expect(result[0].name).toBe('George Russell');
  expect(result[0].subtitle).toMatch(/no disponible/);
  expect(result[0].puntos).toBeUndefined();
});

test('conserva un identificador desconocido visible y eliminable sin inventar un piloto', () => {
  const result = resolveDriverFavorites([{ idPiloto: 'desconocido' }], []);
  expect(result[0]).toMatchObject({ name: 'Piloto guardado (desconocido)', savedIds: ['desconocido'], number: '—' });
});

test('resuelve escuderías actuales, locales y desconocidas sin descartar preferencias', () => {
  const result = resolveTeamFavorites(['equipo_actual', 'mercedes', 'historia'], [{ idEscuderia: 'equipo_actual', nombre: 'Equipo actual' }]);
  expect(result.map(team => team.name)).toEqual(['Equipo actual', 'Mercedes', 'Escudería guardada (historia)']);
});
