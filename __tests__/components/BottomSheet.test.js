import React, { useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import BottomSheet from '../../src/components/BottomSheet';
import { project, rubberband } from '../../src/utils/motion';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { Ionicons: ({ name }) => <View testID={`icon-${name}`} /> };
});
// BackHandler de Android con `mockPressBack` para simular el botón Atrás.
jest.mock('react-native/Libraries/Utilities/BackHandler', () => require('react-native/Libraries/Utilities/__mocks__/BackHandler'));

const ALTO = 400;
const CERRADA = ALTO + 32; // posición cerrada: alto de la hoja más el margen de su sombra

/** Pantalla mínima: abre la hoja y la desmonta cuando avisa que terminó de cerrarse. */
function Pantalla({ onDismiss = () => {} }) {
  const [visible, setVisible] = useState(true);
  return (
    <BottomSheet visible={visible} title="Detalle" testID="hoja" onDismiss={() => { setVisible(false); onDismiss(); }}>
      <Text>Contenido</Text>
    </BottomSheet>
  );
}

const hoja = () => screen.getByTestId('hoja-hoja');
const desplazamiento = () => Object.assign({}, ...StyleSheet.flatten(hoja().props.style).transform).translateY;
const opacidadHoja = () => StyleSheet.flatten(hoja().props.style).opacity;
const opacidadFondo = () => StyleSheet.flatten(screen.getByTestId('hoja-fondo').props.style).opacity;
const avanzar = ms => act(() => { jest.advanceTimersByTime(ms); });
// Se llama a onLayout directamente: fireEvent descarta eventos de un nodo que rechaza toques
// (el PanResponder no reclama el toque inicial en reposo).
const medir = () => act(() => { hoja().props.onLayout({ nativeEvent: { layout: { height: ALTO } } }); });

function abrirHoja(props) {
  render(<Pantalla {...props} />);
  medir();
  avanzar(1500);
}

/**
 * Simula un dedo sobre la hoja usando los manejadores del PanResponder (historial de toques
 * como el que entrega React Native). `y` es la coordenada vertical en pantalla.
 */
function dedo() {
  const historia = { numberActiveTouches: 0, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: 0, touchBank: [] };
  let tiempo = 1;
  const evento = (y, { activo = true, dt = 16 } = {}) => {
    tiempo += dt;
    const previo = historia.touchBank[0];
    historia.touchBank[0] = {
      touchActive: activo,
      startPageX: 0,
      startPageY: previo ? previo.startPageY : y,
      startTimeStamp: previo ? previo.startTimeStamp : tiempo,
      currentPageX: 0,
      currentPageY: y,
      currentTimeStamp: tiempo,
      previousPageX: 0,
      previousPageY: previo ? previo.currentPageY : y,
      previousTimeStamp: previo ? previo.currentTimeStamp : tiempo,
    };
    historia.numberActiveTouches = activo ? 1 : 0;
    historia.mostRecentTimeStamp = tiempo;
    const toque = { pageX: 0, pageY: y };
    return { nativeEvent: { ...toque, touches: activo ? [toque] : [], changedTouches: [toque], timestamp: tiempo }, touchHistory: historia };
  };
  let ultimo = null;
  return {
    /** Apoya el dedo: devuelve si la hoja lo captura de inmediato (solo mientras se mueve). */
    apoyar: y => { ultimo = evento(y, { dt: 0 }); return hoja().props.onStartShouldSetResponderCapture(ultimo); },
    /** Mueve el dedo antes de que la hoja lo tome: devuelve si ya lo reconoce como arrastre. */
    tantear: (y, dt) => { ultimo = evento(y, { dt }); return hoja().props.onMoveShouldSetResponderCapture(ultimo); },
    tomar: () => act(() => { hoja().props.onResponderGrant(ultimo); }),
    arrastrar: (y, dt) => act(() => { ultimo = evento(y, { dt }); hoja().props.onResponderMove(ultimo); }),
    soltar: () => act(() => { hoja().props.onResponderRelease(evento(historia.touchBank[0].currentPageY, { activo: false, dt: 0 })); }),
  };
}

/** Toma la hoja en reposo con un arrastre que supera el umbral de 10 px. */
function tomarEnReposo(desde = 300) {
  const d = dedo();
  expect(d.apoyar(desde)).toBe(false);
  expect(d.tantear(desde + 6)).toBe(false);
  expect(d.tantear(desde + 14)).toBe(true);
  d.tomar();
  return d;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Animated, 'spring');
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('sube desde fuera de la pantalla con un resorte críticamente amortiguado, sin rebasar la posición abierta', () => {
  render(<Pantalla />);
  medir();
  let anterior = desplazamiento();
  expect(anterior).toBeGreaterThan(ALTO);
  expect(opacidadFondo()).toBe(0);
  for (let cuadro = 0; cuadro < 90; cuadro += 1) {
    avanzar(16);
    const actual = desplazamiento();
    expect(actual).toBeLessThanOrEqual(anterior);
    expect(actual).toBeGreaterThanOrEqual(0);
    anterior = actual;
  }
  expect(desplazamiento()).toBe(0);
  expect(opacidadFondo()).toBe(1);
  expect(screen.getByRole('header', { name: 'Detalle' })).toBeTruthy();
});

test.each([
  ['el botón de cerrar', () => fireEvent.press(screen.getByTestId('hoja-cerrar'))],
  ['el fondo atenuado', () => fireEvent.press(screen.getByTestId('hoja-fondo'))],
  ['el botón Atrás de Android', () => act(() => { BackHandler.mockPressBack(); })],
])('%s la baja por el mismo camino y avisa al terminar', (_via, cerrar) => {
  const onDismiss = jest.fn();
  abrirHoja({ onDismiss });
  expect(screen.getAllByRole('button', { name: 'Cerrar detalle' })).toHaveLength(2);
  cerrar();
  avanzar(120);
  // Va bajando (no desaparece de golpe) y el fondo se aclara con ella.
  expect(desplazamiento()).toBeGreaterThan(0);
  expect(desplazamiento()).toBeLessThan(CERRADA);
  expect(opacidadFondo()).toBeLessThan(1);
  expect(onDismiss).not.toHaveBeenCalled();
  avanzar(1500);
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('hoja-hoja')).toBeNull();
  expect(Animated.spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: CERRADA }));
});

test('se arrastra 1:1 desde donde se toma y por encima de la posición abierta resiste cada vez más', () => {
  abrirHoja();
  const d = tomarEnReposo(300);
  expect(desplazamiento()).toBe(0); // tomarla no la hace saltar
  d.arrastrar(340);
  expect(desplazamiento()).toBe(26);
  d.arrastrar(320);
  expect(desplazamiento()).toBe(6);
  d.arrastrar(214);
  expect(desplazamiento()).toBeCloseTo(rubberband(-100, ALTO), 6);
  expect(desplazamiento()).toBeGreaterThan(-100);
  d.arrastrar(14);
  // El doble de recorrido no llega al doble de desplazamiento.
  expect(desplazamiento()).toBeCloseTo(rubberband(-300, ALTO), 6);
  expect(desplazamiento() / rubberband(-100, ALTO)).toBeLessThan(3);
  // Soltar casi quieta: vuelve a su sitio sin cerrarse.
  d.arrastrar(15, 500);
  d.soltar();
  avanzar(1500);
  expect(desplazamiento()).toBe(0);
});

test('un lanzamiento hacia abajo la cierra aunque apenas se movió: se proyecta el impulso y el resorte hereda la velocidad', () => {
  const onDismiss = jest.fn();
  abrirHoja({ onDismiss });
  const d = tomarEnReposo(300);
  d.arrastrar(330, 16);
  d.arrastrar(360, 16); // 30 px en 16 ms → 1875 px/s
  expect(desplazamiento()).toBe(46);
  expect(46 + project(1875)).toBeGreaterThan(ALTO / 2);
  d.soltar();
  expect(Animated.spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: CERRADA, velocity: 1875 }));
  avanzar(1500);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('soltada sin impulso decide por posición: menos de la mitad vuelve y más de la mitad se cierra', () => {
  const onDismiss = jest.fn();
  abrirHoja({ onDismiss });
  // Se toma en y = 314 (tras superar el umbral), así que el desplazamiento es y − 314.
  let d = tomarEnReposo(300);
  d.arrastrar(478, 300);
  d.arrastrar(479, 500); // casi quieta en 165 px (< 200)
  expect(desplazamiento()).toBe(165);
  d.soltar();
  avanzar(1500);
  expect(desplazamiento()).toBe(0);
  expect(onDismiss).not.toHaveBeenCalled();

  d = tomarEnReposo(300);
  d.arrastrar(558, 300);
  d.arrastrar(559, 500); // casi quieta en 245 px (> 200)
  expect(desplazamiento()).toBe(245);
  d.soltar();
  avanzar(1500);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('un lanzamiento hacia arriba la rescata aunque esté por debajo de la mitad', () => {
  const onDismiss = jest.fn();
  abrirHoja({ onDismiss });
  const d = tomarEnReposo(300);
  d.arrastrar(560, 400);
  d.arrastrar(536, 16); // en 222 px pero subiendo a 1500 px/s
  d.soltar();
  expect(Animated.spring).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, velocity: -1500 }));
  avanzar(1500);
  expect(desplazamiento()).toBe(0);
  expect(onDismiss).not.toHaveBeenCalled();
});

test('es interrumpible: el primer toque la atrapa a mitad de la animación y sigue al dedo desde ahí', () => {
  render(<Pantalla />);
  medir();
  avanzar(80);
  const enVuelo = desplazamiento();
  expect(enVuelo).toBeGreaterThan(0);
  const d = dedo();
  expect(d.apoyar(600)).toBe(true); // en movimiento: la captura al instante
  d.tomar();
  avanzar(200);
  expect(desplazamiento()).toBeCloseTo(enVuelo, 6); // atrapada: ni salta ni sigue sola
  d.arrastrar(620);
  expect(desplazamiento()).toBeCloseTo(enVuelo + 20, 6);
});

test('con "Reducir movimiento" aparece y se va con un fundido, sin deslizarse', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  const onDismiss = jest.fn();
  function ConBoton() {
    const [abierta, setAbierta] = useState(false);
    return (
      <>
        <Text onPress={() => setAbierta(true)}>Abrir</Text>
        <BottomSheet visible={abierta} title="Detalle" testID="hoja" onDismiss={() => { setAbierta(false); onDismiss(); }}>
          <Text>Contenido</Text>
        </BottomSheet>
      </>
    );
  }
  render(<ConBoton />);
  // La preferencia ya se conoce al abrir (en la app, la pantalla la consultó al montarse).
  await act(async () => {});
  fireEvent.press(screen.getByText('Abrir'));
  expect(desplazamiento()).toBe(0);
  expect(opacidadHoja()).toBe(0);
  avanzar(100);
  expect(opacidadHoja()).toBeGreaterThan(0);
  expect(opacidadHoja()).toBeLessThan(1);
  expect(desplazamiento()).toBe(0);
  avanzar(300);
  expect(opacidadHoja()).toBe(1);

  fireEvent.press(screen.getByTestId('hoja-cerrar'));
  avanzar(100);
  expect(opacidadHoja()).toBeLessThan(1);
  expect(desplazamiento()).toBe(0);
  avanzar(300);
  expect(onDismiss).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId('hoja-hoja')).toBeNull();
  expect(Animated.spring).not.toHaveBeenCalled();
});
