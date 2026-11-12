import React from 'react';
import { AccessibilityInfo, Alert, Animated, BackHandler, StyleSheet } from 'react-native';
import { render, screen, fireEvent, act, waitFor, isHiddenFromAccessibility } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BuscarCarreraScreen from '../../src/screens/BuscarCarreraScreen';
import AppNavigator from '../../src/navigation/AppNavigator';
import OpenF1Client from '../../src/services/OpenF1Client';
import F1DataService from '../../src/services/F1DataService';
import {
  BASE_OPENF1, MEETINGS_2024, MEETINGS_2026, sessionOpenF1, lapOpenF1, locationLoop, openF1Server, jsonResponse, httpError,
} from '../fixtures/openf1';
import {
  AHORA as AHORA_ENTORNO, CLAVES, crearServidor, diferido, navegacionFalsa, reiniciarServicios, animacionInmediata,
} from '../integridad-usabilidad/helpers/entorno';
import {
  controlesInteractivos, problemasDeControles, objetivosPequenos, textosPequenos, seAnuncia, hostPadre,
} from '../integridad-usabilidad/helpers/arbolAccesible';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
// Íconos como vistas sin texto: un botón que solo tiene un ícono no obtiene nombre de su contenido.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Ionicons: ({ name, size = 12, style }) => <View testID={`icon-${name}`} style={[{ width: size, height: size }, style]} /> };
});
// BackHandler de Android con `mockPressBack` para simular el botón Atrás.
jest.mock('react-native/Libraries/Utilities/BackHandler', () => require('react-native/Libraries/Utilities/__mocks__/BackHandler'));

const AHORA = Date.parse('2026-11-12T12:00:00Z');
const fetchOriginal = global.fetch;
const RUTAS = { '/meetings?year=2026': MEETINGS_2026, '/meetings?year=2024': MEETINGS_2024 };

const AnimatedMock = jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default;

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(AHORA);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Con Date.now fijo las animaciones reales nunca avanzan: aquí terminan en el acto.
  ['timing', 'spring', 'loop'].forEach(tipo => jest.spyOn(Animated, tipo).mockImplementation(AnimatedMock[tipo]));
  reiniciarServicios({ OpenF1Client });
  global.fetch = openF1Server(RUTAS);
});
afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = fetchOriginal;
});

function abrir() {
  const navigation = navegacionFalsa();
  render(<BuscarCarreraScreen navigation={navigation} />);
  return navigation;
}
const titulosVisibles = () => screen.queryAllByText(/Grand Prix$/).map(nodo => nodo.props.children);
const temporada = anio => screen.getByRole('button', { name: `Temporada ${anio}` });
// Con el detalle abierto el listado queda oculto a los lectores de pantalla: `oculta` permite leerlo igual
// (getByRole no resuelve el nombre de un elemento oculto, por eso se busca por su etiqueta).
const fila = (nombre, { oculta = false } = {}) => (oculta
  ? screen.getByLabelText(new RegExp(`^${nombre}, `), { includeHiddenElements: true })
  : screen.getByRole('button', { name: new RegExp(`^${nombre}, `) }));
const consultas = () => global.fetch.mock.calls.map(([url]) => url.slice(BASE_OPENF1.length));
const botonAR = () => screen.queryByRole('button', { name: 'Ver en realidad aumentada' });
const cerrarDetalle = () => fireEvent.press(screen.getByTestId('detalle-carrera-cerrar'));
const estiloHoja = () => StyleSheet.flatten(screen.getByTestId('detalle-carrera-hoja').props.style);
const desplazamientoHoja = () => Object.assign({}, ...estiloHoja().transform).translateY;

test('carga los Grandes Premios de la temporada actual por defecto, ordenados por fecha', async () => {
  abrir();
  expect(screen.getByLabelText('Cargando carreras de 2026')).toBeTruthy();
  expect(await screen.findByText('São Paulo Grand Prix')).toBeTruthy();

  expect(consultas()).toEqual(['/meetings?year=2026']);
  expect(titulosVisibles()).toEqual(['Saudi Arabian Grand Prix', 'São Paulo Grand Prix', 'Las Vegas Grand Prix', 'Abu Dhabi Grand Prix']);
  expect(screen.getByText('Interlagos · Brazil')).toBeTruthy();
  expect(screen.getByText('Cancelado')).toBeTruthy();
  expect([2023, 2024, 2025, 2026].map(anio => temporada(anio).props.accessibilityState.selected)).toEqual([false, false, false, true]);
  expect(screen.queryByLabelText('Cargando carreras de 2026')).toBeNull();
});

test('cambiar de temporada vuelve a consultar OpenF1 y reemplaza la lista', async () => {
  abrir();
  await screen.findByText('São Paulo Grand Prix');
  fireEvent.press(temporada(2024));

  expect(await screen.findByText('Monaco Grand Prix')).toBeTruthy();
  expect(consultas()).toEqual(['/meetings?year=2026', '/meetings?year=2024']);
  expect(titulosVisibles()).toEqual(['Bahrain Grand Prix', 'Monaco Grand Prix']);
  expect(temporada(2024).props.accessibilityState.selected).toBe(true);
  expect(temporada(2026).props.accessibilityState.selected).toBe(false);
});

test('una respuesta tardía de otra temporada no reemplaza la temporada elegida', async () => {
  const lenta = diferido();
  global.fetch = openF1Server({ ...RUTAS, '/meetings?year=2026': () => lenta.promesa });
  abrir();
  fireEvent.press(temporada(2024));
  await screen.findByText('Monaco Grand Prix');
  await act(async () => { lenta.resolver(jsonResponse(MEETINGS_2026)); });
  expect(titulosVisibles()).toEqual(['Bahrain Grand Prix', 'Monaco Grand Prix']);
});

test('la búsqueda filtra por nombre, país, localidad o circuito sin distinguir tildes ni mayúsculas', async () => {
  abrir();
  await screen.findByText('São Paulo Grand Prix');
  const buscador = screen.getByLabelText('Buscar carrera');

  fireEvent.changeText(buscador, 'sao paulo');
  expect(titulosVisibles()).toEqual(['São Paulo Grand Prix']);
  fireEvent.changeText(buscador, 'YAS MARINA');
  expect(titulosVisibles()).toEqual(['Abu Dhabi Grand Prix']);
  fireEvent.changeText(buscador, 'united');
  expect(titulosVisibles()).toEqual(['Las Vegas Grand Prix', 'Abu Dhabi Grand Prix']);
  fireEvent.changeText(buscador, 'jeddah');
  expect(titulosVisibles()).toEqual(['Saudi Arabian Grand Prix']);

  fireEvent.press(screen.getByRole('button', { name: 'Borrar búsqueda' }));
  expect(titulosVisibles()).toHaveLength(4);
  expect(consultas()).toEqual(['/meetings?year=2026']);
});

test('sin coincidencias, o sin Grandes Premios en la temporada (HTTP 404), muestra el estado vacío', async () => {
  abrir();
  await screen.findByText('São Paulo Grand Prix');
  fireEvent.changeText(screen.getByLabelText('Buscar carrera'), 'zzz');
  expect(screen.getByText('No se encontraron carreras')).toBeTruthy();
  expect(screen.getByText('Prueba con otro nombre, país, ciudad o circuito.')).toBeTruthy();
  expect(titulosVisibles()).toEqual([]);

  fireEvent.changeText(screen.getByLabelText('Buscar carrera'), '');
  fireEvent.press(temporada(2025));
  expect(await screen.findByText('OpenF1 no tiene Grandes Premios registrados para 2025.')).toBeTruthy();
  expect(screen.getByText('No se encontraron carreras')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('un error se anuncia con rol alert y "Reintentar" recupera la lista', async () => {
  const estado = { fallando: true };
  global.fetch = jest.fn(async () => (estado.fallando ? httpError(503) : jsonResponse(MEETINGS_2026)));
  abrir();

  const alerta = await screen.findByText('No se pudieron cargar las carreras de 2026 desde OpenF1.');
  expect(alerta.props.accessibilityRole).toBe('alert');
  expect(seAnuncia(alerta)).toBe(true);
  expect(titulosVisibles()).toEqual([]);

  estado.fallando = false;
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('São Paulo Grand Prix')).toBeTruthy();
  expect(screen.queryByText('No se pudieron cargar las carreras de 2026 desde OpenF1.')).toBeNull();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('seleccionar una carrera abre su detalle en una hoja y "Ver en realidad aumentada" navega con el meeting', async () => {
  const navigation = abrir();
  await screen.findByText('São Paulo Grand Prix');
  expect(botonAR()).toBeNull();
  expect(screen.queryByTestId('detalle-carrera')).toBeNull();

  fireEvent.press(fila('São Paulo Grand Prix'));
  // La hoja sube desde abajo con un resorte hasta quedar abierta.
  expect(Animated.spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  expect(desplazamientoHoja()).toBe(0);
  expect(screen.getByRole('header', { name: 'São Paulo Grand Prix' })).toBeTruthy();
  expect(fila('São Paulo Grand Prix', { oculta: true }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText('FORMULA 1 MSC CRUISES GRANDE PRÊMIO DE SÃO PAULO 2026')).toBeTruthy();
  expect(screen.getByText('Circuito: Interlagos')).toBeTruthy();
  expect(screen.getByText('Lugar: São Paulo, Brazil')).toBeTruthy();
  // 15:30 UTC del 6 de noviembre corresponde a las 12:30 en Santiago (UTC−3 en horario de verano).
  expect(screen.getByText('Inicio: Viernes 2026-11-06, 12:30 (hora de Chile)')).toBeTruthy();
  expect(screen.queryByText(/Aún no se disputa|fue cancelado/)).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Ver en realidad aumentada' }));
  expect(navigation.navigate).toHaveBeenCalledWith('RealidadAumentada', {
    meeting: expect.objectContaining({ meeting_key: 1299, meeting_name: 'São Paulo Grand Prix' }),
  });
});

test('la hoja es modal: oculta el listado a los lectores de pantalla y ofrece dos formas de cerrarla', async () => {
  abrir();
  await screen.findByText('São Paulo Grand Prix');
  fireEvent.press(fila('São Paulo Grand Prix'));

  expect(isHiddenFromAccessibility(fila('São Paulo Grand Prix', { oculta: true }))).toBe(true);
  expect(screen.queryByRole('button', { name: 'Volver' })).toBeNull();
  const cerrar = screen.getAllByRole('button', { name: 'Cerrar detalle' });
  expect(cerrar.map(nodo => nodo.props.testID).sort()).toEqual(['detalle-carrera-cerrar', 'detalle-carrera-fondo']);

  // Botón de cerrar: la hoja baja por el mismo camino y al terminar se descarta la selección.
  cerrarDetalle();
  expect(Animated.spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: expect.any(Number) }));
  expect(Animated.spring.mock.calls.at(-1)[1].toValue).toBeGreaterThan(0);
  expect(botonAR()).toBeNull();
  expect(screen.queryByTestId('detalle-carrera')).toBeNull();
  expect(fila('São Paulo Grand Prix').props.accessibilityState.selected).toBe(false);

  // El fondo atenuado también la cierra.
  fireEvent.press(fila('Las Vegas Grand Prix'));
  expect(botonAR()).toBeTruthy();
  fireEvent.press(screen.getByTestId('detalle-carrera-fondo'));
  expect(botonAR()).toBeNull();
  expect(fila('Las Vegas Grand Prix').props.accessibilityState.selected).toBe(false);
  expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
});

test('con otra pantalla encima la hoja no consume el botón Atrás y, al recuperar el foco, vuelve a cerrarla', async () => {
  BackHandler.exitApp.mockClear();
  const navigation = abrir();
  await screen.findByText('São Paulo Grand Prix');
  fireEvent.press(fila('São Paulo Grand Prix'));
  fireEvent.press(screen.getByRole('button', { name: 'Ver en realidad aumentada' }));

  // La pila deja esta pantalla montada debajo: Atrás debe llegar a la pantalla de encima.
  act(() => { navigation.emitir('blur'); });
  act(() => { BackHandler.mockPressBack(); });
  expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
  expect(botonAR()).toBeTruthy();

  // De vuelta, el detalle sigue abierto y Atrás lo cierra sin salir de la búsqueda.
  act(() => { navigation.emitir('focus'); });
  act(() => { BackHandler.mockPressBack(); });
  expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
  expect(botonAR()).toBeNull();
  expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
});

test('el detalle advierte cuando un Gran Premio aún no se disputa o fue cancelado', async () => {
  abrir();
  await screen.findByText('Las Vegas Grand Prix');
  fireEvent.press(fila('Las Vegas Grand Prix'));
  expect(screen.getByText('Aún no se disputa: el trazado real estará disponible cuando OpenF1 registre vueltas.')).toBeTruthy();
  cerrarDetalle();
  fireEvent.press(fila('Saudi Arabian Grand Prix'));
  expect(screen.getByText('Este Gran Premio fue cancelado: OpenF1 no tiene datos de pista para mostrar.')).toBeTruthy();
  expect(screen.queryByText(/Aún no se disputa/)).toBeNull();
  expect(fila('Las Vegas Grand Prix', { oculta: true }).props.accessibilityState.selected).toBe(false);
});

test('el selector de temporada desliza su indicador con un resorte y conserva el estado seleccionado', async () => {
  abrir();
  await screen.findByText('São Paulo Grand Prix');
  fireEvent.press(temporada(2024));
  expect(Animated.spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, useNativeDriver: false }));
  expect([2023, 2024, 2025, 2026].map(anio => temporada(anio).props.accessibilityState.selected)).toEqual([false, true, false, false]);
  await screen.findByText('Monaco Grand Prix');
});

test('mientras carga muestra filas de espera y luego los resultados aparecen escalonados', async () => {
  abrir();
  const espera = screen.getByLabelText('Cargando carreras de 2026');
  expect(espera.props.accessibilityRole).toBe('progressbar');
  expect(espera.props.accessibilityState).toEqual({ busy: true });
  expect(titulosVisibles()).toEqual([]);
  await screen.findByText('São Paulo Grand Prix');
  expect(screen.getByText('Temporada 2026 · 4 Grandes Premios')).toBeTruthy();
  const retrasos = Animated.timing.mock.calls.map(([, config]) => config.delay).filter(retraso => retraso != null);
  expect(retrasos).toEqual([0, 30, 60, 90]);
  // Cada fila entra desplazándose levemente hacia arriba.
  const envoltura = hostPadre(fila('Las Vegas Grand Prix'));
  expect(Object.assign({}, ...StyleSheet.flatten(envoltura.props.style).transform)).toEqual({ translateY: 0 });
});

test('con "Reducir movimiento" no hay deslizamientos: la hoja aparece con un fundido y las filas sin escalonar', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  abrir();
  await screen.findByText('São Paulo Grand Prix');
  expect(StyleSheet.flatten(hostPadre(fila('São Paulo Grand Prix')).props.style)?.transform).toBeUndefined();
  expect(Animated.timing.mock.calls.some(([, config]) => config.delay != null)).toBe(false);

  fireEvent.press(fila('São Paulo Grand Prix'));
  expect(botonAR()).toBeTruthy();
  expect(Animated.spring).not.toHaveBeenCalled();
  expect(desplazamientoHoja()).toBe(0);
  expect(estiloHoja().opacity).toBe(1);
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));

  cerrarDetalle();
  expect(Animated.timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  expect(Animated.spring).not.toHaveBeenCalled();
  expect(botonAR()).toBeNull();
});

describe('Accesibilidad', () => {
  test('título con rol header, "Volver" accesible y buscador con etiqueta', async () => {
    const navigation = abrir();
    await screen.findByText('São Paulo Grand Prix');
    expect(screen.getByRole('header', { name: 'Buscar carrera' })).toBeTruthy();
    expect(screen.getByLabelText('Buscar carrera').props.accessibilityLabel).toBe('Buscar carrera');
    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  // Mismos criterios que la suite de integridad y usabilidad (helpers/arbolAccesible).
  test.each([
    // Volver + 4 temporadas + filas + borrar búsqueda.
    ['lista con búsqueda escrita', 6, async () => {
      abrir();
      await screen.findByText('São Paulo Grand Prix');
      fireEvent.changeText(screen.getByLabelText('Buscar carrera'), 'grand');
    }],
    // Con la hoja abierta el fondo queda oculto: fondo atenuado, cerrar y botón AR.
    ['detalle abierto sobre la búsqueda', 3, async () => {
      abrir();
      await screen.findByText('São Paulo Grand Prix');
      fireEvent.changeText(screen.getByLabelText('Buscar carrera'), 'grand');
      fireEvent.press(fila('São Paulo Grand Prix'));
    }],
    // Volver + 4 temporadas + Reintentar.
    ['estado de error', 6, async () => {
      global.fetch = jest.fn(async () => httpError(500));
      abrir();
      await screen.findByText('No se pudieron cargar las carreras de 2026 desde OpenF1.');
    }],
  ])('%s: controles con rol y nombre, objetivos de 44 pt y textos de 12 px o más', async (_caso, minimoControles, preparar) => {
    await preparar();
    const raiz = screen.UNSAFE_root;
    // El barrido no está vacío.
    expect(controlesInteractivos(raiz).length).toBeGreaterThanOrEqual(minimoControles);
    expect(problemasDeControles(raiz)).toEqual([]);
    expect(objetivosPequenos(raiz)).toEqual([]);
    expect(textosPequenos(raiz)).toEqual([]);
  });
});

describe('Flujo completo con AppNavigator', () => {
  const VENTANA = 'date%3E=2024-03-02T15%3A05%3A20.099Z&date%3C=2024-03-02T15%3A06%3A56.395Z';

  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(CLAVES.escuderias, '[]');
    Date.now.mockReturnValue(AHORA_ENTORNO);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Animated, 'timing').mockImplementation(animacionInmediata());
    reiniciarServicios({ F1DataService, OpenF1Client });
    global.fetch = crearServidor({
      ...RUTAS,
      '/sessions?meeting_key=1229': [sessionOpenF1()],
      '/laps?session_key=9472&lap_number=2': [lapOpenF1()],
      [`/location?session_key=9472&driver_number=1&${VENTANA}`]: locationLoop(60),
    });
  });

  test('Más → Buscar carrera → Bahrain 2024 → realidad aumentada con el trazado real de OpenF1 → regreso', async () => {
    render(<AppNavigator />);
    await screen.findByText('GP de prueba');
    fireEvent.press(screen.getByLabelText(/^Más, tab/));
    fireEvent.press(await screen.findByText('Buscar carrera (OpenF1)'));

    await screen.findByText('São Paulo Grand Prix');
    fireEvent.press(temporada(2024));
    fireEvent.press(await screen.findByRole('button', { name: /^Bahrain Grand Prix, / }));
    fireEvent.press(screen.getByRole('button', { name: 'Ver en realidad aumentada' }));

    expect(await screen.findByText('Trazado real de OpenF1 (vuelta 2, auto #1). Animación y telemetría simuladas.')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'SIMULACIÓN AR — BAHRAIN GRAND PRIX' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'COLOCAR CIRCUITO' }));
    expect(screen.getByText('TRAZADO REAL')).toBeTruthy();
    expect(global.fetch.mock.calls.some(([url]) => url.endsWith(VENTANA))).toBe(true);

    fireEvent.press(screen.getByRole('button', { name: 'Cerrar simulación AR' }));
    await waitFor(() => expect(screen.queryByText('TRAZADO REAL')).toBeNull());
    // De vuelta, el detalle sigue abierto: se cierra antes de salir de la búsqueda.
    fireEvent.press(screen.getByTestId('detalle-carrera-cerrar'));
    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(await screen.findByText('CENTRO DE RECURSOS')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Buscar carrera' })).toBeNull());
  });
});
