import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalStorageManager from '../../src/storage/LocalStorageManager';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
const key = '@f1fan_favorite_driver';
const teamKey = '@f1fan_favorite_teams';
beforeEach(async () => { await AsyncStorage.clear(); jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

test.each(['63', 'russell', '"63"', '[63,"63"]'])('lee el formato antiguo %s sin reescribirlo ni duplicar favoritos', async raw => {
  await AsyncStorage.setItem(key, raw);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([raw === 'russell' ? 'russell' : 63]);
  expect(await AsyncStorage.getItem(key)).toBe(raw);
});

test('mantiene identidad estable y datos mínimos en la colección, sin guardar estadísticas', async () => {
  await LocalStorageManager.guardarFavorito(33, { driverId: 'max_verstappen', nombre: 'Max', apellido: 'Verstappen', numero: 33, codigo: 'VER', puntos: 900 });
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([33]);
  expect(await LocalStorageManager.obtenerDetalleFavoritos()).toEqual([{ idPiloto: 33, driverId: 'max_verstappen', nombre: 'Max', apellido: 'Verstappen', numero: 33, codigo: 'VER' }]);
  expect(await LocalStorageManager.esFavorito('max_verstappen')).toBe(true);
  expect(await LocalStorageManager.esFavorito('VER')).toBe(true);
  expect(await LocalStorageManager.eliminarFavorito('max_verstappen')).toBe(true);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
});

test('eliminar un favorito de una lista antigua conserva las demás preferencias', async () => {
  await AsyncStorage.setItem(key, JSON.stringify([63, '63', { driverId: 'leclerc', nombre: 'Charles' }, null]));
  await LocalStorageManager.eliminarFavorito('63');
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual(['leclerc']);
  expect((await LocalStorageManager.obtenerDetalleFavoritos())[0].nombre).toBe('Charles');
});

test('seleccionar un piloto no descarta una colección antigua y volver a marcarlo no lo duplica', async () => {
  await AsyncStorage.setItem(key, '[63,16]');
  const identity = { driverId: 'piloto_prueba', nombre: 'Ana', apellido: 'Prueba' };
  await LocalStorageManager.guardarFavorito(81, identity);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([81, 63, 16]);
  await LocalStorageManager.guardarFavorito(81, identity);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([81, 63, 16]);
  await LocalStorageManager.eliminarFavorito(81);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([63, 16]);
});

test('fusiona registros repetidos sin descartar su identidad guardada', async () => {
  await AsyncStorage.setItem(key, JSON.stringify([63, { idPiloto: '63', driverId: 'russell', nombre: 'George' }]));
  expect(await LocalStorageManager.obtenerDetalleFavoritos()).toEqual([{ idPiloto: 63, driverId: 'russell', nombre: 'George' }]);
});

test.each(['{roto', '{}', '[true]'])('no borra datos antiguos ilegibles %s al leer o intentar eliminar', async raw => {
  await AsyncStorage.setItem(key, raw);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  expect(await LocalStorageManager.eliminarFavorito(63)).toBe(false);
  expect(await AsyncStorage.getItem(key)).toBe(raw);
});

test('un fallo de escritura o un identificador vacío no reemplaza la preferencia anterior', async () => {
  await LocalStorageManager.guardarFavorito(63);
  expect(await LocalStorageManager.guardarFavorito('')).toBe(false);
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Disco lleno'));
  expect(await LocalStorageManager.guardarFavorito(4)).toBe(false);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([63]);
});

test('normaliza escuderías antiguas y preserva IDs que no estén en el catálogo actual', async () => {
  const raw = JSON.stringify(['Mercedes', 'mercedes', { constructorId: 'mclaren' }, 'equipo_antiguo']);
  await AsyncStorage.setItem(teamKey, raw);
  expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual(['mercedes', 'mclaren', 'equipo_antiguo']);
  expect(await AsyncStorage.getItem(teamKey)).toBe(raw);
  await LocalStorageManager.toggleEscuderiaFavorita('MERCEDES');
  expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual(['mclaren', 'equipo_antiguo']);
});

test('una lista de escuderías explícitamente vacía no repone las predeterminadas', async () => {
  await AsyncStorage.setItem(teamKey, '[]');
  expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual([]);
  await LocalStorageManager.toggleEscuderiaFavorita('ferrari');
  await LocalStorageManager.toggleEscuderiaFavorita('ferrari');
  expect(await AsyncStorage.getItem(teamKey)).toBe('[]');
});

test('cambios simultáneos de escuderías conservan ambas selecciones y las preferencias ajenas', async () => {
  await AsyncStorage.setItem(teamKey, '[]');
  await LocalStorageManager.guardarAjustes({ unidades: 'mph' });
  await Promise.all([LocalStorageManager.toggleEscuderiaFavorita('ferrari'), LocalStorageManager.toggleEscuderiaFavorita('williams')]);
  expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual(['ferrari', 'williams']);
  expect((await LocalStorageManager.obtenerAjustes()).unidades).toBe('mph');
});

test('un cambio explícito repara escuderías corruptas con una lista válida que solo contiene la elegida', async () => {
  await AsyncStorage.setItem(teamKey, '{roto');
  expect(await LocalStorageManager.toggleEscuderiaFavorita('ferrari')).toEqual(['ferrari']);
  expect(await AsyncStorage.getItem(teamKey)).toBe('["ferrari"]');
});
