import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import ARScreen from '../../src/screens/ARScreen';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text>{name}</Text> };
});

const title = 'SIMULACIÓN AR — DATOS DE DEMOSTRACIÓN';
const explanation = 'Marina Bay es un circuito de demostración independiente del GP seleccionado. Pilotos, vueltas, posiciones y velocidades son simulados; no son datos oficiales.';

function openSimulation() {
  const navigation = { goBack: jest.fn() };
  render(<ARScreen navigation={navigation} route={{ params: { meeting: { nombreCorto: 'Otro GP', season: '2026', round: '7' } } }} />);
  return navigation;
}

function placeCircuit() {
  fireEvent.press(screen.getByRole('button', { name: 'COLOCAR CIRCUITO' }));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('identifica la simulación y el circuito independiente antes de colocarlo', () => {
  const navigation = openSimulation();
  expect(screen.getByRole('header', { name: title })).toBeTruthy();
  expect(screen.getByText(explanation)).toBeTruthy();
  expect(screen.getByText('Simula la colocación del circuito sobre una mesa o superficie plana')).toBeTruthy();
  expect(screen.queryByText(/AR LIVE|EN VIVO|TIEMPO REAL/)).toBeNull();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar simulación AR' }));
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});

test('mantiene el aviso al colocar el circuito y etiqueta los datos del TrackMap real como simulados', () => {
  openSimulation();
  fireEvent.press(screen.getByRole('button', { name: '1:200' }));
  expect(screen.getByRole('button', { name: '1:200' }).props.accessibilityState.selected).toBe(true);
  placeCircuit();

  expect(screen.getByText(title)).toBeTruthy();
  expect(screen.getByText(explanation)).toBeTruthy();
  expect(screen.getByText('DEMO AR • MARINA BAY')).toBeTruthy();
  expect(screen.getByText('MARINA BAY • DEMOSTRACIÓN')).toBeTruthy();
  expect(screen.getByText('CLASIFICACIÓN SIMULADA')).toBeTruthy();
  expect(screen.getByText('VUELTA SIMULADA 24/62')).toBeTruthy();
  expect(screen.getByText('V12 SIMULADA')).toBeTruthy();
  expect(screen.getByText('NOR #4 (P1 DEMO)')).toBeTruthy();
  expect(screen.getByText('RUS #63 (P3 DEMO)')).toBeTruthy();
  expect(screen.getByText('DRS DE EJEMPLO')).toBeTruthy();
  expect(screen.getByText('RUSSELL #63 · DEMO')).toBeTruthy();
  expect(screen.getByText('294.06')).toBeTruthy();
  expect(screen.getByText('KM/H SIMULADOS')).toBeTruthy();
  expect(screen.queryByText('Otro GP')).toBeNull();
  expect(screen.queryByText(/AR LIVE|EN VIVO|TIEMPO REAL/)).toBeNull();
});

test.each(['ANIMACIÓN DEMO', 'REPLAY DEMO', 'GAPS 3D DEMO'])('el modo %s conserva su selección visual y la identificación de demostración', label => {
  openSimulation();
  placeCircuit();
  fireEvent.press(screen.getByRole('button', { name: label }));
  expect(screen.getByRole('button', { name: label }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByText(title)).toBeTruthy();
  expect(screen.getByText(explanation)).toBeTruthy();
  expect(screen.queryByText(/AR LIVE|EN VIVO|TIEMPO REAL/)).toBeNull();
});

test('conserva el regreso a colocación, la escala elegida y el cierre de la pantalla', () => {
  const navigation = openSimulation();
  fireEvent.press(screen.getByRole('button', { name: '1:50' }));
  placeCircuit();
  fireEvent.press(screen.getByRole('button', { name: 'Volver a colocar el circuito' }));
  expect(screen.getByText(title)).toBeTruthy();
  expect(screen.getByRole('button', { name: '1:50' }).props.accessibilityState.selected).toBe(true);
  expect(navigation.goBack).not.toHaveBeenCalled();
  placeCircuit();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar simulación AR' }));
  expect(navigation.goBack).toHaveBeenCalledTimes(1);
});

test('la grabación visual se identifica como simulada y no afirma guardar un video real', () => {
  openSimulation();
  placeCircuit();
  fireEvent.press(screen.getByRole('button', { name: /Simular clip AR/ }));
  expect(screen.getByRole('button', { name: /SIMULANDO/ })).toBeTruthy();
  expect(Alert.alert).toHaveBeenCalledWith('Grabación simulada', 'Demostración de grabación: no se genera ni guarda un video real.');

  act(() => { jest.advanceTimersByTime(3000); });

  expect(screen.getByRole('button', { name: /Simular clip AR/ })).toBeTruthy();
  expect(Alert.alert).toHaveBeenLastCalledWith('Simulación finalizada', 'La demostración no ha grabado ni guardado archivos.');
  expect(Alert.alert).not.toHaveBeenCalledWith('Clip guardado', expect.anything());
  expect(screen.getByText(title)).toBeTruthy();
});
