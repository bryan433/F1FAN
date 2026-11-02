
import AsyncStorage from '@react-native-async-storage/async-storage';
import LocalStorageManager from '../../src/storage/LocalStorageManager';

// Simulamos el almacenamiento, no LocalStorageManager
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('LocalStorageManager', () => {

    beforeEach(async () => {
        await AsyncStorage.clear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('guarda y recupera un piloto favorito', async () => {
        const resultado = await LocalStorageManager.guardarFavorito(1);

        expect(resultado).toBe(true);

        const favoritos = await LocalStorageManager.obtenerFavoritos();

        expect(favoritos).toEqual([1]);
    });


    test('agrega un piloto sin reemplazar al favorito anterior', async () => {
        // Guardamos al piloto 1
        await LocalStorageManager.guardarFavorito(1);

        // Agregamos también al piloto 4
        await LocalStorageManager.guardarFavorito(4);

        // Recuperamos los favoritos
        const favoritos = await LocalStorageManager.obtenerFavoritos();

        // Ambas selecciones deben conservarse
        expect(favoritos).toEqual([4, 1]);

        // Comprobamos cuál es el favorito actual
        expect(await LocalStorageManager.esFavorito(1)).toBe(true);
        expect(await LocalStorageManager.esFavorito(4)).toBe(true);
    });



    test('elimina el piloto favorito guardado', async () => {
        // Guardamos un piloto favorito
        await LocalStorageManager.guardarFavorito(1);

        // Eliminamos ese mismo piloto
        const resultado = await LocalStorageManager.eliminarFavorito(1);

        // La operación debe finalizar correctamente
        expect(resultado).toBe(true);

        // No debe quedar ningún favorito
        const favoritos = await LocalStorageManager.obtenerFavoritos();
        expect(favoritos).toEqual([]);

        // El piloto eliminado ya no debe ser favorito
        const esFavorito = await LocalStorageManager.esFavorito(1);
        expect(esFavorito).toBe(false);
    });


    test('no elimina un piloto diferente al favorito', async () => {
        // Guardamos al piloto 4 como favorito
        await LocalStorageManager.guardarFavorito(4);

        // Intentamos eliminar al piloto 1
        const resultado = await LocalStorageManager.eliminarFavorito(1);

        // La operación termina sin errores
        expect(resultado).toBe(true);

        // El piloto 4 debe seguir guardado
        const favoritos = await LocalStorageManager.obtenerFavoritos();
        expect(favoritos).toEqual([4]);

        // Comprobamos que sigue siendo favorito
        expect(await LocalStorageManager.esFavorito(4)).toBe(true);
    });


    test('la caché expira después de una hora', async () => {
        const unaHora = 3600000;

        // Simulamos que son las 10:00
        const tiempoInicial = 1000000;

        const reloj = jest.spyOn(Date, 'now')
        .mockReturnValue(tiempoInicial);

        // Guardamos datos en caché
        const calendario = ['Brasil', 'Las Vegas', 'Qatar'];

        await LocalStorageManager.guardarCache(
        'calendario',
        calendario
        );

        // Simulamos que han pasado 30 minutos
        reloj.mockReturnValue(tiempoInicial + 1800000);

        const datosValidos =
        await LocalStorageManager.obtenerCache(
            'calendario',
            unaHora
        );

        expect(datosValidos).toEqual(calendario);

        // Simulamos que ha pasado una hora y un milisegundo
        reloj.mockReturnValue(tiempoInicial + unaHora + 1);

        const datosExpirados =
        await LocalStorageManager.obtenerCache(
            'calendario',
            unaHora
        );

        expect(datosExpirados).toBeNull();

        // Restauramos el reloj original
        reloj.mockRestore();
    });


    test('recupera la última copia aunque la caché haya expirado', async () => {
        const tiempoInicial = 1000000;
        const unaHora = 3600000;

        const reloj = jest.spyOn(Date, 'now')
        .mockReturnValue(tiempoInicial);

        // Guardamos un calendario
        const calendario = ['Brasil', 'Las Vegas', 'Qatar'];

        await LocalStorageManager.guardarCache(
        'calendario',
        calendario
        );

        // Simulamos que han pasado dos horas
        reloj.mockReturnValue(tiempoInicial + 2 * unaHora);

        // La consulta normal debe rechazar los datos expirados
        const cacheNormal = await LocalStorageManager.obtenerCache(
        'calendario',
        unaHora
        );

        expect(cacheNormal).toBeNull();

        // La última copia debe seguir disponible
        const ultimaCopia =
        await LocalStorageManager.obtenerUltimaCopiaCache(
            'calendario'
        );

        expect(ultimaCopia).toEqual(calendario);

        // Restauramos el reloj
        reloj.mockRestore();
    });


    test('agrega y elimina escuderías favoritas', async () => {
        // Verificamos los valores predeterminados
        const iniciales =
        await LocalStorageManager.obtenerEscuderiasFavoritas();

        expect(iniciales).toEqual(['mercedes', 'mclaren']);

        // Quitamos Mercedes de los favoritos
        const sinMercedes =
        await LocalStorageManager.toggleEscuderiaFavorita('mercedes');

        expect(sinMercedes).toEqual(['mclaren']);

        // Agregamos Ferrari a los favoritos
        const conFerrari =
        await LocalStorageManager.toggleEscuderiaFavorita('ferrari');

        expect(conFerrari).toEqual(['mclaren', 'ferrari']);

        // Comprobamos que los cambios quedaron almacenados
        const guardadas =
        await LocalStorageManager.obtenerEscuderiasFavoritas();

        expect(guardadas).toEqual(['mclaren', 'ferrari']);
    });


    // ==========================================
    // PRUEBAS DE CACHÉ
    // ==========================================

    test('devuelve null si la caché no existe', async () => {
        const datos = await LocalStorageManager.obtenerCache('inexistente');

        expect(datos).toBeNull();
    });

    test('devuelve null si la caché contiene datos corruptos', async () => {
        const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});

        await AsyncStorage.setItem('@f1fan_cache_roto', 'JSON inválido');

        const datos = await LocalStorageManager.obtenerCache('roto');

        expect(datos).toBeNull();
        expect(aviso).toHaveBeenCalled();
    });

    test('mantiene la caché válida justo en el límite de expiración', async () => {
        const inicio = 1000000;
        const unaHora = 3600000;

        const reloj = jest.spyOn(Date, 'now').mockReturnValue(inicio);

        await LocalStorageManager.guardarCache('limite', { carrera: 'Brasil' });

        reloj.mockReturnValue(inicio + unaHora);

        expect(
            await LocalStorageManager.obtenerCache('limite', unaHora)
        ).toEqual({ carrera: 'Brasil' });

        reloj.mockReturnValue(inicio + unaHora + 1);

        expect(
            await LocalStorageManager.obtenerCache('limite', unaHora)
        ).toBeNull();
    });

    test('maneja errores al guardar caché sin interrumpir la aplicación', async () => {
        const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});

        jest.spyOn(AsyncStorage, 'setItem')
            .mockRejectedValueOnce(new Error('Error de almacenamiento'));

        await expect(
            LocalStorageManager.guardarCache('calendario', [])
        ).resolves.toBeUndefined();

        expect(aviso).toHaveBeenCalled();
    });


    // ==========================================
    // PRUEBAS DE PILOTOS FAVORITOS
    // ==========================================

    test('devuelve una lista vacía si no existe un piloto favorito', async () => {
        const favoritos = await LocalStorageManager.obtenerFavoritos();

        expect(favoritos).toEqual([]);
        expect(await LocalStorageManager.esFavorito(1)).toBe(false);
    });

    test('permite guardar identificadores de piloto como texto', async () => {
        await LocalStorageManager.guardarFavorito('LEC');

        expect(await LocalStorageManager.obtenerFavoritos()).toEqual(['LEC']);
        expect(await LocalStorageManager.esFavorito('LEC')).toBe(true);
    });

    test('maneja errores de almacenamiento de pilotos favoritos', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        const escritura = jest.spyOn(AsyncStorage, 'setItem');
        escritura.mockRejectedValueOnce(new Error('Error al guardar'));

        expect(await LocalStorageManager.guardarFavorito(1)).toBe(false);

        const lectura = jest.spyOn(AsyncStorage, 'getItem');

        lectura.mockRejectedValueOnce(new Error('Error al leer'));
        expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);

        lectura.mockRejectedValueOnce(new Error('Error al eliminar'));
        expect(await LocalStorageManager.eliminarFavorito(1)).toBe(false);

        lectura.mockRejectedValueOnce(new Error('Error al verificar'));
        expect(await LocalStorageManager.esFavorito(1)).toBe(false);
    });


    // ==========================================
    // PRUEBAS DE ESCUDERÍAS FAVORITAS
    // ==========================================

    test('recupera escuderías predeterminadas si los datos están corruptos', async () => {
        await AsyncStorage.setItem(
            '@f1fan_favorite_teams',
            'JSON inválido'
        );

        const equipos = await LocalStorageManager.obtenerEscuderiasFavoritas();

        expect(equipos).toEqual(['mercedes', 'mclaren']);
    });

    test('maneja errores al modificar escuderías favoritas', async () => {
        jest.spyOn(AsyncStorage, 'setItem')
            .mockRejectedValueOnce(new Error('Error al guardar equipos'));

        const resultado =
            await LocalStorageManager.toggleEscuderiaFavorita('ferrari');

        expect(resultado).toEqual([]);
    });


    // ==========================================
    // PRUEBAS DE AJUSTES
    // ==========================================

    test('devuelve los ajustes predeterminados', async () => {
        const ajustes = await LocalStorageManager.obtenerAjustes();

        expect(ajustes).toEqual({
            modoExperto: false,
            evitarSpoilers: false,
            unidades: 'km/h',
            horaChilenaActivada: true,
        });
    });

    test('actualiza ajustes sin eliminar los anteriores', async () => {
        const actualizados = await LocalStorageManager.guardarAjustes({
            evitarSpoilers: true,
            unidades: 'mph',
        });

        expect(actualizados).toEqual({
            modoExperto: false,
            evitarSpoilers: true,
            unidades: 'mph',
            horaChilenaActivada: true,
        });

        expect(await LocalStorageManager.obtenerAjustes()).toEqual(actualizados);
    });

    test('recupera ajustes predeterminados si los datos están corruptos', async () => {
        await AsyncStorage.setItem(
            '@f1fan_user_settings',
            'JSON inválido'
        );

        const ajustes = await LocalStorageManager.obtenerAjustes();

        expect(ajustes.modoExperto).toBe(false);
        expect(ajustes.unidades).toBe('km/h');
        expect(ajustes.horaChilenaActivada).toBe(true);
    });

    test('devuelve null si falla el almacenamiento de ajustes', async () => {
        jest.spyOn(AsyncStorage, 'setItem')
            .mockRejectedValueOnce(new Error('Error al guardar ajustes'));

        const resultado = await LocalStorageManager.guardarAjustes({
            modoExperto: true,
        });

        expect(resultado).toBeNull();
    });


    // ==========================================
    // PRUEBAS DE ALERTAS
    // ==========================================

    test('devuelve las alertas predeterminadas', async () => {
        const alertas = await LocalStorageManager.obtenerAlertas();

        expect(alertas).toEqual({
            boxes: true,
            radio: true,
            safetyCar: true,
        });
    });

    test('actualiza alertas conservando las demás preferencias', async () => {
        const resultado = await LocalStorageManager.guardarAlertas({
            radio: false,
        });

        expect(resultado).toEqual({
            boxes: true,
            radio: false,
            safetyCar: true,
        });

        expect(await LocalStorageManager.obtenerAlertas()).toEqual(resultado);
    });

    test('recupera alertas predeterminadas si los datos están corruptos', async () => {
        await AsyncStorage.setItem(
            '@f1fan_alerts_settings',
            'JSON inválido'
        );

        const alertas = await LocalStorageManager.obtenerAlertas();

        expect(alertas).toEqual({
            boxes: true,
            radio: true,
            safetyCar: true,
        });
    });

    test('devuelve null cuando falla el almacenamiento de alertas', async () => {
        jest.spyOn(AsyncStorage, 'setItem')
            .mockRejectedValueOnce(new Error('Error al guardar alertas'));

        const resultado = await LocalStorageManager.guardarAlertas({
            safetyCar: false,
        });

        expect(resultado).toBeNull();
    });



});
