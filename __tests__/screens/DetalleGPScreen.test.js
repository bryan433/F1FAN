import React from 'react';
import {
  render,
  screen,
  fireEvent,
} from '@testing-library/react-native';
import DetalleGPScreen from '../../src/screens/DetalleGPScreen';
import { adaptSeasonCalendar } from '../../src/services/JolpicaCalendarAdapter';
import { calendarRace } from '../fixtures/calendar';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: ({ name }) => (
      <Text testID={`icon-${name}`}>{name}</Text>
    ),
  };
});

jest.mock('../../src/components/TrackMap', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../src/data/mockData', () => ({
  CURRENT_MEETING: null,
}));

// Datos controlados de prueba; no representan un GP real.
const meeting = {
  nombreCorto: 'GP de prueba',
  round: '1',
  circuito: {
    nombreCircuito: 'Circuito de prueba',
    ciudad: 'Ciudad de prueba',
    pais: 'País de prueba',
  },
  sesiones: [],
};

function openDetail(selectedMeeting = meeting) {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };

  render(
    <DetalleGPScreen
      route={{ params: { meeting: selectedMeeting } }}
      navigation={navigation}
    />,
  );

  return navigation;
}

describe('DetalleGPScreen: regresión', () => {
  test('se renderiza sin errores con el meeting recibido', () => {
    expect(() => {
      openDetail();
    }).not.toThrow();

    expect(screen.getByText(meeting.nombreCorto)).toBeTruthy();
    expect(
      screen.getByText(meeting.circuito.nombreCircuito),
    ).toBeTruthy();
    expect(screen.getByText('SEGUIR')).toBeTruthy();
  });

  test('permite activar y desactivar el seguimiento', () => {
    openDetail();

    expect(screen.queryByText('SIGUIENDO')).toBeNull();

    fireEvent.press(screen.getByText('SEGUIR'));

    expect(screen.getByText('SIGUIENDO')).toBeTruthy();
    expect(screen.queryByText('SEGUIR')).toBeNull();

    fireEvent.press(screen.getByText('SIGUIENDO'));

    expect(screen.getByText('SEGUIR')).toBeTruthy();
    expect(screen.queryByText('SIGUIENDO')).toBeNull();
  });

  test('la flecha ejecuta navigation.goBack una vez', () => {
    const navigation = openDetail();

    fireEvent.press(screen.getByTestId('icon-arrow-back'));

    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).toHaveBeenCalledWith();
  });
});

describe('DetalleGPScreen: calendario de Jolpica', () => {
  function realModel(overrides = {}) {
    return adaptSeasonCalendar([calendarRace(overrides)], '2026', Date.parse('2026-11-02T12:00:00Z'))[0];
  }

  test('muestra exclusivamente la identidad, circuito y sesiones del GP seleccionado', () => {
    const gp = realModel({ round: '07', raceName: 'GP seleccionado' });
    openDetail(gp);

    expect(screen.getByText('GP seleccionado')).toBeTruthy();
    expect(screen.getByText('Temporada 2026 • Ronda 07')).toBeTruthy();
    expect(screen.getByText('Circuito de prueba')).toBeTruthy();
    expect(screen.getByText('Ciudad de prueba, País de prueba')).toBeTruthy();
    expect(screen.getByText('2026-11-08')).toBeTruthy();
    expect(screen.getByText('14:00 (Santiago)')).toBeTruthy();
    expect(screen.getByText('Practice 1')).toBeTruthy();
    expect(screen.getByText('Viernes 10:00 (Santiago)')).toBeTruthy();
    expect(screen.getByText('Carrera')).toBeTruthy();
    expect(screen.queryByText(/Singapur|Marina Bay|2024|VUELTA 12|EN VIVO/i)).toBeNull();
  });

  test('conserva fechas publicadas sin inventar una hora desconocida', () => {
    openDetail(realModel({ time: undefined }));
    expect(screen.getByText('2026-11-08 (fecha UTC)')).toBeTruthy();
    expect(screen.getByText('Hora por confirmar')).toBeTruthy();
    expect(screen.getByText('2026-11-08 (fecha UTC) Hora por confirmar')).toBeTruthy();
    expect(screen.queryByText(/Hoy|09:00|undefined|null/)).toBeNull();
  });

  test.each([null, {}, { sesiones: null }, { circuito: null, sesiones: [null, undefined] }])(
    'protege propiedades ausentes y no recupera CURRENT_MEETING: %p', input => {
      expect(() => openDetail(input)).not.toThrow();
      if (input === null) {
        expect(screen.getByText('Información del Gran Premio no disponible')).toBeTruthy();
      } else {
        expect(screen.getByText('Circuito: información no disponible')).toBeTruthy();
        expect(screen.getByText('No hay sesiones publicadas para este GP.')).toBeTruthy();
        expect(screen.getByText('Temporada Información no disponible • Ronda Información no disponible')).toBeTruthy();
      }
      expect(screen.queryByText(/Singapur|Marina Bay|Practice 2|Round 17/i)).toBeNull();
    },
  );

  test('tolera la ausencia de route y conserva el regreso accesible', () => {
    const navigation = { goBack: jest.fn() };
    render(<DetalleGPScreen navigation={navigation} />);
    expect(screen.getByText('Información del Gran Premio no disponible')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('no presenta mapa, telemetría, meteorología ni resultados simulados como reales', () => {
    const gp = realModel();
    gp.sesiones[0].estado = 'Finalizado';
    openDetail(gp);
    expect(screen.getByText('Mapa y telemetría no disponibles para este GP.')).toBeTruthy();
    expect(screen.getByText('Información no disponible en el calendario de Jolpica.')).toBeTruthy();
    expect(screen.getAllByText('Información no disponible')).toHaveLength(4);
    expect(screen.queryByText(/29°C|38°C|76%|EN VIVO|V12|VUELTA 12/)).toBeNull();

    fireEvent.press(screen.getByText('Practice 1'));
    expect(screen.getByText('Resultados oficiales no disponibles en el calendario de Jolpica.')).toBeTruthy();
    expect(screen.queryByText(/Leclerc|Verstappen|1:31\.763|Tiempos y diferencias oficiales/)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Cerrar información de sesión' }));
    expect(screen.queryByText('Resultados oficiales no disponibles en el calendario de Jolpica.')).toBeNull();
  });

  test('una sesión pasada sin confirmación no muestra resultados ni inicia Live', () => {
    const gp = realModel({ date: '2026-10-25', FirstPractice: { date: '2026-10-23', time: '13:00:00Z' } });
    const navigation = openDetail(gp);
    fireEvent.press(screen.getByText('Practice 1'));
    expect(screen.getByText('El horario publicado no confirma el estado real de la sesión.')).toBeTruthy();
    expect(screen.queryByText('FINALIZADO')).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  test.each([{ esLive: true }, { estado: 'En curso' }])('solo una sesión confirmada navega al tab registrado: %p', confirmation => {
    const gp = realModel();
    Object.assign(gp.sesiones[0], confirmation);
    const navigation = openDetail(gp);
    fireEvent.press(screen.getByText('Practice 1'));
    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', { screen: 'En Vivo' });
    expect(screen.queryByText(/^VUELTA /)).toBeNull();
  });

  test('el acceso a RA identifica que es una demostración ajena al GP', () => {
    const navigation = openDetail(realModel());
    expect(screen.getByText('La demostración no representa el circuito ni la telemetría de este GP.')).toBeTruthy();
    fireEvent.press(screen.getByText('VER DEMOSTRACIÓN EN REALIDAD AUMENTADA'));
    expect(navigation.navigate).toHaveBeenCalledWith('RealidadAumentada');
  });

  test('conserva el aviso de caché que acompaña al GP seleccionado', () => {
    const gp = realModel();
    gp.warning = 'No se pudo actualizar con Jolpica. Mostrando la última copia guardada.';
    openDetail(gp);
    expect(screen.getByText(gp.warning)).toBeTruthy();
  });

  test('al cambiar el GP de la ruta no conserva sesiones ni selección del GP anterior', () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };
    const previous = realModel();
    const next = realModel({ round: '2', raceName: 'Otro GP', FirstPractice: undefined, Qualifying: undefined });
    const { rerender } = render(<DetalleGPScreen route={{ params: { meeting: previous } }} navigation={navigation} />);
    fireEvent.press(screen.getByText('SEGUIR'));
    fireEvent.press(screen.getByText('Practice 1'));
    expect(screen.getByText('El horario publicado no confirma el estado real de la sesión.')).toBeTruthy();

    rerender(<DetalleGPScreen route={{ params: { meeting: next } }} navigation={navigation} />);
    expect(screen.getByText('Otro GP')).toBeTruthy();
    expect(screen.getByText('Temporada 2026 • Ronda 2')).toBeTruthy();
    expect(screen.queryByText('Practice 1')).toBeNull();
    expect(screen.queryByText('El horario publicado no confirma el estado real de la sesión.')).toBeNull();
    expect(screen.queryByText('SIGUIENDO')).toBeNull();
    expect(screen.getByText('SEGUIR')).toBeTruthy();
  });
});
