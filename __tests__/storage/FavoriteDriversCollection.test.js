import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalStorageManager from '../../src/storage/LocalStorageManager';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const key = '@f1fan_favorite_drivers';
const legacyKey = '@f1fan_favorite_driver';
const max = { driverId: 'max_verstappen', codigo: 'VER', nombre: 'Max', apellido: 'Verstappen' };
const lando = { driverId: 'norris', codigo: 'NOR', nombre: 'Lando', apellido: 'Norris' };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('conserva múltiples pilotos y elimina solamente el seleccionado', async () => {
  await LocalStorageManager.guardarFavorito(33, max);
  await LocalStorageManager.guardarFavorito(4, lando);
  expect(await LocalStorageManager.esFavorito('max_verstappen')).toBe(true);
  expect(await LocalStorageManager.esFavorito('norris')).toBe(true);
  await LocalStorageManager.eliminarFavorito('max_verstappen');
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([4]);
});

test('migra el favorito antiguo y no lo resucita después de vaciar la colección', async () => {
  await AsyncStorage.setItem(legacyKey, '33');
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([33]);
  expect(JSON.parse(await AsyncStorage.getItem(key))).toEqual([{ idPiloto: 33 }]);
  await LocalStorageManager.eliminarFavorito(33);
  expect(await AsyncStorage.getItem(key)).toBe('[]');
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  await LocalStorageManager.guardarFavorito(4, lando);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([4]);
});

test('una colección vacía existente tiene prioridad sobre el favorito antiguo', async () => {
  await AsyncStorage.setItem(legacyKey, '33');
  await AsyncStorage.setItem(key, '[]');
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  expect(await LocalStorageManager.esFavorito(33)).toBe(false);
});

test('la identidad Jolpica distingue pilotos diferentes que usaron el mismo dorsal', async () => {
  await LocalStorageManager.guardarFavorito(1, max);
  await LocalStorageManager.guardarFavorito(1, lando);
  expect(await LocalStorageManager.obtenerDetalleFavoritos()).toHaveLength(2);
  await LocalStorageManager.eliminarFavorito('max_verstappen');
  expect(await LocalStorageManager.esFavorito('norris')).toBe(true);
  expect(await LocalStorageManager.esFavorito('max_verstappen')).toBe(false);
});

test('selecciones concurrentes y cambio de dorsal no pierden ni duplican favoritos', async () => {
  await Promise.all([
    LocalStorageManager.guardarFavorito(1, max), LocalStorageManager.guardarFavorito(4, lando),
  ]);
  await LocalStorageManager.guardarFavorito(33, max);
  expect(await LocalStorageManager.obtenerDetalleFavoritos()).toHaveLength(2);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([33, 4]);
});

test('si falla la migración conserva los datos originales y permite reintentar', async () => {
  await AsyncStorage.setItem(legacyKey, '[33,4]');
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Disco lleno'));
  expect(await LocalStorageManager.guardarFavorito(16, { driverId: 'leclerc' })).toBe(false);
  expect(await AsyncStorage.getItem(legacyKey)).toBe('[33,4]');
  expect(await AsyncStorage.getItem(key)).toBeNull();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([33, 4]);
});

test('datos corruptos de la colección no se reemplazan por preferencias antiguas', async () => {
  await AsyncStorage.setItem(legacyKey, '33');
  await AsyncStorage.setItem(key, '{roto');
  expect(await LocalStorageManager.guardarFavorito(4, lando)).toBe(false);
  expect(await AsyncStorage.getItem(key)).toBe('{roto');
  expect(await AsyncStorage.getItem(legacyKey)).toBe('33');
});

test('notifica solo cambios persistidos y permite cancelar la suscripción', async () => {
  const listener = jest.fn();
  const unsubscribe = LocalStorageManager.suscribirFavoritos(listener);
  try {
    await LocalStorageManager.guardarFavorito(33, max);
    expect(listener).toHaveBeenCalledTimes(1);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Disco lleno'));
    expect(await LocalStorageManager.eliminarFavorito('max_verstappen')).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(await LocalStorageManager.esFavorito('max_verstappen')).toBe(true);
    await LocalStorageManager.eliminarFavorito('max_verstappen');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await LocalStorageManager.guardarFavorito(4, lando);
    expect(listener).toHaveBeenCalledTimes(2);
  } finally { unsubscribe(); }
});

test('migra varios formatos y une alias del mismo piloto cuando se guarda su identidad real', async () => {
  await AsyncStorage.setItem(legacyKey, JSON.stringify([1, 'VER', 'max_verstappen', '4', 4, 'desconocido']));
  await LocalStorageManager.guardarFavorito(33, max);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([33, 4, 'desconocido']);
  expect((await LocalStorageManager.obtenerDetalleFavoritos())[0].driverId).toBe('max_verstappen');
  expect(await LocalStorageManager.esFavorito('VER')).toBe(true);
});

test('elimina todos los alias de una identidad en una única escritura y conserva los demás', async () => {
  await AsyncStorage.setItem(legacyKey, '["VER","max_verstappen",4]');
  await LocalStorageManager.obtenerDetalleFavoritos();
  AsyncStorage.setItem.mockClear();
  await LocalStorageManager.eliminarFavorito(['VER', 'max_verstappen']);
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([4]);
});

test('una colección nueva válida no se mezcla con selecciones antiguas ya eliminadas', async () => {
  await AsyncStorage.setItem(legacyKey, '[33,16]');
  await AsyncStorage.setItem(key, JSON.stringify([{ idPiloto: 4, ...lando }]));
  await LocalStorageManager.guardarFavorito(81, { driverId: 'piastri' });
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([81, 4]);
});

test('un consumidor antiguo que guarda solo el número no borra la identidad estable existente', async () => {
  await LocalStorageManager.guardarFavorito(33, max);
  await LocalStorageManager.guardarFavorito(4, lando);
  await LocalStorageManager.guardarFavorito(33);
  expect((await LocalStorageManager.obtenerDetalleFavoritos())[0]).toMatchObject(max);
  expect(await LocalStorageManager.esFavorito('VER')).toBe(true);
  expect(await LocalStorageManager.esFavorito('norris')).toBe(true);
});
