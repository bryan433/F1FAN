import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SessionCard from '../../src/components/SessionCard';

const session = {
  tipo: 'Practice 2',
  dia: 'Viernes',
  horaChile: '12:00',
  estado: 'En curso',
  esLive: true,
  vueltaActual: 12,
};

describe('SessionCard', () => {
  test('muestra la información de una sesión en vivo', () => {
    render(<SessionCard session={session} />);

    expect(screen.getByText('Practice 2')).toBeTruthy();
    expect(screen.getByText('Viernes 12:00 (Santiago)')).toBeTruthy();
    expect(screen.getByText('EN VIVO')).toBeTruthy();
    expect(screen.getByText('VUELTA 12')).toBeTruthy();
  });

  test('ejecuta onPress una vez al pulsar la tarjeta', () => {
    const onPress = jest.fn();
    render(<SessionCard session={session} onPress={onPress} />);

    fireEvent.press(screen.getByText('Practice 2'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('una sesión confirmada en vivo sin vueltas no inventa una vuelta', () => {
    render(<SessionCard session={{ ...session, vueltaActual: null }} />);
    expect(screen.getByText('EN VIVO')).toBeTruthy();
    expect(screen.queryByText(/^VUELTA /)).toBeNull();
  });

  test('conserva una vuelta cero proporcionada explícitamente', () => {
    render(<SessionCard session={{ ...session, vueltaActual: 0 }} />);
    expect(screen.getByText('VUELTA 0')).toBeTruthy();
    expect(screen.queryByText('VUELTA 12')).toBeNull();
  });

  test('no completa el día ni la hora cuando faltan', () => {
    render(<SessionCard session={{ tipo: 'Carrera', estado: 'Programado' }} />);
    expect(screen.getByText('Fecha y hora por confirmar')).toBeTruthy();
    expect(screen.getByText('PROGRAMADA')).toBeTruthy();
    expect(screen.queryByText(/Hoy|12:00|09:00|VUELTA/)).toBeNull();
  });

  test('distingue fecha UTC publicada de una hora chilena desconocida', () => {
    render(<SessionCard session={{ tipo: 'Carrera', date: '2026-11-08', estado: 'Programado' }} />);
    expect(screen.getByText('2026-11-08 (fecha UTC) Hora por confirmar')).toBeTruthy();
  });

  test.each(['Programado', 'Programada'])('respeta el estado %s aunque su fecha sea pasada', estado => {
    render(<SessionCard session={{ tipo: 'Practice 1', estado, fechaHoraUTC: '2000-01-01T12:00:00Z' }} />);
    expect(screen.getByText('PROGRAMADA')).toBeTruthy();
    expect(screen.queryByText('EN VIVO')).toBeNull();
    expect(screen.queryByText('FINALIZADO')).toBeNull();
  });

  test('una fecha futura no convierte un estado desconocido en programado o en vivo', () => {
    render(<SessionCard session={{ tipo: 'Practice 1', estado: 'Estado no confirmado', fechaHoraUTC: '2099-01-01T12:00:00Z' }} />);
    expect(screen.getByText('ESTADO NO CONFIRMADO')).toBeTruthy();
    expect(screen.queryByText('PROGRAMADA')).toBeNull();
    expect(screen.queryByText('EN VIVO')).toBeNull();
  });

  test('conserva un estado finalizado confirmado por la entrada', () => {
    render(<SessionCard session={{ ...session, esLive: false, estado: 'Finalizado' }} />);
    expect(screen.getByText('FINALIZADO')).toBeTruthy();
    expect(screen.queryByText('EN VIVO')).toBeNull();
  });

  test('permite confirmar el estado en curso sin depender de esLive', () => {
    render(<SessionCard session={{ ...session, esLive: false }} />);
    expect(screen.getByText('EN VIVO')).toBeTruthy();
  });
});
