import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import StandingsTable from '../../src/components/StandingsTable';
import TrackMap from '../../src/components/TrackMap';
import CountdownTimer from '../../src/components/CountdownTimer';
import TelemetryWidget from '../../src/components/TelemetryWidget';
import RaceCard from '../../src/components/RaceCard';
import SessionCard from '../../src/components/SessionCard';
import { Colors } from '../../src/theme/colors';

describe('Pruebas Avanzadas de Componentes Complejos (Bryan - QA Lead)', () => {
  describe('StandingsTable - Casos complejos de comparación y constructores', () => {
    test('calcula y muestra comparación 50/50 cuando dos pilotos tienen puntuación idéntica', () => {
      const drivers = [
        { idPiloto: 1, codigo: 'VER', nombre: 'Max', apellido: 'Verstappen', puntos: 50, colorHex: '#3671C6' },
        { idPiloto: 2, codigo: 'NOR', nombre: 'Lando', apellido: 'Norris', puntos: 50, colorHex: '#FF8000' },
      ];

      render(<StandingsTable drivers={drivers} />);
      expect(screen.getByText('VER • 50 PTS (50%)')).toBeTruthy();
      expect(screen.getByText('NOR • 50 PTS (50%)')).toBeTruthy();
    });

    test('muestra aviso correspondiente cuando ambos líderes tienen 0 puntos', () => {
      const drivers = [
        { idPiloto: 1, codigo: 'VER', nombre: 'Max', apellido: 'Verstappen', puntos: 0, colorHex: '#3671C6' },
        { idPiloto: 2, codigo: 'NOR', nombre: 'Lando', apellido: 'Norris', puntos: 0, colorHex: '#FF8000' },
      ];

      render(<StandingsTable drivers={drivers} />);
      expect(screen.getByText('No hay puntos para calcular porcentajes.')).toBeTruthy();
    });

    test('muestra aviso de puntuaciones no válidas cuando los puntos no son números', () => {
      const drivers = [
        { idPiloto: 1, codigo: 'VER', nombre: 'Max', apellido: 'Verstappen', puntos: NaN, colorHex: '#3671C6' },
        { idPiloto: 2, codigo: 'NOR', nombre: 'Lando', apellido: 'Norris', puntos: null, colorHex: '#FF8000' },
      ];

      render(<StandingsTable drivers={drivers} />);
      expect(screen.getByText('No hay puntuaciones válidas para comparar.')).toBeTruthy();
    });

    test('muestra mensaje cuando hay menos de dos pilotos para comparar', () => {
      const drivers = [
        { idPiloto: 1, codigo: 'VER', nombre: 'Max', apellido: 'Verstappen', puntos: 100, colorHex: '#3671C6' },
      ];

      render(<StandingsTable drivers={drivers} />);
      expect(screen.getByText('Se necesitan al menos dos pilotos para comparar.')).toBeTruthy();
    });

    test('maneja constructores desde Jolpica con fallbacks de posición y nombre', () => {
      const teams = [
        {
          id: 'team-1',
          source: 'jolpica',
          posicionCampeonato: '3',
          fullName: 'Scuderia Ferrari HP',
          points: 350,
          colorHex: '#E8002D',
        },
        {
          id: 'team-2',
          source: 'jolpica',
          positionText: null,
          posicionCampeonato: null,
          colorHex: '#00D2BE',
        },
      ];

      render(<StandingsTable teams={teams} />);
      fireEvent.press(screen.getByText('CONSTRUCTORES'));

      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('Scuderia Ferrari HP')).toBeTruthy();
      expect(screen.getByText('350')).toBeTruthy();

      // Fallback para posición desconocida y nombre no disponible
      expect(screen.getByText('—')).toBeTruthy();
      expect(screen.getByText('Nombre de escudería no disponible')).toBeTruthy();
      expect(screen.getByText('No disponible')).toBeTruthy();
    });
  });

  describe('TrackMap - Modos En Vivo vs Demo y trazado', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('renderiza el mapa en vivo por defecto con etiquetas reales y pines de curvas', () => {
      render(<TrackMap />);

      // Nombre de circuito por defecto
      expect(screen.getByText('MARINA BAY STREET CIRCUIT')).toBeTruthy();
      // Badge en vivo (no demo)
      expect(screen.getByText('EN VIVO • V12')).toBeTruthy();
      // Leyendas de corredores en vivo
      expect(screen.getByText('NOR #4 (P1)')).toBeTruthy();
      expect(screen.getByText('RUS #63 (P3 ★)')).toBeTruthy();
      expect(screen.getByText('Zona DRS 1 & 2')).toBeTruthy();
      // Pines de curvas T7 y T14
      expect(screen.getByText('T7')).toBeTruthy();
      expect(screen.getByText('T14')).toBeTruthy();
    });

    test('cuando isLive=false no avanza el temporizador ni mueve la posición del auto', () => {
      render(<TrackMap isLive={false} />);
      
      const russellMarker = screen.getByText('63');
      const initialStyle = StyleSheet.flatten(russellMarker.parent.props.style);
      
      act(() => {
        jest.advanceTimersByTime(2500);
      });

      const updatedStyle = StyleSheet.flatten(russellMarker.parent.props.style);
      expect(updatedStyle.left).toEqual(initialStyle.left);
      expect(updatedStyle.top).toEqual(initialStyle.top);
    });
  });

  describe('CountdownTimer - Interacciones y formatos de ronda', () => {
    const fixedNow = Date.parse('2026-11-01T12:00:00Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('ejecuta el callback onCalendarPress al pulsar el botón de calendario', () => {
      const onCalendarPressMock = jest.fn();
      render(
        <CountdownTimer
          targetDate={new Date(fixedNow + 100000).toISOString()}
          onCalendarPress={onCalendarPressMock}
        />
      );

      const calendarBtn = screen.getByText('+ Calendario');
      fireEvent.press(calendarBtn);
      expect(onCalendarPressMock).toHaveBeenCalledTimes(1);
    });

    test('renderiza round individual sin totalRounds de forma limpia', () => {
      render(
        <CountdownTimer
          targetDate={new Date(fixedNow + 100000).toISOString()}
          round="18"
          location="Austin"
          country="Estados Unidos"
        />
      );

      expect(screen.getByText('Round 18')).toBeTruthy();
      expect(screen.getByText('Estados Unidos')).toBeTruthy();
      expect(screen.getByText('Austin')).toBeTruthy();
      expect(screen.getByText('•')).toBeTruthy();
    });

    test('cuando targetDate es inválido muestra fecha por confirmar sin error', () => {
      render(<CountdownTimer targetDate="fecha-no-valida" />);
      expect(screen.getByText('Fecha y hora por confirmar.')).toBeTruthy();
    });
  });

  describe('TelemetryWidget - Valores por defecto y umbrales dinámicos', () => {
    test('renderiza todos los valores por defecto sin props suministradas', () => {
      render(<TelemetryWidget />);

      expect(screen.getByText('G. RUSSELL')).toBeTruthy();
      expect(screen.getByText('Mercedes')).toBeTruthy();
      expect(screen.getByText('63')).toBeTruthy();
      expect(screen.getByText('312')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
      expect(screen.getByText('DRS ON')).toBeTruthy();
      expect(screen.getByText('98%')).toBeTruthy();
      expect(screen.getByText('0%')).toBeTruthy();
      expect(screen.getByText('km/h')).toBeTruthy();
    });

    test('renderiza telemetría en estado de frenada extrema con DRS inactivo', () => {
      render(
        <TelemetryWidget
          driverName="M. VERSTAPPEN"
          teamName="Red Bull Racing"
          number={1}
          speed={345}
          gear={8}
          drs={false}
          throttle={10}
          brake={100}
          unit="km/h"
        />
      );

      expect(screen.getByText('M. VERSTAPPEN')).toBeTruthy();
      expect(screen.getByText('Red Bull Racing')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
      expect(screen.getByText('345')).toBeTruthy();
      expect(screen.getByText('8')).toBeTruthy();
      expect(screen.getByText('DRS OFF')).toBeTruthy();
      expect(screen.getByText('10%')).toBeTruthy();
      expect(screen.getByText('100%')).toBeTruthy();

      const drsText = screen.getByText('DRS OFF');
      expect(StyleSheet.flatten(drsText.props.style).color).toBe(Colors.textMuted);
    });
  });

  describe('RaceCard - Estados visuales isNext y fallbacks', () => {
    test('aplica estilo de próximo Gran Premio destacado cuando isNext es true', () => {
      const race = {
        name: 'Gran Premio de Las Vegas',
        country: 'Estados Unidos',
        round: 22,
        isNext: true,
        localChileHour: '03:00',
        dateRange: '21 - 23 Nov',
      };

      render(<RaceCard race={race} />);
      expect(screen.getByText('Gran Premio de Las Vegas')).toBeTruthy();
      expect(screen.getByText('ROUND 22')).toBeTruthy();
      expect(screen.getByText('03:00')).toBeTruthy();
    });

    test('muestra fallbacks completos de país, ronda y circuito cuando faltan campos', () => {
      const minimalRace = {};
      render(<RaceCard race={minimalRace} />);

      expect(screen.getByText('País no disponible')).toBeTruthy();
      expect(screen.getByText('Ronda no disponible')).toBeTruthy();
      expect(screen.getByText('Circuito no disponible')).toBeTruthy();
      expect(screen.getByText('Hora por confirmar')).toBeTruthy();
      expect(screen.getByText('Fecha por confirmar')).toBeTruthy();
    });
  });

  describe('SessionCard - Formateo horario y variantes de estado', () => {
    test('formatea hora chilena directa cuando no se suministra fecha ni día', () => {
      const session = {
        tipo: 'Qualifying',
        horaChile: '14:30',
        estado: 'Programada',
      };

      render(<SessionCard session={session} />);
      expect(screen.getByText('Qualifying')).toBeTruthy();
      expect(screen.getByText('14:30 (Santiago)')).toBeTruthy();
      expect(screen.getByText('PROGRAMADA')).toBeTruthy();
    });

    test('muestra estado FINALIZADO cuando el estado viene en femenino', () => {
      const session = {
        tipo: 'Carrera Sprint',
        estado: 'Finalizada',
      };

      render(<SessionCard session={session} />);
      expect(screen.getByText('Carrera Sprint')).toBeTruthy();
      expect(screen.getByText('FINALIZADO')).toBeTruthy();
    });
  });
});

