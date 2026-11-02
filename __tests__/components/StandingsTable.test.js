import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import StandingsTable from '../../src/components/StandingsTable';
import { Piloto } from '../../src/models/Piloto';
import { Escuderia } from '../../src/models/Escuderia';
import { driverRecord, teamRecord } from '../fixtures/standings';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

function drivers(points = [30, 10]) {
  return [
    new Piloto({ ...driverRecord(), nombre: 'Ana', apellido: 'Prueba', codigo: 'ANA', nombreEscuderia: 'Equipo A', puntos: points[0] }),
    new Piloto({ ...driverRecord(), idPiloto: 102, nombre: 'Bruno', apellido: 'Ensayo', codigo: 'BRU', nombreEscuderia: 'Equipo B', puntos: points[1] }),
  ];
}

test('muestra los pilotos en el orden recibido y calcula su comparación proporcional', () => {
  render(<StandingsTable drivers={drivers()} />);
  expect(screen.getByText('A. PRUEBA')).toBeTruthy();
  expect(screen.getByText('B. ENSAYO')).toBeTruthy();
  expect(screen.getByText('ANA • 30 PTS (75%)')).toBeTruthy();
  expect(screen.getByText('BRU • 10 PTS (25%)')).toBeTruthy();
});

test('reenvía el piloto completo al abrir la fila y al cambiar su favorito', () => {
  const list = drivers();
  const onDriverPress = jest.fn();
  const onToggleFavorite = jest.fn();
  render(<StandingsTable drivers={list} onDriverPress={onDriverPress} onToggleFavorite={onToggleFavorite} />);
  fireEvent.press(screen.getByText('A. PRUEBA'));
  expect(onDriverPress).toHaveBeenCalledTimes(1);
  expect(onDriverPress).toHaveBeenCalledWith(list[0]);
  fireEvent.press(screen.getAllByTestId('icon-star-outline')[1]);
  expect(onToggleFavorite).toHaveBeenCalledTimes(1);
  expect(onToggleFavorite).toHaveBeenCalledWith(list[1]);
});

test('alterna pestañas y mantiene el soporte del formato heredado de equipos y su callback', () => {
  const team = { id: 'equipo_legacy', fullName: 'Equipo legado', points: 45, colorHex: '#123456' };
  const onTeamPress = jest.fn();
  render(<StandingsTable drivers={drivers()} teams={[team]} onTeamPress={onTeamPress} />);
  expect(screen.queryByText('Equipo legado')).toBeNull();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.getByText('Equipo legado')).toBeTruthy();
  expect(screen.getByText('45')).toBeTruthy();
  expect(screen.queryByText('A. PRUEBA')).toBeNull();
  fireEvent.press(screen.getByText('Equipo legado'));
  expect(onTeamPress).toHaveBeenCalledTimes(1);
  expect(onTeamPress).toHaveBeenCalledWith(team);
  fireEvent.press(screen.getByText('PILOTOS'));
  expect(screen.getByText('A. PRUEBA')).toBeTruthy();
});

test('las filas no lanzan errores si faltan callbacks opcionales y admite constructores vacíos', () => {
  const { rerender } = render(<StandingsTable drivers={drivers()} teams={[{ id: 'legacy', name: 'Equipo legado' }]} />);
  expect(() => fireEvent.press(screen.getByText('A. PRUEBA'))).not.toThrow();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(() => fireEvent.press(screen.getByText('Equipo legado'))).not.toThrow();
  expect(screen.getByText('0')).toBeTruthy();
  rerender(<StandingsTable drivers={drivers()} teams={[]} />);
  expect(screen.queryByText('Equipo legado')).toBeNull();
});

// Regresiones normales de integridad: si fallan se reportan y no se modifica producción.
test('DEFECTO: debe mostrar el nombre del modelo Escuderia que recibe de F1DataService', () => {
  const team = new Escuderia(teamRecord({ nombre: 'Equipo del modelo', puntos: 50 }));
  render(<StandingsTable drivers={drivers()} teams={[team]} />);
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.getByText('50')).toBeTruthy();
  expect(screen.queryByText('Equipo del modelo')).not.toBeNull();
});

test('DEFECTO: una lista vacía no debe presentar pilotos y puntos ficticios en la comparación', () => {
  render(<StandingsTable />);
  expect(screen.queryAllByText(/PTS \(\d+%\)/)).toHaveLength(0);
});

test('DEFECTO: con un solo piloto no debe inventar un segundo participante', () => {
  render(<StandingsTable drivers={[drivers()[0]]} />);
  expect(screen.getByText('A. PRUEBA')).toBeTruthy();
  expect(screen.queryAllByText(/PTS \(\d+%\)/).length).toBeLessThanOrEqual(1);
});

test('DEFECTO: dos pilotos sin puntos no deben atribuir el 100% de los puntos al segundo', () => {
  render(<StandingsTable drivers={drivers([0, 0])} />);
  expect(screen.getByText('A. PRUEBA')).toBeTruthy();
  expect(screen.getByText('B. ENSAYO')).toBeTruthy();
  expect(screen.queryByText(/100%/)).toBeNull();
});

test('respeta posiciones publicadas no numéricas y datos desconocidos de Jolpica sin renumerarlos', () => {
  const driver = Object.assign(drivers()[0], { source: 'jolpica', positionText: 'D', numero: null, puntos: null });
  const team = Object.assign(new Escuderia({ idEscuderia: 'excluido', nombre: 'Equipo excluido', puntos: null }), { source: 'jolpica', positionText: 'E' });
  render(<StandingsTable drivers={[driver]} teams={[team]} />);
  expect(screen.getByText('D')).toBeTruthy();
  expect(screen.getAllByText('No disponible')).toHaveLength(2);
  expect(screen.queryByText('1')).toBeNull();
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  expect(screen.getByText('E')).toBeTruthy();
  expect(screen.getByText('No disponible')).toBeTruthy();
  expect(screen.queryByText('0')).toBeNull();
});

test('una posición ausente de Jolpica permanece desconocida aunque la fila sea la primera', () => {
  const driver = Object.assign(drivers()[0], { source: 'jolpica', positionText: null, posicionCampeonato: null });
  render(<StandingsTable drivers={[driver]} />);
  expect(screen.getByText('—')).toBeTruthy();
  expect(screen.queryByText('1')).toBeNull();
});

test('la estrella de escudería transmite el equipo correcto y refleja su estado sin abrir su fila', () => {
  const team = new Escuderia(teamRecord({ nombre: 'Equipo favorito' }));
  const onToggleTeamFavorite = jest.fn();
  const onTeamPress = jest.fn();
  const { rerender } = render(<StandingsTable teams={[team]} onToggleTeamFavorite={onToggleTeamFavorite} onTeamPress={onTeamPress} />);
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  fireEvent.press(screen.getByLabelText('Marcar escudería favorita Equipo favorito'));
  expect(onToggleTeamFavorite).toHaveBeenCalledTimes(1);
  expect(onToggleTeamFavorite).toHaveBeenCalledWith(team);
  expect(onTeamPress).not.toHaveBeenCalled();
  rerender(<StandingsTable teams={[{ ...team, esFavorito: true }]} onToggleTeamFavorite={onToggleTeamFavorite} />);
  expect(screen.getByLabelText('Quitar escudería favorita Equipo favorito')).toBeTruthy();
});
