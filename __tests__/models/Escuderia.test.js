import { Escuderia } from '../../src/models/Escuderia';

test('los equipos sin plantilla suministrada tienen listas de pilotos independientes', () => {
  const first = new Escuderia({ idEscuderia: 'equipo_a', nombre: 'Equipo A' });
  const second = new Escuderia({ idEscuderia: 'equipo_b', nombre: 'Equipo B' });
  first.pilotos.push(101);
  expect(first.pilotos).toEqual([101]);
  expect(second.pilotos).toEqual([]);
  expect(first.pilotos).not.toBe(second.pilotos);
  expect(second.idEscuderia).toBe('equipo_b');
});
