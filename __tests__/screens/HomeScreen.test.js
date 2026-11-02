import React from 'react';
import { Animated, ScrollView } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import HomeScreen from '../../src/screens/HomeScreen';
import F1DataService from '../../src/services/F1DataService';
import { adaptSeasonCalendar, unavailableNextRace } from '../../src/services/JolpicaCalendarAdapter';
import { calendarRace } from '../fixtures/calendar';

jest.mock('../../src/services/F1DataService', () => ({
  getNextRace: jest.fn(),
  subscribeConnectionChange: jest.fn(),
  isOfflineMode: false,
}));

const now = Date.parse('2026-11-01T12:00:00Z');
const unsubscribe = jest.fn();

function nextRace(overrides = {}) {
  return adaptSeasonCalendar([calendarRace(overrides)], '2026', now)[0];
}

function openHome() {
  const navigation = { navigate: jest.fn() };
  return { ...render(<HomeScreen navigation={navigation} />), navigation };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(now);
  jest.spyOn(Animated, 'timing').mockImplementation(
    jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing,
  );
  F1DataService.getNextRace.mockReset().mockResolvedValue(nextRace());
  F1DataService.subscribeConnectionChange.mockReturnValue(unsubscribe);
  F1DataService.isOfflineMode = false;
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('carga el próximo GP, temporada, circuito y sesiones del servicio sin textos de Singapur', async () => {
  openHome();
  expect(screen.getByText('Consultando próximo Gran Premio...')).toBeTruthy();

  expect(await screen.findByText('GP de prueba')).toBeTruthy();
  expect(screen.getByText('TEMPORADA 2026')).toBeTruthy();
  expect(screen.getByText('Circuito de prueba')).toBeTruthy();
  expect(screen.getByLabelText('Cuenta regresiva para la carrera')).toBeTruthy();
  expect(screen.getByText('Practice 1')).toBeTruthy();
  expect(screen.getByText('Qualifying')).toBeTruthy();
  expect(screen.getByText('Carrera')).toBeTruthy();
  expect(screen.queryByText(/Singapur|Marina Bay|2024/i)).toBeNull();
  expect(screen.queryByText('EN VIVO')).toBeNull();
  expect(screen.queryByText(/^VUELTA /)).toBeNull();
  expect(F1DataService.getNextRace).toHaveBeenCalledTimes(1);
});

test('muestra ausencia explícita sin GP, contador ni sesiones de respaldo', async () => {
  F1DataService.getNextRace.mockResolvedValue(unavailableNextRace('sin_proxima_carrera', 2026));
  openHome();

  expect(await screen.findByText('Sin próxima carrera publicada')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
  expect(screen.queryByLabelText('Cuenta regresiva para la carrera')).toBeNull();
  expect(screen.queryByText('SESIONES DEL FIN DE SEMANA')).toBeNull();
});

test('distingue calendario incompleto de ausencia de carreras publicadas', async () => {
  F1DataService.getNextRace.mockResolvedValue(unavailableNextRace('calendario_incompleto', 2026));
  openHome();

  expect(await screen.findByText('Calendario incompleto')).toBeTruthy();
  expect(screen.queryByText('Sin próxima carrera publicada')).toBeNull();
  expect(screen.queryByLabelText('Cuenta regresiva para la carrera')).toBeNull();
});

test('un GP con hora desconocida muestra información y evita un contador ficticio', async () => {
  F1DataService.getNextRace.mockResolvedValue(nextRace({ time: undefined }));
  openHome();

  await screen.findByText('GP de prueba');
  expect(screen.getByText('Hora de carrera por confirmar. Cuenta regresiva no disponible.')).toBeTruthy();
  expect(screen.getByText('2026-11-08 (fecha UTC) Hora por confirmar')).toBeTruthy();
  expect(screen.queryByLabelText('Cuenta regresiva para la carrera')).toBeNull();
  expect(screen.queryByText(/^VUELTA /)).toBeNull();
});

test('un error de consulta muestra reintento y no afirma que hay datos en caché', async () => {
  F1DataService.getNextRace.mockRejectedValueOnce(new Error('Sin conexión'));
  openHome();

  expect(await screen.findByText('No se pudo consultar el próximo Gran Premio.')).toBeTruthy();
  expect(screen.queryByLabelText('Cuenta regresiva para la carrera')).toBeNull();
  expect(screen.queryByText(/Mostrando datos guardados en caché/)).toBeNull();

  fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('GP de prueba')).toBeTruthy();
  expect(screen.queryByText('No se pudo consultar el próximo Gran Premio.')).toBeNull();
});

test('al fallar una actualización retira el GP anterior en vez de mantenerlo como próximo', async () => {
  F1DataService.getNextRace.mockResolvedValueOnce(nextRace()).mockRejectedValueOnce(new Error('Sin conexión'));
  openHome();
  await screen.findByText('GP de prueba');

  await act(async () => {
    await screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh();
  });

  expect(screen.getByText('No se pudo consultar el próximo Gran Premio.')).toBeTruthy();
  expect(screen.queryByText('GP de prueba')).toBeNull();
  expect(screen.UNSAFE_getByType(ScrollView).props.refreshControl.props.refreshing).toBe(false);
});

test('conserva el aviso de la última copia devuelta por el servicio', async () => {
  const race = nextRace();
  race.warning = 'No se pudo actualizar con Jolpica. Mostrando la última copia guardada.';
  F1DataService.getNextRace.mockResolvedValue(race);
  F1DataService.isOfflineMode = true;
  openHome();
  await screen.findByText('GP de prueba');
  expect(screen.getByText(race.warning)).toBeTruthy();
});

test('sin sesiones publicadas no recupera las prácticas simuladas', async () => {
  const race = nextRace();
  race.sesiones = [];
  F1DataService.getNextRace.mockResolvedValue(race);
  openHome();
  expect(await screen.findByText('No hay sesiones publicadas para este GP.')).toBeTruthy();
  expect(screen.queryByText('Practice 2')).toBeNull();
});

test('utiliza las rutas registradas para calendario, detalle, recursos y accesos rápidos', async () => {
  const race = nextRace();
  F1DataService.getNextRace.mockResolvedValue(race);
  const { navigation } = openHome();
  await screen.findByText('GP de prueba');

  fireEvent.press(screen.getByText('+ Calendario'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Calendario');
  fireEvent.press(screen.getByText('Ver detalle del GP'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('DetalleGP', { meeting: race });
  fireEvent.press(screen.getByText('Practice 1'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('DetalleGP', { meeting: race });
  fireEvent.press(screen.getByText('Explora los recursos de F1Fan'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Más');
  fireEvent.press(screen.getByText('Comparador'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Comparador');
  fireEvent.press(screen.getByText('Ver Circuito en RA'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('RealidadAumentada');
  fireEvent.press(screen.getByText('DM'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Perfil');
});

test('solo ofrece En Vivo cuando una sesión trae confirmación y no inventa vueltas', async () => {
  const race = nextRace();
  Object.assign(race.sesiones[0], { estado: 'En curso', esLive: true, vueltaActual: null });
  F1DataService.getNextRace.mockResolvedValue(race);
  const { navigation } = openHome();
  await screen.findByText('GP de prueba');
  expect(screen.getByText('SESIÓN CONFIRMADA EN CURSO')).toBeTruthy();
  expect(screen.queryByText(/^VUELTA /)).toBeNull();
  fireEvent.press(screen.getByText('ABRIR EN VIVO'));
  expect(navigation.navigate).toHaveBeenLastCalledWith('En Vivo');
  fireEvent.press(screen.getAllByText('Practice 1')[1]);
  expect(navigation.navigate).toHaveBeenLastCalledWith('En Vivo');
});

test('al desmontar elimina la suscripción y descarta una consulta pendiente', async () => {
  let finish;
  F1DataService.getNextRace.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { unmount } = openHome();
  unmount();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  await act(async () => { finish(nextRace()); });
});
