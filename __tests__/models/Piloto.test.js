import { Piloto } from '../../src/models/Piloto';

test.each([
  [{ nombre: 'Ana', apellido: '' }, 'Ana'],
  [{ nombre: '', apellido: 'Ensayo' }, 'Ensayo'],
])('el nombre completo omite espacios sobrantes cuando falta una parte: %p', (data, expected) => {
  const driver = new Piloto({ idPiloto: 101, ...data });
  expect(driver.obtenerNombreCompleto()).toBe(expected);
});

test('toggleFavorito cambia el estado del modelo de forma reversible sin alterar su identidad', () => {
  const driver = new Piloto({ idPiloto: 101, nombre: 'Ana', apellido: 'Prueba', esFavorito: true, puntos: 0 });
  expect(driver.toggleFavorito()).toBe(false);
  expect(driver.esFavorito).toBe(false);
  expect(driver.toggleFavorito()).toBe(true);
  expect(driver.esFavorito).toBe(true);
  expect(driver.idPiloto).toBe(101);
  expect(driver.puntos).toBe(0);
  // Este método de dominio no persiste favoritos: la aplicación usa LocalStorageManager para ello.
});
