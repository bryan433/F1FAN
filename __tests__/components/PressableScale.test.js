import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import PressableScale, { PRESSED_OPACITY, PRESSED_SCALE } from '../../src/components/PressableScale';

const boton = () => screen.getByRole('button', { name: 'Guardar' });
const estilo = () => StyleSheet.flatten(boton().props.style);
const escala = () => Object.assign({}, ...estilo().transform).scale;
const avanzar = ms => act(() => { jest.advanceTimersByTime(ms); });

function Boton(props) {
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Guardar" {...props}>
      <Text>Guardar</Text>
    </PressableScale>
  );
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('reenvía rol, etiqueta, estado accesible, hitSlop y testID, y llama a onPress', () => {
  const onPress = jest.fn();
  render(<Boton accessibilityState={{ selected: true }} hitSlop={8} testID="guardar" onPress={onPress} />);
  expect(boton().props.testID).toBe('guardar');
  expect(boton().props.hitSlop).toBe(8);
  expect(boton().props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  fireEvent.press(boton());
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('deshabilitado lo anuncia y no responde', () => {
  const onPress = jest.fn();
  render(<Boton disabled onPress={onPress} />);
  expect(boton().props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
  fireEvent.press(boton());
  expect(onPress).not.toHaveBeenCalled();
});

test('responde al tocar (onPressIn), no al soltar: se encoge en pocos cuadros y vuelve al levantar el dedo', () => {
  const onPressIn = jest.fn();
  const onPressOut = jest.fn();
  render(<Boton onPress={() => {}} onPressIn={onPressIn} onPressOut={onPressOut} />);
  expect(escala()).toBe(1);

  fireEvent(boton(), 'pressIn');
  expect(onPressIn).toHaveBeenCalledTimes(1);
  avanzar(48); // tres cuadros
  expect(escala()).toBeLessThan(1 - (1 - PRESSED_SCALE) / 2);
  avanzar(500);
  expect(escala()).toBeCloseTo(PRESSED_SCALE, 4);
  // Críticamente amortiguado: no se encoge de más.
  expect(escala()).toBeGreaterThanOrEqual(PRESSED_SCALE);

  fireEvent(boton(), 'pressOut');
  expect(onPressOut).toHaveBeenCalledTimes(1);
  avanzar(800);
  expect(escala()).toBeCloseTo(1, 4);
});

test('es interrumpible: soltar a mitad del gesto vuelve desde la escala en pantalla, sin saltos', () => {
  render(<Boton onPress={() => {}} />);
  fireEvent(boton(), 'pressIn');
  avanzar(32);
  const aMitad = escala();
  expect(aMitad).toBeLessThan(1);
  expect(aMitad).toBeGreaterThan(PRESSED_SCALE);
  fireEvent(boton(), 'pressOut');
  avanzar(16);
  expect(Math.abs(escala() - aMitad)).toBeLessThan(0.01);
});

test('respeta la opacidad propia del estilo', () => {
  render(<Boton style={{ opacity: 0.5 }} onPress={() => {}} />);
  expect(estilo().opacity).toBe(0.5);
});

test('con "Reducir movimiento" responde con un cambio de opacidad y no escala', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  render(<Boton onPress={() => {}} />);
  await act(async () => {});

  fireEvent(boton(), 'pressIn');
  expect(estilo().opacity).toBe(PRESSED_OPACITY);
  avanzar(500);
  expect(escala()).toBe(1);

  fireEvent(boton(), 'pressOut');
  avanzar(300);
  expect(estilo().opacity).toBe(1);
  expect(escala()).toBe(1);
});
