import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import TelemetryWidget from '../../src/components/TelemetryWidget';
import { Colors } from '../../src/theme/colors';

// Datos sintéticos: estas pruebas no acreditan telemetría ni sesiones reales.
const telemetry = {
  driverName: 'A. Prueba', teamName: 'Equipo sintético', number: 101,
  speed: 220, gear: 6, drs: false, throttle: 75, brake: 25,
};

test('muestra la identidad y las mediciones recibidas, con km/h como unidad predeterminada', () => {
  render(<TelemetryWidget {...telemetry} />);
  expect(screen.getByText('A. Prueba')).toBeTruthy();
  expect(screen.getByText('Equipo sintético')).toBeTruthy();
  expect(screen.getByText('101')).toBeTruthy();
  expect(screen.getByText('220')).toBeTruthy();
  expect(screen.getByText('6')).toBeTruthy();
  expect(screen.getByText('km/h')).toBeTruthy();
  expect(screen.getByText('75%')).toBeTruthy();
  expect(screen.getByText('25%')).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByText('DRS OFF').props.style)).toMatchObject({ color: Colors.textMuted });
});

test('actualiza lecturas, estado DRS y unidad sin sustituir ceros por valores de demostración', () => {
  const { rerender } = render(<TelemetryWidget {...telemetry} />);
  rerender(<TelemetryWidget {...telemetry} speed={0} gear={0} drs={true} throttle={0} brake={100} unit="mph" />);
  expect(screen.getAllByText('0')).toHaveLength(2);
  expect(screen.getByText('0%')).toBeTruthy();
  expect(screen.getByText('100%')).toBeTruthy();
  expect(screen.getByText('mph')).toBeTruthy();
  expect(screen.queryByText('km/h')).toBeNull();
  expect(screen.queryByText('220')).toBeNull();
  expect(screen.queryByText('DRS OFF')).toBeNull();
  expect(StyleSheet.flatten(screen.getByText('DRS ON').props.style)).toMatchObject({ color: Colors.accentGreen });
});

test('una lectura parcial conserva los datos suministrados junto a los valores heredados de demostración', () => {
  render(<TelemetryWidget driverName="Piloto de demostración" teamName="Equipo de demostración" speed={0} />);
  expect(screen.getByText('Piloto de demostración')).toBeTruthy();
  expect(screen.getByText('Equipo de demostración')).toBeTruthy();
  expect(screen.getByText('0')).toBeTruthy();
  expect(screen.getByText('DRS ON')).toBeTruthy();
  expect(screen.getByText('98%')).toBeTruthy();
  expect(screen.getByText('0%')).toBeTruthy();
  // Caracteriza los valores predeterminados actuales, sin presentarlos como mediciones reales.
});
