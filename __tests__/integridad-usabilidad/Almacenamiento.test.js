import { isDeepStrictEqual } from 'util';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { CLAVES } from './helpers/entorno';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const T0 = 1_000_000;
const UNA_HORA = 3_600_000;
const AJUSTES_PREDETERMINADOS = { modoExperto: false, evitarSpoilers: false, unidades: 'km/h', horaChilenaActivada: true };
const ALERTAS_PREDETERMINADAS = { boxes: true, radio: true, safetyCar: true };
let reloj;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  reloj = jest.spyOn(Date, 'now').mockReturnValue(T0);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); });

const leerJSON = async clave => JSON.parse(await AsyncStorage.getItem(clave));

describe('Caché con expiración', () => {
  test.each([
    [1, 1],
    [60_000, 60_000],
    ['predeterminado (1 h)', undefined],
  ])('con maxAge %s la copia es vigente exactamente en el límite y vence 1 ms después', async (_nombre, maxAge) => {
    const limite = maxAge ?? UNA_HORA;
    await LocalStorageManager.guardarCache('limite', { carrera: 'GP de prueba' });
    reloj.mockReturnValue(T0 + limite);
    expect(await LocalStorageManager.obtenerCache('limite', maxAge)).toEqual({ carrera: 'GP de prueba' });
    reloj.mockReturnValue(T0 + limite + 1);
    expect(await LocalStorageManager.obtenerCache('limite', maxAge)).toBeNull();
  });

  test('obtenerUltimaCopiaCache devuelve una copia vencida hace un año y null si no existe', async () => {
    await LocalStorageManager.guardarCache('calendario', ['GP de prueba']);
    reloj.mockReturnValue(T0 + 365 * 24 * UNA_HORA);
    expect(await LocalStorageManager.obtenerCache('calendario', UNA_HORA)).toBeNull();
    expect(await LocalStorageManager.obtenerUltimaCopiaCache('calendario')).toEqual(['GP de prueba']);
    expect(await LocalStorageManager.obtenerUltimaCopiaCache('inexistente')).toBeNull();
  });

  test('las claves de caché quedan aisladas por prefijo y no alteran preferencias ni otras claves', async () => {
    await LocalStorageManager.guardarFavorito('piloto_prueba');
    await AsyncStorage.setItem(CLAVES.escuderias, '["equipo_prueba"]');
    const favoritosAntes = await AsyncStorage.getItem(CLAVES.pilotos);

    await LocalStorageManager.guardarCache('favorite_drivers', ['valor de caché']);
    await LocalStorageManager.guardarCache('favorite_teams', ['valor de caché']);
    await LocalStorageManager.guardarCache('a', 'A');
    await LocalStorageManager.guardarCache('ab', 'AB');

    expect(await AsyncStorage.getItem(CLAVES.pilotos)).toBe(favoritosAntes);
    expect(await LocalStorageManager.obtenerFavoritos()).toEqual(['piloto_prueba']);
    expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual(['equipo_prueba']);
    expect(await LocalStorageManager.obtenerCache('a')).toBe('A');
    expect(await LocalStorageManager.obtenerCache('ab')).toBe('AB');
    // La caché "favorite_drivers" vive bajo su prefijo y es independiente de la colección de favoritos.
    expect(await LocalStorageManager.obtenerCache('favorite_drivers')).toEqual(['valor de caché']);
    expect(await AsyncStorage.getAllKeys()).toEqual(expect.arrayContaining([
      `${CLAVES.cache}favorite_drivers`, `${CLAVES.cache}favorite_teams`, `${CLAVES.cache}a`, `${CLAVES.cache}ab`,
    ]));
  });

  // DEFECTO: obtenerCache considera vigente (para siempre) un payload sin marca de tiempo numérica y devuelve undefined en lugar de null.
  test('una entrada de caché con estructura inválida se trata como inexistente', async () => {
    const contenidos = ['{"data":["sin marca de tiempo"]}', '{"timestamp":"ayer","data":[1]}', '"texto"', '[1,2]', '42', 'null'];
    const aceptados = [];
    for (const [indice, crudo] of contenidos.entries()) {
      await AsyncStorage.setItem(`${CLAVES.cache}estructura_${indice}`, crudo);
      const valor = await LocalStorageManager.obtenerCache(`estructura_${indice}`, UNA_HORA);
      if (valor !== null) aceptados.push(`${crudo} → ${JSON.stringify(valor) ?? 'undefined'}`);
    }
    expect(aceptados).toEqual([]);
  });
});

describe('JSON corrupto en cada clave', () => {
  test('caché corrupta: ambas lecturas devuelven null sin lanzar', async () => {
    await AsyncStorage.setItem(`${CLAVES.cache}calendario`, '{roto');
    await expect(LocalStorageManager.obtenerCache('calendario')).resolves.toBeNull();
    await expect(LocalStorageManager.obtenerUltimaCopiaCache('calendario')).resolves.toBeNull();
  });

  test.each([
    ['colección de pilotos', CLAVES.pilotos, '{roto'],
    ['colección de pilotos que no es lista', CLAVES.pilotos, '{"idPiloto":81}'],
    ['favorito heredado', CLAVES.pilotoLegado, '[81,'],
  ])('%s corrupto: no inventa favoritos, no conserva un éxito falso y no destruye el valor', async (_nombre, clave, crudo) => {
    await AsyncStorage.setItem(clave, crudo);
    expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
    expect(await LocalStorageManager.obtenerDetalleFavoritos()).toEqual([]);
    expect(await LocalStorageManager.esFavorito(81)).toBe(false);
    expect(await AsyncStorage.getItem(clave)).toBe(crudo);

    // Si informa éxito, el favorito debe poder leerse; si informa fallo, el valor queda intacto.
    const guardado = await LocalStorageManager.guardarFavorito(81);
    expect(guardado ? await LocalStorageManager.obtenerFavoritos() : await AsyncStorage.getItem(clave))
      .toEqual(guardado ? [81] : crudo);
  });

  // Regresión IU-02: con JSON corrupto o forma inválida, obtenerEscuderiasFavoritas respondía ['mercedes','mclaren'] como si el usuario las hubiera elegido; ahora rechaza.
  test('escuderías con JSON corrupto o con forma inválida no se reemplazan por favoritas inventadas', async () => {
    const inventadas = [];
    for (const crudo of ['{roto', '{"a":1}', '[1]']) {
      await AsyncStorage.setItem(CLAVES.escuderias, crudo);
      const resultado = await LocalStorageManager.obtenerEscuderiasFavoritas().catch(error => error);
      if (Array.isArray(resultado) && resultado.length) inventadas.push(`${crudo} → ${JSON.stringify(resultado)}`);
    }
    expect(inventadas).toEqual([]);
  });

  test.each([
    ['ajustes', CLAVES.ajustes, 'guardarAjustes', { unidades: 'mph' }, { ...AJUSTES_PREDETERMINADOS, unidades: 'mph' }],
    ['alertas', CLAVES.alertas, 'guardarAlertas', { radio: false }, { ...ALERTAS_PREDETERMINADAS, radio: false }],
  ])('%s con JSON corrupto: el guardado parcial persiste un objeto completo y válido', async (_nombre, clave, metodo, cambio, esperado) => {
    await AsyncStorage.setItem(clave, '{roto');
    expect(await LocalStorageManager[metodo](cambio)).toEqual(esperado);
    expect(await leerJSON(clave)).toEqual(esperado);
  });
});

describe('Rechazos de getItem y setItem en los métodos públicos', () => {
  const LECTURAS = [
    ['obtenerCache', ['calendario'], null],
    ['obtenerUltimaCopiaCache', ['calendario'], null],
    ['obtenerFavoritos', [], []],
    ['obtenerDetalleFavoritos', [], []],
    ['esFavorito', [81], false],
    ['guardarFavorito', [81], false],
    ['eliminarFavorito', [81], false],
    ['obtenerAjustes', [], AJUSTES_PREDETERMINADOS],
    ['obtenerAlertas', [], ALERTAS_PREDETERMINADAS],
  ];
  test.each(LECTURAS)('getItem rechazado en %s(%j): no lanza, no escribe y devuelve %j', async (metodo, args, esperado) => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Lectura bloqueada'));
    const escritura = jest.spyOn(AsyncStorage, 'setItem');
    await expect(LocalStorageManager[metodo](...args)).resolves.toEqual(esperado);
    expect(escritura).not.toHaveBeenCalled();
  });

  test.each([
    ['guardarCache', ['calendario', ['GP']], undefined, `${CLAVES.cache}calendario`, null],
    ['guardarFavorito', [16], false, CLAVES.pilotos, '[{"idPiloto":81}]'],
    ['eliminarFavorito', [81], false, CLAVES.pilotos, '[{"idPiloto":81}]'],
    ['guardarAjustes', [{ modoExperto: true }], null, CLAVES.ajustes, JSON.stringify({ ...AJUSTES_PREDETERMINADOS, unidades: 'mph' })],
    ['guardarAlertas', [{ radio: false }], null, CLAVES.alertas, JSON.stringify(ALERTAS_PREDETERMINADAS)],
  ])('setItem rechazado en %s: informa el fallo y conserva lo persistido', async (metodo, args, esperado, clave, previo) => {
    if (previo !== null) await AsyncStorage.setItem(clave, previo);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Escritura bloqueada'));
    await expect(LocalStorageManager[metodo](...args)).resolves.toEqual(esperado);
    expect(await AsyncStorage.getItem(clave)).toBe(previo);
  });

  // Regresión IU-02: el catch de obtenerEscuderiasFavoritas devolvía ['mercedes','mclaren'] cuando la lectura fallaba; ahora rechaza con un mensaje en español.
  test('si falla la lectura, obtenerEscuderiasFavoritas no inventa Mercedes ni McLaren', async () => {
    await AsyncStorage.setItem(CLAVES.escuderias, '["ferrari"]');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Lectura bloqueada'));
    const resultado = await LocalStorageManager.obtenerEscuderiasFavoritas().catch(error => error);
    // Se acepta informar el fallo (rechazo) o devolver lo realmente guardado; nunca favoritas ficticias.
    expect(Array.isArray(resultado) ? resultado : ['ferrari']).toEqual(['ferrari']);
  });

  // Regresión IU-08: toggleEscuderiaFavorita devolvía [] aunque lo guardado siguiera siendo ['ferrari']; ahora rechaza si falla la lectura y devuelve la lista guardada si falla la escritura.
  test.each(['getItem', 'setItem'])('si falla %s, toggleEscuderiaFavorita no informa una lista vacía distinta de la persistida', async operacion => {
    await AsyncStorage.setItem(CLAVES.escuderias, '["ferrari"]');
    jest.spyOn(AsyncStorage, operacion).mockRejectedValueOnce(new Error('Almacenamiento no disponible'));
    const resultado = await LocalStorageManager.toggleEscuderiaFavorita('mclaren').catch(error => error);
    const persistido = await leerJSON(CLAVES.escuderias);
    expect(persistido).toEqual(['ferrari']);
    // O se rechaza la promesa (fallo explícito) o se devuelve exactamente el estado persistido.
    expect(Array.isArray(resultado) ? resultado : persistido).toEqual(persistido);
  });

  // Regresión IU-03: guardarAjustes/guardarAlertas usaban los valores predeterminados cuando la lectura fallaba y sobrescribían las preferencias reales; ahora no escriben y devuelven null.
  test.each([
    ['guardarAjustes', CLAVES.ajustes, { modoExperto: true, evitarSpoilers: true, unidades: 'mph', horaChilenaActivada: false }, { unidades: 'km/h' }],
    ['guardarAlertas', CLAVES.alertas, { boxes: false, radio: false, safetyCar: false, leaderChange: true }, { radio: true }],
  ])('si falla la lectura, %s no sobrescribe las preferencias guardadas con valores predeterminados', async (metodo, clave, guardado, cambio) => {
    await AsyncStorage.setItem(clave, JSON.stringify(guardado));
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Lectura bloqueada'));
    await LocalStorageManager[metodo](cambio).catch(() => null);
    const persistido = await leerJSON(clave);
    // Solo es aceptable conservar lo guardado o aplicar el cambio sobre lo guardado.
    expect([guardado, { ...guardado, ...cambio }]).toContainEqual(persistido);
  });
});

describe('Valores predeterminados y combinación parcial', () => {
  // DEFECTO: obtenerAjustes/obtenerAlertas devuelven el JSON guardado tal cual, sin completar claves ausentes ni validar la forma.
  test.each([
    ['obtenerAjustes', CLAVES.ajustes, AJUSTES_PREDETERMINADOS, '{"unidades":"mph"}', { unidades: 'mph' }],
    ['obtenerAlertas', CLAVES.alertas, ALERTAS_PREDETERMINADAS, '{"radio":false}', { radio: false }],
  ])('%s completa con valores predeterminados un objeto parcial o con forma inválida', async (metodo, clave, predeterminados, parcial, cambioParcial) => {
    const casos = [[parcial, { ...predeterminados, ...cambioParcial }], ['null', predeterminados], ['[]', predeterminados], ['"texto"', predeterminados], ['42', predeterminados]];
    const incorrectos = [];
    for (const [crudo, esperado] of casos) {
      await AsyncStorage.setItem(clave, crudo);
      const obtenido = await LocalStorageManager[metodo]();
      if (!isDeepStrictEqual(obtenido, esperado)) incorrectos.push(`${crudo} → ${JSON.stringify(obtenido)}`);
    }
    expect(incorrectos).toEqual([]);
  });

  test('guardarAlertas conserva claves adicionales usadas por Favoritos (leaderChange)', async () => {
    const resultado = await LocalStorageManager.guardarAlertas({ ...ALERTAS_PREDETERMINADAS, leaderChange: true });
    expect(resultado).toEqual({ ...ALERTAS_PREDETERMINADAS, leaderChange: true });
    expect(await LocalStorageManager.guardarAlertas({ radio: false })).toEqual({ ...ALERTAS_PREDETERMINADAS, radio: false, leaderChange: true });
  });
});

describe('Concurrencia', () => {
  test('toggleEscuderiaFavorita concurrentes se serializan y cada respuesta refleja su turno', async () => {
    await AsyncStorage.setItem(CLAVES.escuderias, '[]');
    const resultados = await Promise.all(['ferrari', 'williams', 'ferrari', ' McLaren '].map(id => LocalStorageManager.toggleEscuderiaFavorita(id)));
    expect(resultados).toEqual([['ferrari'], ['ferrari', 'williams'], ['williams'], ['williams', 'mclaren']]);
    expect(await leerJSON(CLAVES.escuderias)).toEqual(['williams', 'mclaren']);
  });

  test('un fallo intermedio de escritura no bloquea ni corrompe los cambios posteriores de la cola', async () => {
    await AsyncStorage.setItem(CLAVES.escuderias, '[]');
    const escritura = jest.spyOn(AsyncStorage, 'setItem');
    const original = escritura.getMockImplementation();
    escritura.mockImplementationOnce(original).mockRejectedValueOnce(new Error('Escritura bloqueada'));
    const [, , tercero] = await Promise.all(['ferrari', 'williams', 'mclaren'].map(id => LocalStorageManager.toggleEscuderiaFavorita(id)));
    expect(await leerJSON(CLAVES.escuderias)).toEqual(['ferrari', 'mclaren']);
    expect(tercero).toEqual(['ferrari', 'mclaren']);
  });

  test('guardarFavorito y eliminarFavorito concurrentes conservan todas las selecciones', async () => {
    const resultados = await Promise.all([
      LocalStorageManager.guardarFavorito(1), LocalStorageManager.guardarFavorito(4),
      LocalStorageManager.guardarFavorito(16), LocalStorageManager.eliminarFavorito(4),
    ]);
    expect(resultados).toEqual([true, true, true, true]);
    expect(await LocalStorageManager.obtenerFavoritos()).toEqual([16, 1]);
  });

  // DEFECTO: guardarAjustes/guardarAlertas no pasan por la cola de preferencias; dos cambios parciales simultáneos leen el mismo estado y el último pisa al primero.
  test.each([
    ['guardarAjustes', CLAVES.ajustes, { modoExperto: true }, { evitarSpoilers: true }],
    ['guardarAlertas', CLAVES.alertas, { boxes: false }, { radio: false }],
  ])('%s concurrentes con cambios parciales conservan ambos cambios', async (metodo, clave, primero, segundo) => {
    await Promise.all([LocalStorageManager[metodo](primero), LocalStorageManager[metodo](segundo)]);
    expect(await leerJSON(clave)).toEqual(expect.objectContaining({ ...primero, ...segundo }));
  });
});

describe('Suscripción a favoritos', () => {
  test('notifica solo escrituras efectivas y deja de notificar al cancelar la suscripción', async () => {
    await AsyncStorage.setItem(CLAVES.escuderias, '[]');
    const oyente = jest.fn();
    const cancelar = LocalStorageManager.suscribirFavoritos(oyente);
    await LocalStorageManager.guardarFavorito(81);
    expect(oyente).toHaveBeenCalledTimes(1);
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Escritura bloqueada'));
    await LocalStorageManager.guardarFavorito(82);
    expect(oyente).toHaveBeenCalledTimes(1);
    await LocalStorageManager.eliminarFavorito(999);
    expect(oyente).toHaveBeenCalledTimes(1);
    await LocalStorageManager.toggleEscuderiaFavorita('ferrari');
    expect(oyente).toHaveBeenCalledTimes(2);
    cancelar();
    await LocalStorageManager.toggleEscuderiaFavorita('ferrari');
    expect(oyente).toHaveBeenCalledTimes(2);
  });
});
