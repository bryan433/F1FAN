import React, { useState } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import SegmentedControl from '../../src/components/SegmentedControl';

const OPCIONES = [2023, 2024, 2025, 2026].map(anio => ({ value: anio, label: String(anio), accessibilityLabel: `Temporada ${anio}` }));
// Contenedor de 404 pt con 2 pt de relleno: cuatro segmentos de 100 pt.
const ANCHO = 404;

function Selector() {
  const [valor, setValor] = useState(2026);
  return <SegmentedControl options={OPCIONES} value={valor} onChange={setValor} testID="selector" />;
}

const segmento = anio => screen.getByRole('button', { name: `Temporada ${anio}` });
const posicion = () => Object.assign({}, ...StyleSheet.flatten(screen.getByTestId('selector-indicador').props.style).transform).translateX;
const avanzar = ms => act(() => { jest.advanceTimersByTime(ms); });

function montar() {
  render(<Selector />);
  fireEvent(screen.getByTestId('selector'), 'layout', { nativeEvent: { layout: { width: ANCHO } } });
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('el indicador mide un segmento y empieza en la opción elegida, sin animarse al aparecer', () => {
  montar();
  expect(StyleSheet.flatten(screen.getByTestId('selector-indicador').props.style).width).toBe(100);
  expect(posicion()).toBe(300);
  avanzar(500);
  expect(posicion()).toBe(300);
  expect(OPCIONES.map(({ value }) => segmento(value).props.accessibilityState.selected)).toEqual([false, false, false, true]);
});

test('se desliza hasta la nueva opción con un resorte y la selección accesible cambia al instante', () => {
  montar();
  fireEvent.press(segmento(2024));
  expect(segmento(2024).props.accessibilityState.selected).toBe(true);
  avanzar(80);
  expect(posicion()).toBeLessThan(300);
  expect(posicion()).toBeGreaterThan(100);
  avanzar(1500);
  expect(posicion()).toBe(100);
});

test('cambiar de opción a mitad del movimiento redirige desde donde está y conserva el impulso', () => {
  montar();
  fireEvent.press(segmento(2024)); // hacia la izquierda
  avanzar(80);
  const enVuelo = posicion();
  fireEvent.press(segmento(2026)); // de vuelta a la derecha
  avanzar(16);
  // Sin salto y sin frenazo: un cuadro después sigue un poco hacia la izquierda por inercia.
  expect(Math.abs(posicion() - enVuelo)).toBeLessThan(25);
  expect(posicion()).toBeLessThan(enVuelo);
  avanzar(1500);
  expect(posicion()).toBe(300);
  expect(segmento(2026).props.accessibilityState.selected).toBe(true);
});

test('con "Reducir movimiento" el indicador salta a la opción elegida', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  montar();
  await act(async () => {});
  fireEvent.press(segmento(2023));
  expect(posicion()).toBe(0);
});
