import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RaceCard from '../../src/components/RaceCard';

test('con datos ausentes informa campos desconocidos y no inventa hora, fecha ni ganador', () => {
  render(<RaceCard race={{}} />);
  expect(screen.getByText('Hora por confirmar')).toBeTruthy();
  expect(screen.getByText('Fecha por confirmar')).toBeTruthy();
  expect(screen.getByText('Circuito no disponible')).toBeTruthy();
  expect(screen.getByText('Nombre del GP no disponible')).toBeTruthy();
  expect(screen.getByText('Ronda no disponible')).toBeTruthy();
  expect(screen.queryByText(/09:00|20 - 22 Sep|Ganador: VER/)).toBeNull();
});

test('un estado finalizado confirmado sin ganador no inventa un resultado', () => {
  const { rerender } = render(<RaceCard race={{ estado: 'Finalizado' }} />);
  expect(screen.getByText('Resultado no disponible')).toBeTruthy();
  expect(screen.queryByText(/Ganador:/)).toBeNull();
  rerender(<RaceCard race={{ status: 'Finalizado', winner: 'Piloto confirmado' }} />);
  expect(screen.getByText('Ganador: Piloto confirmado')).toBeTruthy();
});

test('mantiene la pulsación de tarjeta y de acceso a una sesión confirmada en curso', () => {
  const onPress = jest.fn();
  const onLivePress = jest.fn();
  render(<RaceCard race={{ nombreOficial: 'GP seleccionado', estado: 'En curso' }} onPress={onPress} onLivePress={onLivePress} />);
  fireEvent.press(screen.getByText('GP seleccionado'));
  expect(onPress).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByText('ENTRAR AL LIVE'));
  expect(onLivePress).toHaveBeenCalledTimes(1);
});
