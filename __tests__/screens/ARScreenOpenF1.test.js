import React from 'react';
import { Alert, Animated } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import ARScreen from '../../src/screens/ARScreen';
import { getTrackOutline, TRACK_ERROR_MESSAGES, TRACK_PROGRESS } from '../../src/services/OpenF1TrackService';
import { meetingOpenF1 } from '../fixtures/openf1';
import { diferido, navegacionFalsa } from '../integridad-usabilidad/helpers/entorno';
import { problemasDeControles, objetivosPequenos, textosPequenos } from '../integridad-usabilidad/helpers/arbolAccesible';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text>{name}</Text> };
});
// Solo se reemplaza la consulta del trazado; los mensajes de error son los reales del servicio.
jest.mock('../../src/services/OpenF1TrackService', () => ({
  ...jest.requireActual('../../src/services/OpenF1TrackService'),
  getTrackOutline: jest.fn(),
}));

const TITULO_DEMO = 'SIMULACIÓN AR — DATOS DE DEMOSTRACIÓN';
const EXPLICACION_DEMO = 'Marina Bay es un circuito de demostración independiente del GP seleccionado. Pilotos, vueltas, posiciones y velocidades son simulados; no son datos oficiales.';
const ETIQUETA_REAL = 'Trazado real de OpenF1 (vuelta 2, auto #1). Animación y telemetría simuladas.';
const meeting = meetingOpenF1();
const trazado = {
  points: Array.from({ length: 40 }, (_, i) => ({ x: 140 + 100 * Math.cos(i / 6.4), y: 100 + 70 * Math.sin(i / 6.4) })),
  sessionKey: 9472, sessionName: 'Race', driverNumber: 1, lapNumber: 2, rawPointCount: 40, source: 'openf1',
};

const CON_MEETING = { params: { meeting } };
const abrir = route => {
  const navigation = navegacionFalsa();
  render(<ARScreen navigation={navigation} route={route} />);
  return navigation;
};
const colocarCircuito = () => fireEvent.press(screen.getByRole('button', { name: 'COLOCAR CIRCUITO' }));

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  // Animaciones deterministas: terminan en el acto (el recorrido del marcador se prueba en TrackMap).
  const AnimatedMock = jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default;
  ['timing', 'spring', 'loop'].forEach(tipo => jest.spyOn(Animated, tipo).mockImplementation(AnimatedMock[tipo]));
  getTrackOutline.mockReset();
});
afterEach(() => { jest.restoreAllMocks(); });

const PASOS = ['Buscando la carrera', 'Eligiendo una vuelta', 'Dibujando el trazado'];
const estadoDePasos = () => PASOS.map(texto => screen.getByLabelText(new RegExp(`^${texto}, `)).props.accessibilityLabel);

test('con un Gran Premio de OpenF1 muestra la carga y luego identifica el trazado real y lo simulado', async () => {
  const consulta = diferido();
  getTrackOutline.mockReturnValue(consulta.promesa);
  abrir(CON_MEETING);

  expect(getTrackOutline).toHaveBeenCalledWith(meeting, expect.objectContaining({ onProgress: expect.any(Function) }));
  expect(screen.getByRole('header', { name: 'SIMULACIÓN AR — BAHRAIN GRAND PRIX' })).toBeTruthy();
  expect(screen.getByLabelText('Cargando trazado de OpenF1')).toBeTruthy();
  expect(screen.queryByText(TITULO_DEMO)).toBeNull();
  expect(screen.queryByText(EXPLICACION_DEMO)).toBeNull();

  await act(async () => { consulta.resolver(trazado); });
  expect(screen.getByText(ETIQUETA_REAL)).toBeTruthy();
  expect(screen.queryByLabelText('Cargando trazado de OpenF1')).toBeNull();

  colocarCircuito();
  expect(screen.getByText('AR • BAHRAIN GRAND PRIX')).toBeTruthy();
  expect(screen.getByText('SAKHIR • OPENF1')).toBeTruthy();
  expect(screen.getByText('TRAZADO REAL')).toBeTruthy();
  expect(screen.getByText('Trazado real · OpenF1')).toBeTruthy();
  expect(screen.getByText('Auto #1 · animación simulada')).toBeTruthy();
  expect(screen.getByText('AUTO #1 · VUELTA 2')).toBeTruthy();
  expect(screen.getByText('Sesión: Race')).toBeTruthy();
  expect(screen.getByText(ETIQUETA_REAL)).toBeTruthy();
  // Con un GP real no se muestran posiciones, pilotos ni velocidades inventadas de la demostración.
  ['CLASIFICACIÓN SIMULADA', 'RUSSELL #63 · DEMO', '294.06', 'DEMO AR • MARINA BAY', 'MARINA BAY • DEMOSTRACIÓN', 'T7']
    .forEach(texto => expect(screen.queryByText(texto)).toBeNull());
  expect(screen.queryByText(/AR LIVE|EN VIVO|TIEMPO REAL/)).toBeNull();
});

test('mientras carga muestra paso a paso qué hace: buscar la carrera, elegir una vuelta y dibujar el trazado', async () => {
  const consulta = diferido();
  let avisar;
  getTrackOutline.mockImplementation((_meeting, { onProgress }) => {
    avisar = onProgress;
    return consulta.promesa;
  });
  abrir(CON_MEETING);

  expect(screen.getByText('Buscando la carrera')).toBeTruthy();
  expect(estadoDePasos()).toEqual(['Buscando la carrera, en curso', 'Eligiendo una vuelta, pendiente', 'Dibujando el trazado, pendiente']);
  act(() => { avisar(TRACK_PROGRESS.SESSION); });
  expect(estadoDePasos()).toEqual(['Buscando la carrera, en curso', 'Eligiendo una vuelta, pendiente', 'Dibujando el trazado, pendiente']);
  act(() => { avisar(TRACK_PROGRESS.LAP); });
  expect(estadoDePasos()).toEqual(['Buscando la carrera, listo', 'Eligiendo una vuelta, en curso', 'Dibujando el trazado, pendiente']);
  act(() => { avisar(TRACK_PROGRESS.OUTLINE); });
  expect(estadoDePasos()).toEqual(['Buscando la carrera, listo', 'Eligiendo una vuelta, listo', 'Dibujando el trazado, en curso']);

  await act(async () => { consulta.resolver(trazado); });
  expect(screen.queryByLabelText('Cargando trazado de OpenF1')).toBeNull();
  PASOS.forEach(texto => expect(screen.queryByText(texto)).toBeNull());
  expect(screen.getByText(ETIQUETA_REAL)).toBeTruthy();
});

test('un aviso de progreso de una consulta anterior no altera la carga del reintento', async () => {
  const avisos = [];
  const segunda = diferido();
  getTrackOutline
    .mockImplementationOnce((_meeting, { onProgress }) => {
      avisos.push(onProgress);
      return Promise.reject(Object.assign(new Error(TRACK_ERROR_MESSAGES.NO_LAPS), { code: 'NO_LAPS' }));
    })
    .mockImplementationOnce((_meeting, { onProgress }) => {
      avisos.push(onProgress);
      return segunda.promesa;
    });
  abrir(CON_MEETING);
  await screen.findByText(TRACK_ERROR_MESSAGES.NO_LAPS);
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

  act(() => { avisos[0](TRACK_PROGRESS.OUTLINE); });
  expect(estadoDePasos()[0]).toBe('Buscando la carrera, en curso');
  await act(async () => { segunda.resolver(trazado); });
  expect(screen.getByText(ETIQUETA_REAL)).toBeTruthy();
});

test('modo real: controles con rol y nombre, objetivos de 44 pt y textos de 12 px o más', async () => {
  getTrackOutline.mockResolvedValue(trazado);
  abrir(CON_MEETING);
  await screen.findByText(ETIQUETA_REAL);
  const revisar = () => {
    const raiz = screen.UNSAFE_root;
    expect(problemasDeControles(raiz)).toEqual([]);
    expect(objetivosPequenos(raiz)).toEqual([]);
    expect(textosPequenos(raiz)).toEqual([]);
  };
  revisar();
  colocarCircuito();
  expect(screen.getByText('AUTO #1 · VUELTA 2')).toBeTruthy();
  revisar();
});

test('si OpenF1 no tiene datos lo anuncia con rol alert y "Reintentar" vuelve a consultar', async () => {
  getTrackOutline
    .mockRejectedValueOnce(Object.assign(new Error(TRACK_ERROR_MESSAGES.NOT_STARTED), { code: 'NOT_STARTED' }))
    .mockResolvedValueOnce(trazado);
  abrir(CON_MEETING);

  const alerta = await screen.findByText(TRACK_ERROR_MESSAGES.NOT_STARTED);
  expect(alerta.props.accessibilityRole).toBe('alert');
  colocarCircuito();
  expect(screen.getByText('Trazado no disponible.')).toBeTruthy();
  expect(screen.queryByText('TRAZADO REAL')).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText(ETIQUETA_REAL)).toBeTruthy();
  expect(getTrackOutline).toHaveBeenCalledTimes(2);
  expect(screen.queryByText(TRACK_ERROR_MESSAGES.NOT_STARTED)).toBeNull();
  expect(screen.getByText('TRAZADO REAL')).toBeTruthy();
});

test('un error inesperado sin código se muestra con un mensaje genérico en español', async () => {
  getTrackOutline.mockRejectedValueOnce(new TypeError('undefined is not a function'));
  abrir(CON_MEETING);
  const alerta = await screen.findByText('No se pudo cargar el trazado real desde OpenF1.');
  expect(alerta.props.accessibilityRole).toBe('alert');
  expect(screen.queryByText(/undefined is not a function/)).toBeNull();
});

test.each([
  ['sin parámetros', undefined],
  ['con route vacío', {}],
  ['con un GP de Jolpica sin meeting_key', { params: { meeting: { nombreCorto: 'Otro GP', season: '2026', round: '7' } } }],
])('%s mantiene la demostración de Marina Bay sin consultar OpenF1', (_caso, route) => {
  abrir(route);
  expect(screen.getByRole('header', { name: TITULO_DEMO })).toBeTruthy();
  expect(screen.getByText(EXPLICACION_DEMO)).toBeTruthy();
  colocarCircuito();
  expect(screen.getByText('DEMO AR • MARINA BAY')).toBeTruthy();
  expect(screen.getByText('MARINA BAY • DEMOSTRACIÓN')).toBeTruthy();
  expect(screen.getByText('RUSSELL #63 · DEMO')).toBeTruthy();
  expect(getTrackOutline).not.toHaveBeenCalled();
});

test('al cerrar la pantalla durante la grabación simulada se cancela su temporizador', () => {
  jest.useFakeTimers();
  try {
    const { unmount } = render(<ARScreen navigation={navegacionFalsa()} />);
    colocarCircuito();
    fireEvent.press(screen.getByRole('button', { name: /Simular clip AR/ }));
    expect(Alert.alert).toHaveBeenCalledWith('Grabación simulada', expect.any(String));
    unmount();
    act(() => { jest.advanceTimersByTime(3000); });
    expect(Alert.alert).not.toHaveBeenCalledWith('Simulación finalizada', expect.anything());
  } finally {
    jest.useRealTimers();
  }
});
