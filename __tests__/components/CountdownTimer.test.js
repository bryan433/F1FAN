import React from 'react';
import { render, screen, within, act } from '@testing-library/react-native';
import CountdownTimer from '../../src/components/CountdownTimer';

const now = Date.parse('2026-11-01T12:00:00Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(now);
});

afterEach(() => {
  jest.useRealTimers();
});

test('muestra el GP recibido y actualiza el contador desde un instante UTC', () => {
  render(<CountdownTimer targetDate={new Date(now + 61000).toISOString()} title="GP de prueba" location="Circuito de prueba" country="País de prueba" round="3" totalRounds={22} />);
  expect(screen.getByText('GP de prueba')).toBeTruthy();
  expect(screen.getByText('Circuito de prueba')).toBeTruthy();
  expect(screen.getByText('Round 3 de 22')).toBeTruthy();
  expect(screen.queryByText(/SINGAPUR|MARINA BAY/i)).toBeNull();
  expect(within(screen.getByLabelText('Cuenta regresiva para la carrera')).getByText('01')).toBeTruthy();

  act(() => { jest.advanceTimersByTime(2000); });

  expect(within(screen.getByLabelText('Cuenta regresiva para la carrera')).queryByText('01')).toBeNull();
});

test('cuando llega el inicio programado deja de contar sin afirmar que la carrera está en vivo', () => {
  render(<CountdownTimer targetDate={new Date(now + 1000).toISOString()} />);

  act(() => { jest.advanceTimersByTime(1000); });

  expect(screen.getByText('Inicio programado alcanzado. Estado real sin confirmar.')).toBeTruthy();
  expect(screen.queryByLabelText('Cuenta regresiva para la carrera')).toBeNull();
  expect(screen.queryByText(/EN VIVO|FINALIZADO/)).toBeNull();
});

test('una nueva fecha actualiza inmediatamente el contador', () => {
  const { rerender } = render(<CountdownTimer targetDate={new Date(now + 61000).toISOString()} />);
  rerender(<CountdownTimer targetDate={new Date(now + 120000).toISOString()} />);
  expect(within(screen.getByLabelText('Cuenta regresiva para la carrera')).getByText('02')).toBeTruthy();
});

test('sin fecha no muestra cifras de un contador ficticio', () => {
  render(<CountdownTimer targetDate={null} />);
  expect(screen.getByText('Fecha y hora por confirmar.')).toBeTruthy();
  expect(screen.queryByLabelText('Cuenta regresiva para la carrera')).toBeNull();
  expect(screen.queryByText('Round 17 de 24')).toBeNull();
});
