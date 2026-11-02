import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import DetalleGPScreen from '../../src/screens/DetalleGPScreen';
import OpenF1Client from '../../src/services/OpenF1Client';

jest.mock('../../src/services/OpenF1Client', () => ({
  __esModule: true, default: { getSessionResults: jest.fn(), getDrivers: jest.fn() },
}));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text>{name}</Text> };
});

const session = { idSesion: 7782, session_key: 7782, tipo: 'Carrera', estado: 'Finalizado', source: 'openf1' };
const meeting = { source: 'openf1', meeting_key: 1143, nombreCorto: 'GP controlado', sesiones: [session] };
const result = overrides => ({ session_key: 7782, meeting_key: 1143, driver_number: 81,
  position: 1, duration: 77.565, gap_to_leader: 0, ...overrides });
const navigation = { goBack: jest.fn(), navigate: jest.fn() };
function open(gp = meeting) {
  const view = render(<DetalleGPScreen route={{ params: { meeting: gp } }} navigation={navigation} />);
  fireEvent.press(screen.getByText('Carrera'));
  return view;
}
beforeEach(() => {
  jest.resetAllMocks();
  OpenF1Client.getSessionResults.mockResolvedValue([result()]);
  OpenF1Client.getDrivers.mockResolvedValue([{ session_key: 7782, driver_number: 81,
    full_name: 'Piloto de ensayo', team_name: 'Equipo de ensayo', team_colour: '123ABC' }]);
});

test('RF-04 conserva columnas, tiempos, diferencias y nombres publicados, sin resultados de demostración', async () => {
  open();
  expect(screen.getByText('POS')).toBeTruthy();
  expect(screen.getByText('PILOTO')).toBeTruthy();
  expect(screen.getByText('TIEMPO')).toBeTruthy();
  expect(screen.getByText('DIF')).toBeTruthy();
  expect(await screen.findByText('Piloto de ensayo')).toBeTruthy();
  expect(screen.getByText('77.565 s')).toBeTruthy();
  expect(screen.getByText('LÍDER')).toBeTruthy();
  expect(screen.getByText('Fuente: OpenF1 · sesión 7782')).toBeTruthy();
  expect(OpenF1Client.getSessionResults).toHaveBeenCalledWith(7782);
  expect(OpenF1Client.getDrivers).toHaveBeenCalledWith({ session_key: 7782 });
  expect(screen.queryByText(/Leclerc|1:31\.763|Tiempos y diferencias oficiales/)).toBeNull();
});

test.each([
  { source: 'jolpica', sesiones: [{ ...session, source: 'jolpica', idSesion: 'jolpica:2026:1:Race' }] },
  { sesiones: [{ ...session, session_key: undefined }] },
  { sesiones: [{ ...session, session_key: 'jolpica:2026:1' }] },
  { sesiones: [{ ...session, estado: 'Programado' }] },
])('no consulta OpenF1 sin identidad y estado compatibles: %p', overrides => {
  open({ ...meeting, ...overrides });
  expect(OpenF1Client.getSessionResults).not.toHaveBeenCalled();
  expect(screen.queryByText('Fuente: OpenF1 · sesión 7782')).toBeNull();
  expect(screen.getByText(/^Resultados.*no disponibles|^El horario publicado no confirma/)).toBeTruthy();
});

test.each([[result({ session_key: 9999 })], [result({ meeting_key: 9999 })], { data: [] }])(
  'rechaza resultados ajenos o una respuesta inválida: %p', async payload => {
    OpenF1Client.getSessionResults.mockResolvedValue(payload);
    open();
    expect(await screen.findByText(/Resultados no disponibles:/)).toBeTruthy();
    expect(OpenF1Client.getDrivers).not.toHaveBeenCalled();
    expect(screen.queryByText('77.565 s')).toBeNull();
  },
);

test.each([[], new Error('HTTP 404')])('una respuesta vacía o fallo no introduce filas ficticias: %p', async response => {
  if (response instanceof Error) OpenF1Client.getSessionResults.mockRejectedValue(response);
  else OpenF1Client.getSessionResults.mockResolvedValue(response);
  open();
  await waitFor(() => expect(screen.queryByText('Consultando resultados publicados...')).toBeNull());
  expect(screen.getByText(/^Resultados.*no disponibles/)).toBeTruthy();
  expect(screen.queryByText('77.565 s')).toBeNull();
});

test('conserva Q1/Q2/Q3, gaps por vueltas y desconocidos sin convertirlos en cero', async () => {
  OpenF1Client.getSessionResults.mockResolvedValue([
    result({ driver_number: 82, position: 2, duration: [78.5, null, 77.9], gap_to_leader: [0.2, null, 0.1] }),
    result({ duration: null, gap_to_leader: '+1 LAP' }),
  ]);
  OpenF1Client.getDrivers.mockRejectedValue(new Error('Metadatos no disponibles'));
  open();
  expect(await screen.findByText('78.500 s / — / 77.900 s')).toBeTruthy();
  expect(screen.getByText('+0.200 s / — / +0.100 s')).toBeTruthy();
  expect(screen.getByText('+1 LAP')).toBeTruthy();
  expect(screen.getByText('Piloto #81')).toBeTruthy();
  expect(screen.getByText('Piloto #82')).toBeTruthy();
});

test('una respuesta tardía no reaparece después de cerrar la tabla', async () => {
  let resolve;
  OpenF1Client.getSessionResults.mockImplementation(() => new Promise(done => { resolve = done; }));
  open();
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar información de sesión' }));
  await act(async () => { resolve([result()]); });
  expect(screen.queryByText('77.565 s')).toBeNull();
  expect(screen.queryByText('RESULTADOS: Carrera')).toBeNull();
  expect(OpenF1Client.getDrivers).not.toHaveBeenCalled();
});
