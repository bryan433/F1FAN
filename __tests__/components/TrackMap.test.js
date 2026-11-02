import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import TrackMap from '../../src/components/TrackMap';

// No se simula useState ni el mapa: se observa la posición de sus marcadores renderizados.
function markerPosition(number) {
  let node = screen.getByText(number);
  while (node) {
    const style = StyleSheet.flatten(node.props.style);
    if (Number.isFinite(style?.left) && Number.isFinite(style?.top)) return { left: style.left, top: style.top };
    node = node.parent;
  }
  throw new Error(`Marcador ${number} sin posición renderizada`);
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

test('anima ambos marcadores y vuelve al inicio después de recorrer el trazado de demostración', () => {
  render(<TrackMap isDemo={true} />);
  const first = markerPosition('63');
  const second = markerPosition('4');
  act(() => { jest.advanceTimersByTime(1200); });
  expect(markerPosition('63')).not.toEqual(first);
  expect(markerPosition('4')).not.toEqual(second);
  act(() => { jest.advanceTimersByTime(16 * 1200); });
  expect(markerPosition('63')).toEqual(first);
  expect(markerPosition('4')).toEqual(second);
});

test('el control de animación pausa, inicia y vuelve a pausar sin reiniciar las posiciones', () => {
  const { rerender } = render(<TrackMap circuitName="Circuito de prueba" isLive={false} isDemo={true} />);
  expect(screen.getByText('Circuito de prueba')).toBeTruthy();
  const stopped = markerPosition('63');
  act(() => { jest.advanceTimersByTime(2400); });
  expect(markerPosition('63')).toEqual(stopped);
  rerender(<TrackMap circuitName="Circuito de prueba" isLive={true} isDemo={true} />);
  act(() => { jest.advanceTimersByTime(1200); });
  const moving = markerPosition('63');
  expect(moving).not.toEqual(stopped);
  rerender(<TrackMap circuitName="Circuito de prueba" isLive={false} isDemo={true} />);
  act(() => { jest.advanceTimersByTime(2400); });
  expect(markerPosition('63')).toEqual(moving);
});

test('al desmontar deja de mantener un temporizador de animación activo', () => {
  const initial = jest.getTimerCount();
  const { unmount } = render(<TrackMap isLive={true} isDemo={true} />);
  expect(jest.getTimerCount()).toBe(initial + 1);
  unmount();
  expect(jest.getTimerCount()).toBe(initial);
});
