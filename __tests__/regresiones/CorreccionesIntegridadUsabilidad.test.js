// Regresiones de las correcciones IU-01 a IU-05, IU-08 e IU-14 (docs/pruebas/IntegridadUsabilidad.md).
// Cada prueba fija con aserciones positivas el comportamiento corregido.
import React from 'react';
import { Alert, Animated, Text } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import DriverCard from '../../src/components/DriverCard';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import FavoritosScreen from '../../src/screens/FavoritosScreen';
import PerfilScreen from '../../src/screens/PerfilScreen';
import PerfilPilotoScreen from '../../src/screens/PerfilPilotoScreen';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { mockStandingsFetch } from '../fixtures/jolpicaStandings';
import { CLAVES, navegacionFalsa } from '../integridad-usabilidad/helpers/entorno';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

const AVISO_ESCUDERIAS = 'No se pudieron leer tus escuderías favoritas guardadas.';
const originalFetch = global.fetch;
const lecturaOriginal = AsyncStorage.getItem.getMockImplementation();

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(CLAVES.escuderias, '[]');
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-02T12:00:00Z'));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing);
  global.fetch = mockStandingsFetch();
});
afterEach(() => {
  AsyncStorage.getItem.mockImplementation(lecturaOriginal);
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

const vaciarMicrotareas = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const leerJSON = async clave => JSON.parse(await AsyncStorage.getItem(clave));

// Hace fallar las lecturas de una clave mientras `estado.fallando` sea verdadero.
function fallarLecturas(clave) {
  const estado = { fallando: true };
  AsyncStorage.getItem.mockImplementation((solicitada, ...resto) => (estado.fallando && solicitada === clave
    ? Promise.reject(new Error('Lectura bloqueada')) : lecturaOriginal(solicitada, ...resto)));
  return estado;
}

async function abrirFavoritos() {
  const vista = render(<FavoritosScreen navigation={navegacionFalsa()} />);
  await waitFor(() => expect(vista.queryByText('Cargando favoritos...')).toBeNull());
  return vista;
}

async function abrirPerfil() {
  const vista = render(<PerfilScreen navigation={navegacionFalsa()} />);
  await vaciarMicrotareas();
  return vista;
}

describe('IU-01: ErrorBoundary', () => {
  let fallar;
  function Inestable() {
    if (fallar) throw new Error('Fallo de render simulado');
    return <Text>Contenido recuperado</Text>;
  }
  beforeEach(() => {
    fallar = true;
    // React informa por consola el error capturado por el límite.
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('muestra la interfaz alternativa con rol alert y "Volver a intentar" vuelve a montar el contenido', () => {
    render(<ErrorBoundary><Inestable /></ErrorBoundary>);
    expect(screen.getByText('Algo salió mal al mostrar esta pantalla.').props.accessibilityRole).toBe('alert');
    expect(screen.queryByText('Contenido recuperado')).toBeNull();

    fallar = false;
    fireEvent.press(screen.getByRole('button', { name: 'Volver a intentar' }));
    expect(screen.getByText('Contenido recuperado')).toBeTruthy();
    expect(screen.queryByText('Algo salió mal al mostrar esta pantalla.')).toBeNull();
  });

  test('registra el error y la pila de componentes para diagnóstico', () => {
    render(<ErrorBoundary><Inestable /></ErrorBoundary>);
    expect(console.warn).toHaveBeenCalledWith(
      '[ErrorBoundary] Error de render contenido:',
      expect.objectContaining({ message: 'Fallo de render simulado' }),
      expect.stringContaining('Inestable'),
    );
  });
});

describe('IU-02: aviso cuando no se pueden leer las escuderías favoritas', () => {
  test('Favoritos muestra el aviso con rol alert y no inventa escuderías', async () => {
    fallarLecturas(CLAVES.escuderias);
    await abrirFavoritos();
    expect(screen.getByText(AVISO_ESCUDERIAS).props.accessibilityRole).toBe('alert');
    expect(screen.queryByText(/^(Mercedes|McLaren)$/)).toBeNull();
  });

  test('Clasificación muestra el aviso con rol alert y mantiene visible la tabla', async () => {
    fallarLecturas(CLAVES.escuderias);
    render(<ClasificacionScreen navigation={navegacionFalsa()} />);
    expect((await screen.findByText(AVISO_ESCUDERIAS)).props.accessibilityRole).toBe('alert');
    expect(screen.getByText('A. PRUEBA')).toBeTruthy();
    expect(screen.getByText('125.5')).toBeTruthy();
  });
});

describe('IU-04: Perfil del piloto sin parámetros', () => {
  test('muestra "Piloto no disponible", Volver regresa y el favorito queda deshabilitado', async () => {
    const nav = navegacionFalsa();
    render(<PerfilPilotoScreen route={{}} navigation={nav} />);
    await vaciarMicrotareas();
    expect(screen.getByText('Piloto no disponible')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);

    const favorito = screen.getByRole('button', { name: 'Añadir piloto a favoritos' });
    expect(favorito.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(favorito);
    await vaciarMicrotareas();
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  });
});

describe('IU-05: nombres accesibles de interruptores y estrella de favorito', () => {
  test.each([
    ['Perfil', abrirPerfil, ['Modo Experto', 'Evitar Spoilers', 'Hora Local de Chile (CLT)']],
    ['Favoritos', abrirFavoritos, ['Mi piloto entra a boxes', 'Radio de mi piloto', 'Bandera roja o Safety Car', 'Cada cambio de líder']],
  ])('%s expone cada interruptor con rol switch y su nombre', async (_nombre, abrir, etiquetas) => {
    await abrir();
    expect(screen.getAllByRole('switch')).toHaveLength(etiquetas.length);
    etiquetas.forEach(etiqueta => expect(screen.getByRole('switch', { name: etiqueta })).toBeTruthy());
  });

  test('la estrella de DriverCard se encuentra por su nombre accesible en ambos estados', () => {
    const alternar = jest.fn();
    const piloto = { idPiloto: 81, nombre: 'Ana', apellido: 'Prueba', puntos: 10 };
    const vista = render(<DriverCard driver={piloto} position={1} onToggleFavorite={alternar} />);
    fireEvent.press(screen.getByRole('button', { name: 'Marcar piloto favorito Ana Prueba' }));
    expect(alternar).toHaveBeenCalledWith(piloto);

    vista.rerender(<DriverCard driver={{ ...piloto, esFavorito: true }} position={1} onToggleFavorite={alternar} />);
    expect(screen.getByRole('button', { name: 'Quitar piloto favorito Ana Prueba' })).toBeTruthy();
  });
});

describe('IU-03: un interruptor no pisa las preferencias guardadas si falló la carga', () => {
  test.each([
    ['Perfil', abrirPerfil, CLAVES.ajustes,
      { modoExperto: false, evitarSpoilers: true, unidades: 'mph', horaChilenaActivada: false },
      'Modo Experto', { modoExperto: true }],
    ['Favoritos', abrirFavoritos, CLAVES.alertas,
      { boxes: false, radio: false, safetyCar: true, leaderChange: true },
      'Bandera roja o Safety Car', { safetyCar: false }],
  ])('%s: tras fallar la lectura inicial, el cambio conserva las demás claves guardadas', async (_nombre, abrir, clave, guardado, etiqueta, cambio) => {
    await AsyncStorage.setItem(clave, JSON.stringify(guardado));
    const lectura = fallarLecturas(clave);
    await abrir();
    lectura.fallando = false;

    const interruptor = screen.getByRole('switch', { name: etiqueta });
    fireEvent(interruptor, 'valueChange', !interruptor.props.value);
    await vaciarMicrotareas();

    expect(await leerJSON(clave)).toEqual({ ...guardado, ...cambio });
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});

describe('IU-08: reparación de escuderías favoritas corruptas', () => {
  test('marcar una escudería reemplaza el valor corrupto por una lista válida y el aviso desaparece al recargar', async () => {
    await AsyncStorage.setItem(CLAVES.escuderias, '{roto');
    const clasificacion = render(<ClasificacionScreen navigation={navegacionFalsa()} />);
    await screen.findByText(AVISO_ESCUDERIAS);

    fireEvent.press(screen.getByText('CONSTRUCTORES'));
    fireEvent.press(screen.getByRole('button', { name: 'Marcar escudería favorita Equipo de prueba' }));
    await screen.findByRole('button', { name: 'Quitar escudería favorita Equipo de prueba' });
    expect(screen.queryByText(AVISO_ESCUDERIAS)).toBeNull();
    expect(await AsyncStorage.getItem(CLAVES.escuderias)).toBe('["equipo_prueba"]');
    expect(Alert.alert).not.toHaveBeenCalled();

    clasificacion.unmount();
    await abrirFavoritos();
    expect(screen.getByText('Equipo de prueba')).toBeTruthy();
    expect(screen.queryByText(AVISO_ESCUDERIAS)).toBeNull();
  });
});

describe('IU-14: fallos al guardar interruptores y escuderías', () => {
  test.each([
    ['Perfil', abrirPerfil, 'Modo Experto', 'No se pudo guardar el ajuste', async () => (await LocalStorageManager.obtenerAjustes()).modoExperto],
    ['Favoritos', abrirFavoritos, 'Mi piloto entra a boxes', 'No se pudo guardar la alerta', async () => (await LocalStorageManager.obtenerAlertas()).boxes],
  ])('%s: si falla guardar el interruptor, lo revierte y avisa con Alert', async (_nombre, abrir, etiqueta, titulo, leerPersistido) => {
    await abrir();
    const inicial = screen.getByRole('switch', { name: etiqueta }).props.value;
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Almacenamiento lleno'));
    fireEvent(screen.getByRole('switch', { name: etiqueta }), 'valueChange', !inicial);
    await vaciarMicrotareas();

    expect(Alert.alert).toHaveBeenCalledWith(titulo, expect.any(String));
    expect(screen.getByRole('switch', { name: etiqueta }).props.value).toBe(inicial);
    expect(await leerPersistido()).toBe(inicial);
  });

  test('Clasificación: si falla guardar una escudería avisa con Alert y no la marca', async () => {
    render(<ClasificacionScreen navigation={navegacionFalsa()} />);
    await screen.findByText('A. PRUEBA');
    fireEvent.press(screen.getByText('CONSTRUCTORES'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Almacenamiento lleno'));
    fireEvent.press(screen.getByRole('button', { name: 'Marcar escudería favorita Equipo de prueba' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo guardar la escudería favorita', expect.any(String)));
    await vaciarMicrotareas();

    expect(screen.getByRole('button', { name: 'Marcar escudería favorita Equipo de prueba' })).toBeTruthy();
    expect(await AsyncStorage.getItem(CLAVES.escuderias)).toBe('[]');
  });

  test.each([
    ['la escritura', 'setItem'],
    ['la lectura', 'getItem'],
  ])('Favoritos: si falla %s al quitar una escudería avisa con Alert y la conserva', async (_nombre, operacion) => {
    await AsyncStorage.setItem(CLAVES.escuderias, '["equipo_prueba"]');
    await abrirFavoritos();
    await screen.findByText('Equipo de prueba');
    jest.spyOn(AsyncStorage, operacion).mockRejectedValueOnce(new Error('Almacenamiento no disponible'));
    fireEvent.press(screen.getByRole('button', { name: 'Quitar escudería favorita Equipo de prueba' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo quitar la escudería', expect.any(String)));
    await vaciarMicrotareas();

    expect(screen.getByText('Equipo de prueba')).toBeTruthy();
    expect(await AsyncStorage.getItem(CLAVES.escuderias)).toBe('["equipo_prueba"]');
  });
});
