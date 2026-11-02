import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DriverCard from '../../src/components/DriverCard';
import { Piloto } from '../../src/models/Piloto';
import { driverRecord } from '../fixtures/standings';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

function driver(overrides = {}) {
  return new Piloto({ ...driverRecord(), nombreEscuderia: 'Equipo de prueba', ...overrides });
}

test('presenta el modelo Piloto y permite abrir la tarjeta con la posición suministrada', () => {
  const selected = driver({ puntos: 37, posicionCampeonato: 8 });
  const onPress = jest.fn();
  render(<DriverCard driver={selected} position={4} onPress={onPress} />);
  expect(screen.getByText('P. DE PRUEBA')).toBeTruthy();
  expect(screen.getByText('Equipo de prueba')).toBeTruthy();
  expect(screen.getByText('4')).toBeTruthy();
  expect(screen.queryByText('8')).toBeNull();
  expect(screen.getByText('21')).toBeTruthy();
  expect(screen.getByText('37')).toBeTruthy();
  fireEvent.press(screen.getByText('P. DE PRUEBA'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('usa la posición del piloto si no se proporciona una posición de la tabla', () => {
  render(<DriverCard driver={driver({ posicionCampeonato: 6 })} />);
  expect(screen.getByText('6')).toBeTruthy();
});

test('tolera apellido y posición ausentes, utiliza los campos alternativos y conserva cero puntos', () => {
  render(<DriverCard driver={{ codigo: 'PRB', teamName: 'Equipo alternativo', numero: 19, puntos: 0 }} />);
  expect(screen.getByText(/PRB$/)).toBeTruthy();
  expect(screen.getByText('Equipo alternativo')).toBeTruthy();
  expect(screen.getByText('-')).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.queryByTestId('icon-star-outline')).toBeNull();
});

test('solicita cambiar el favorito del piloto correcto y refleja el estado recibido al rerenderizar', () => {
  const selected = driver({ esFavorito: false });
  const onToggleFavorite = jest.fn();
  const onPress = jest.fn();
  const { rerender } = render(<DriverCard driver={selected} onPress={onPress} onToggleFavorite={onToggleFavorite} />);
  fireEvent.press(screen.getByTestId('icon-star-outline'));
  expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  expect(onToggleFavorite).toHaveBeenCalledWith(selected);
  expect(onPress).not.toHaveBeenCalled();
  expect(selected.esFavorito).toBe(false);

  rerender(<DriverCard driver={driver({ esFavorito: true })} onToggleFavorite={onToggleFavorite} />);
  expect(screen.queryByTestId('icon-star-outline')).toBeNull();
  expect(screen.getAllByTestId('icon-star')).toHaveLength(2);
});

test('puede mostrar un favorito sin ofrecer un control para modificarlo', () => {
  render(<DriverCard driver={driver({ esFavorito: true })} />);
  expect(screen.getAllByTestId('icon-star')).toHaveLength(1);
});
