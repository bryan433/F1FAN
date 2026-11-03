import fs from 'fs';
import path from 'path';
import React from 'react';
import { Alert, Animated } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from '../../src/navigation/AppNavigator';
import DetalleGPScreen from '../../src/screens/DetalleGPScreen';
import ComparadorScreen from '../../src/screens/ComparadorScreen';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import PerfilPilotoScreen from '../../src/screens/PerfilPilotoScreen';
import F1DataService from '../../src/services/F1DataService';
import OpenF1Client from '../../src/services/OpenF1Client';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { AHORA, CLAVES, crearServidor, navegacionFalsa, reiniciarServicios, animacionInmediata } from './helpers/entorno';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});
// Envoltorios que solo registran los parámetros recibidos y delegan en la pantalla real.
jest.mock('../../src/screens/DetalleGPScreen', () => {
  const React = require('react');
  const Real = jest.requireActual('../../src/screens/DetalleGPScreen').default;
  const parametros = jest.fn();
  const Envoltorio = props => { parametros(props.route?.params); return React.createElement(Real, props); };
  Envoltorio.parametros = parametros;
  return { __esModule: true, default: Envoltorio };
});
jest.mock('../../src/screens/ComparadorScreen', () => {
  const React = require('react');
  const Real = jest.requireActual('../../src/screens/ComparadorScreen').default;
  const parametros = jest.fn();
  const Envoltorio = props => { parametros(props.route?.params); return React.createElement(Real, props); };
  Envoltorio.parametros = parametros;
  return { __esModule: true, default: Envoltorio };
});

const RAIZ_SRC = path.resolve(__dirname, '../../src');
const leer = relativo => fs.readFileSync(path.join(RAIZ_SRC, relativo), 'utf8');
function archivosJs(directorio) {
  return fs.readdirSync(directorio, { withFileTypes: true }).flatMap(entrada => {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) return archivosJs(ruta);
    return entrada.name.endsWith('.js') ? [ruta] : [];
  });
}
const relativo = ruta => path.relative(RAIZ_SRC, ruta).split(path.sep).join('/');
const lineaDe = (fuente, indice) => fuente.slice(0, indice).split('\n').length;

function pantallas(fuente, navegador) {
  const patron = new RegExp(`<${navegador}\\.Screen\\s+name="([^"]+)"\\s+component=\\{(\\w+)\\}`, 'g');
  return [...fuente.matchAll(patron)].map(([, nombre, componente]) => ({ nombre, componente }));
}
function importaciones(fuente, directorioBase) {
  return Object.fromEntries([...fuente.matchAll(/import\s+(\w+)\s+from\s+'(\.{1,2}\/[^']+)'/g)]
    .map(([, identificador, origen]) => [identificador, path.resolve(directorioBase, origen)]));
}

const fuenteStack = leer('navigation/AppNavigator.js');
const fuenteTabs = leer('navigation/BottomTabNavigator.js');
const STACK = pantallas(fuenteStack, 'Stack');
const TABS = pantallas(fuenteTabs, 'Tab');
const NOMBRES_STACK = STACK.map(p => p.nombre);
const NOMBRES_TABS = TABS.map(p => p.nombre);
const REGISTRADAS = new Set([...NOMBRES_STACK, ...NOMBRES_TABS]);
const IMPORTS_STACK = importaciones(fuenteStack, path.join(RAIZ_SRC, 'navigation'));
const IMPORTS_TABS = importaciones(fuenteTabs, path.join(RAIZ_SRC, 'navigation'));
// Rutas del Stack cuyo componente es a su vez un navegador (MainTabs → BottomTabNavigator).
const NAVEGADORES_HIJOS = Object.fromEntries(STACK
  .filter(p => /navigation[\\/]BottomTabNavigator$/.test(IMPORTS_STACK[p.componente] ?? ''))
  .map(p => [p.nombre, NOMBRES_TABS]));

function destinos() {
  return archivosJs(RAIZ_SRC).flatMap(archivo => {
    const fuente = fs.readFileSync(archivo, 'utf8');
    const directos = [...fuente.matchAll(/navigation\.navigate\(\s*['"]([^'"]+)['"]\s*(?:,\s*\{\s*screen:\s*['"]([^'"]+)['"])?/g)]
      .map(m => ({ archivo: relativo(archivo), linea: lineaDe(fuente, m.index), destino: m[1], anidado: m[2] ?? null }));
    const menu = [...fuente.matchAll(/\broute:\s*['"]([^'"]+)['"]/g)]
      .map(m => ({ archivo: relativo(archivo), linea: lineaDe(fuente, m.index), destino: m[1], anidado: null, menu: true }));
    return [...directos, ...menu];
  });
}

describe('Integridad estática del registro de rutas', () => {
  test('los navegadores declaran rutas, sin nombres repetidos y con componentes importados existentes', () => {
    expect(NOMBRES_STACK).toEqual(expect.arrayContaining(['MainTabs']));
    expect(NOMBRES_TABS.length).toBeGreaterThan(0);
    const nombres = [...NOMBRES_STACK, ...NOMBRES_TABS];
    expect(nombres.filter((nombre, i) => nombres.indexOf(nombre) !== i)).toEqual([]);
    const sinArchivo = [...STACK.map(p => [p, IMPORTS_STACK]), ...TABS.map(p => [p, IMPORTS_TABS])]
      .filter(([p, imports]) => !imports[p.componente] || !fs.existsSync(`${imports[p.componente]}.js`))
      .map(([p]) => `${p.nombre} → ${p.componente}`);
    expect(sinArchivo).toEqual([]);
  });

  test('se detectan destinos de navegación en el código fuente (la extracción no está vacía)', () => {
    const lista = destinos();
    expect(lista.length).toBeGreaterThan(10);
    expect(lista.some(d => d.menu)).toBe(true);
    expect(lista.some(d => d.anidado)).toBe(true);
  });

  test('cada navigation.navigate y cada opción route del menú Más apuntan a una ruta registrada', () => {
    const inexistentes = destinos().filter(d => !REGISTRADAS.has(d.destino))
      .map(d => `${d.archivo}:${d.linea} → '${d.destino}'`);
    expect(inexistentes).toEqual([]);
  });

  test('cada destino anidado { screen } pertenece al navegador hijo de la ruta indicada', () => {
    const incorrectos = destinos().filter(d => d.anidado)
      .filter(d => !(NAVEGADORES_HIJOS[d.destino] ?? []).includes(d.anidado))
      .map(d => `${d.archivo}:${d.linea} → '${d.destino}' / '${d.anidado}'`);
    expect(incorrectos).toEqual([]);
  });

  test('las pantallas del Stack no navegan directamente a una pestaña sin pasar por MainTabs', () => {
    const archivosStack = new Set(STACK.filter(p => !NAVEGADORES_HIJOS[p.nombre])
      .map(p => relativo(`${IMPORTS_STACK[p.componente]}.js`)));
    const soloPestanas = new Set(NOMBRES_TABS.filter(nombre => !NOMBRES_STACK.includes(nombre)));
    const directos = destinos().filter(d => archivosStack.has(d.archivo) && !d.anidado && soloPestanas.has(d.destino))
      .map(d => `${d.archivo}:${d.linea} → '${d.destino}'`);
    expect(directos).toEqual([]);
  });
});

const fetchOriginal = global.fetch;
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(CLAVES.escuderias, '[]');
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(AHORA);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(animacionInmediata());
  reiniciarServicios({ F1DataService, OpenF1Client });
  global.fetch = crearServidor();
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = fetchOriginal; });

const pestana = nombre => screen.getByLabelText(new RegExp(`^${nombre}, tab`));
async function abrirApp() {
  render(<AppNavigator />);
  await screen.findByText('GP de prueba');
}

describe('Navegación real con AppNavigator', () => {
  test('la pestaña inicial es Inicio: muestra su contenido y figura como seleccionada', async () => {
    await abrirApp();
    expect(screen.getByText('Hola, Diego')).toBeTruthy();
    expect(pestana('Inicio').props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(NOMBRES_TABS.filter(n => n !== 'Inicio').map(n => pestana(n).props.accessibilityState?.selected)).toEqual(NOMBRES_TABS.slice(1).map(() => false));
  });

  test('cambiar de pestaña muestra cada pantalla registrada y actualiza la selección', async () => {
    await abrirApp();
    const contenido = { 'En Vivo': 'DEMOSTRACIÓN • MARINA BAY', Tablas: 'Clasificación', Calendario: 'Registro Histórico', 'Más': 'CENTRO DE RECURSOS', Inicio: 'Hola, Diego' };
    for (const [nombre, texto] of Object.entries(contenido)) {
      fireEvent.press(pestana(nombre));
      expect(await screen.findByText(texto)).toBeTruthy();
      expect(pestana(nombre).props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    }
    expect(Object.keys(contenido).sort()).toEqual([...NOMBRES_TABS].sort());
  });

  test('Más → Favoritos → Volver regresa a Más', async () => {
    await abrirApp();
    fireEvent.press(pestana('Más'));
    fireEvent.press(await screen.findByText('Favoritos'));
    await screen.findByText('CENTRO DE PREFERENCIAS');
    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(await screen.findByText('CENTRO DE RECURSOS')).toBeTruthy();
    expect(screen.queryByText('CENTRO DE PREFERENCIAS')).toBeNull();
  });

  test('Calendario → Detalle GP recibe el meeting seleccionado y Volver regresa al Calendario', async () => {
    await abrirApp();
    fireEvent.press(pestana('Calendario'));
    await screen.findByText('Registro Histórico');
    fireEvent.press(screen.getByText('GP de prueba'));
    expect(await screen.findByText('Temporada 2026 • Ronda 1')).toBeTruthy();
    expect(DetalleGPScreen.parametros).toHaveBeenLastCalledWith({
      meeting: expect.objectContaining({ idMeeting: 'jolpica:2026:1', season: '2026', round: '1', nombreOficial: 'GP de prueba' }),
    });
    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(await screen.findByText('Registro Histórico')).toBeTruthy();
    expect(screen.queryByText('Temporada 2026 • Ronda 1')).toBeNull();
  });

  test('Clasificación → Comparador conserva la temporada consultada y Volver regresa a Tablas', async () => {
    await abrirApp();
    fireEvent.press(pestana('Tablas'));
    await screen.findByText('A. PRUEBA');
    fireEvent.press(screen.getByText('Comparar'));
    expect(await screen.findByText('TEMPORADA 2026 • CARA A CARA')).toBeTruthy();
    expect(ComparadorScreen.parametros).toHaveBeenLastCalledWith({ season: '2026' });
    fireEvent.press(screen.getByLabelText('Volver'));
    expect(await screen.findByText('A. PRUEBA')).toBeTruthy();
    expect(screen.queryByText('Comparador Estadístico')).toBeNull();
  });

  test('Favoritos → + Añadir abre la pestaña Tablas dentro de MainTabs y retira Favoritos', async () => {
    await abrirApp();
    fireEvent.press(pestana('Más'));
    fireEvent.press(await screen.findByText('Favoritos'));
    await screen.findByText('CENTRO DE PREFERENCIAS');
    fireEvent.press(screen.getByLabelText('Añadir piloto favorito'));
    expect(await screen.findByText('A. PRUEBA')).toBeTruthy();
    expect(pestana('Tablas').props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(screen.queryByText('CENTRO DE PREFERENCIAS')).toBeNull();
  });

  const REGRESOS = [
    ['Detalle GP', 'Calendario', 'GP de prueba', 'Temporada 2026 • Ronda 1', { etiqueta: 'Volver' }, 'Registro Histórico'],
    ['Comparador', 'Tablas', 'Comparar', 'Comparador Estadístico', { etiqueta: 'Volver' }, 'A. PRUEBA'],
    ['Perfil del piloto', 'Tablas', 'A. PRUEBA', 'Perfil del Piloto', { icono: 'icon-arrow-back' }, 'Comparar'],
    ['Realidad aumentada', 'Más', 'Vista AR', 'Calibración AR', { etiqueta: 'Cerrar simulación AR' }, 'CENTRO DE RECURSOS'],
    ['Favoritos', 'Más', 'Favoritos', 'CENTRO DE PREFERENCIAS', { etiqueta: 'Volver' }, 'CENTRO DE RECURSOS'],
    ['Perfil', 'Más', 'Perfil', 'Perfil & Ajustes', { icono: 'icon-arrow-back' }, 'CENTRO DE RECURSOS'],
    ['Historial', 'Más', 'Histórico', 'Historial Multiplataforma (Web & Móvil)', { etiqueta: 'Volver' }, 'CENTRO DE RECURSOS'],
  ];
  test.each(REGRESOS)('el control de regreso de %s vuelve a la pantalla de origen', async (_nombre, tab, disparador, destino, control, origen) => {
    await abrirApp();
    fireEvent.press(pestana(tab));
    fireEvent.press(await screen.findByText(disparador));
    await screen.findByText(destino);
    fireEvent.press(control.etiqueta ? screen.getByLabelText(control.etiqueta) : screen.getByTestId(control.icono));
    await waitFor(() => expect(screen.queryByText(destino)).toBeNull());
    expect(screen.getByText(origen)).toBeTruthy();
  });
});

describe('Parámetros ausentes o inválidos', () => {
  test('Detalle GP sin meeting muestra un estado neutro sin sesiones, demostraciones ni seguimiento activo', () => {
    const nav = navegacionFalsa();
    render(<DetalleGPScreen route={{}} navigation={nav} />);
    expect(screen.getByText('Información del Gran Premio no disponible')).toBeTruthy();
    expect(screen.queryByText(/SESIONES DEL FIN DE SEMANA|REALIDAD AUMENTADA|Temporada/)).toBeNull();
    expect(screen.getByRole('button', { name: /SEGUIR/ }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(nav.goBack).toHaveBeenCalledTimes(1);
  });

  // Regresión IU-04: PerfilPilotoScreen usaba driverId 63 por defecto, mostraba a George Russell y permitía guardarlo como favorito; ahora muestra "Piloto no disponible" con el favorito deshabilitado.
  test('Perfil del piloto sin parámetros no inventa un piloto ni permite guardarlo como favorito', async () => {
    render(<PerfilPilotoScreen route={{}} navigation={navegacionFalsa()} />);
    await act(async () => {});
    const identidadInventada = screen.queryAllByText(/RUSSELL|Russell|Mercedes|^63$/).map(n => n.props.children).flat().join(' | ');
    const boton = screen.queryByRole('button', { name: 'Añadir piloto a favoritos' });
    if (boton && !boton.props.accessibilityState?.disabled) {
      fireEvent.press(boton);
      await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    }
    expect({ identidadInventada, favoritosGuardados: await LocalStorageManager.obtenerFavoritos() })
      .toEqual({ identidadInventada: '', favoritosGuardados: [] });
  });

  test.each([
    ['Clasificación', ClasificacionScreen, /No se pudo consultar la clasificación: Temporada no válida\./],
    ['Comparador', ComparadorScreen, /No se pudo actualizar la comparación: Temporada no válida\./],
  ])('%s con una temporada inválida informa el error sin consultar la red ni mostrar participantes', async (_nombre, Pantalla, mensaje) => {
    render(<Pantalla navigation={navegacionFalsa()} route={{ params: { season: 'abc' } }} />);
    expect(await screen.findByText(mensaje)).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/PRUEBA|PTS/)).toBeNull();
  });
});
