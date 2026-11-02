import React from 'react';
import { Alert, Animated, View } from 'react-native';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ClasificacionScreen from '../../src/screens/ClasificacionScreen';
import FavoritosScreen from '../../src/screens/FavoritosScreen';
import MasScreen from '../../src/screens/MasScreen';
import LocalStorageManager from '../../src/storage/LocalStorageManager';
import { driverStanding, secondDriverStanding, standingsResponse, okStandings, mockStandingsFetch } from '../fixtures/jolpicaStandings';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text testID={`icon-${name}`}>{name}</Text> };
});

const originalFetch = global.fetch;
const driverKey = '@f1fan_favorite_driver';
const collectionKey = '@f1fan_favorite_drivers';
const teamKey = '@f1fan_favorite_teams';
function navigation() {
  const handlers = {};
  return { navigate: jest.fn(), addListener: jest.fn((event, callback) => {
    handlers[event] = callback;
    return jest.fn(() => { delete handlers[event]; });
  }), focus: () => handlers.focus() };
}
async function favorites(nav = navigation()) {
  const view = render(<FavoritosScreen navigation={nav} />);
  await waitFor(() => expect(view.queryByText('Cargando favoritos...')).toBeNull());
  return view;
}
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(teamKey, '[]');
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-02T12:00:00Z'));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing);
  global.fetch = mockStandingsFetch();
});
afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test('Más mantiene el acceso registrado a Favoritos sin afirmar que Russell esté seleccionado', () => {
  const nav = navigation();
  render(<MasScreen navigation={nav} />);
  fireEvent.press(screen.getByText('Favoritos'));
  expect(nav.navigate).toHaveBeenCalledWith('Favoritos');
  expect(screen.queryByText('Russell #63, Mercedes')).toBeNull();
});

test('sin preferencias no inventa a Russell, respeta equipos vacíos y Añadir abre la ruta real Tablas', async () => {
  const nav = navigation();
  await favorites(nav);
  expect(screen.getByText('No tienes pilotos favoritos guardados.')).toBeTruthy();
  expect(screen.getByText('No tienes escuderías favoritas guardadas.')).toBeTruthy();
  expect(screen.queryByText('George Russell')).toBeNull();
  fireEvent.press(screen.getByLabelText('Añadir piloto favorito'));
  expect(nav.navigate).toHaveBeenCalledWith('MainTabs', { screen: 'Tablas' });
  fireEvent.press(screen.getByLabelText('Elegir escuderías favoritas'));
  expect(nav.navigate).toHaveBeenLastCalledWith('MainTabs', { screen: 'Tablas' });
});

test('la selección de Clasificación aparece en Favoritos con identidad real, sin datos del catálogo simulado', async () => {
  const classification = render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getAllByTestId('icon-star-outline')[0]);
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(2));
  classification.unmount();
  await favorites();
  expect(screen.getByText('Ana Prueba')).toBeTruthy();
  expect(screen.queryByText(/Oscar Piastri|George Russell|\d+ pts/)).toBeNull();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([81]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('eliminar desde Favoritos desmarca Clasificación al recuperar foco y conserva sus estadísticas', async () => {
  const nav = navigation();
  const classification = render(<ClasificacionScreen navigation={nav} />);
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getAllByTestId('icon-star-outline')[0]);
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(2));
  const saved = await favorites();
  fireEvent.press(screen.getByLabelText('Quitar piloto favorito Ana Prueba'));
  await screen.findByText('No tienes pilotos favoritos guardados.');
  saved.unmount();
  await act(async () => { await nav.focus(); });
  expect(classification.queryAllByTestId('icon-star')).toHaveLength(0);
  expect(classification.getByText('125.5')).toBeTruthy();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('seleccionar dos pilotos conserva ambas estrellas y persiste todos los favoritos tras remontar', async () => {
  const view = render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getAllByTestId('icon-star-outline')[0]);
  await waitFor(() => expect(view.queryAllByTestId('icon-star')).toHaveLength(2));
  fireEvent.press(view.getByTestId('icon-star-outline'));
  await waitFor(() => expect(Alert.alert).toHaveBeenLastCalledWith('Agregado a favoritos', expect.stringContaining('Bruno')));
  expect(view.getAllByTestId('icon-star')).toHaveLength(4);
  view.unmount();
  const first = await favorites();
  expect(screen.getByText('Bruno Ensayo')).toBeTruthy();
  expect(screen.getByText('Ana Prueba')).toBeTruthy();
  first.unmount();
  await favorites();
  expect(screen.getByText('Bruno Ensayo')).toBeTruthy();
  expect(screen.getByText('Ana Prueba')).toBeTruthy();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([82, 81]);
});

test('Favoritos relee cambios persistidos al volver a una pantalla que sigue montada', async () => {
  const nav = navigation();
  await favorites(nav);
  await act(async () => { await LocalStorageManager.guardarFavorito('piloto_ensayo'); });
  await act(async () => { await nav.focus(); });
  expect(screen.getByText('Bruno Ensayo')).toBeTruthy();
  await act(async () => { await LocalStorageManager.eliminarFavorito('piloto_ensayo'); });
  await act(async () => { await nav.focus(); });
  expect(screen.getByText('No tienes pilotos favoritos guardados.')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test.each(['81', 'piloto_prueba', 'ANA'])('el favorito antiguo %s se reconoce y se desmarca con la misma identidad en Clasificación', async raw => {
  await AsyncStorage.setItem(driverKey, raw);
  render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('A. PRUEBA');
  expect(screen.getAllByTestId('icon-star')).toHaveLength(2);
  fireEvent.press(screen.getAllByTestId('icon-star')[1]);
  await waitFor(() => expect(screen.queryAllByTestId('icon-star')).toHaveLength(0));
  expect(await AsyncStorage.getItem(collectionKey)).toBe('[]');
});

test('una lista antigua conserva favoritos desconocidos y elimina todos los alias de un piloto sin duplicarlo', async () => {
  const raw = JSON.stringify([81, '81', 'piloto_prueba', 9999]);
  await AsyncStorage.setItem(driverKey, raw);
  await favorites();
  expect(screen.getAllByText('Ana Prueba')).toHaveLength(1);
  expect(screen.getByText('Piloto guardado (9999)')).toBeTruthy();
  expect(await AsyncStorage.getItem(driverKey)).toBe(raw);
  fireEvent.press(screen.getByLabelText('Quitar piloto favorito Ana Prueba'));
  await waitFor(() => expect(screen.queryByText('Ana Prueba')).toBeNull());
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([9999]);
  expect(screen.getByText('Piloto guardado (9999)')).toBeTruthy();
});

test('las escuderías seleccionadas en Clasificación se muestran en Favoritos y su eliminación se sincroniza al volver', async () => {
  const nav = navigation();
  const classification = render(<ClasificacionScreen navigation={nav} />);
  await screen.findByText('A. PRUEBA');
  fireEvent.press(screen.getByText('CONSTRUCTORES'));
  fireEvent.press(screen.getByLabelText('Marcar escudería favorita Equipo de prueba'));
  await waitFor(() => expect(classification.getByLabelText('Quitar escudería favorita Equipo de prueba')).toBeTruthy());
  const saved = await favorites();
  expect(screen.getByText('Equipo de prueba')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Quitar escudería favorita Equipo de prueba'));
  await screen.findByText('No tienes escuderías favoritas guardadas.');
  saved.unmount();
  await act(async () => { await nav.focus(); });
  expect(classification.getByLabelText('Marcar escudería favorita Equipo de prueba')).toBeTruthy();
  expect(await LocalStorageManager.obtenerEscuderiasFavoritas()).toEqual([]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('conserva equipos guardados, elimina el último y no los repone al recargar', async () => {
  await AsyncStorage.setItem(teamKey, '["mercedes","mclaren"]');
  const first = await favorites();
  expect(screen.getByText('Mercedes')).toBeTruthy();
  expect(screen.getByText('McLaren')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Quitar escudería favorita Mercedes'));
  await waitFor(() => expect(screen.queryByText('Mercedes')).toBeNull());
  fireEvent.press(screen.getByLabelText('Quitar escudería favorita McLaren'));
  await screen.findByText('No tienes escuderías favoritas guardadas.');
  first.unmount();
  await favorites();
  expect(screen.queryByText('Mercedes')).toBeNull();
  expect(screen.queryByText('McLaren')).toBeNull();
  expect(await AsyncStorage.getItem(teamKey)).toBe('[]');
});

test('si falla la clasificación conserva la identidad guardada y permite eliminarla, sin estadísticas ficticias', async () => {
  await LocalStorageManager.guardarFavorito(99, { driverId: 'retirado', nombre: 'Piloto', apellido: 'Guardado', numero: 99 });
  global.fetch.mockResolvedValue({ ok: false, status: 404 });
  await favorites();
  expect(screen.getByText('Piloto Guardado')).toBeTruthy();
  expect(screen.getByText(/No se pudo actualizar la información/)).toBeTruthy();
  expect(screen.queryByText(/\d+ pts|George Russell/)).toBeNull();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([99]);
  fireEvent.press(screen.getByLabelText('Quitar piloto favorito Piloto Guardado'));
  await screen.findByText('No tienes pilotos favoritos guardados.');
});

test('si falla la eliminación persistente no oculta el favorito ni confirma una eliminación falsa', async () => {
  await LocalStorageManager.guardarFavorito('piloto_prueba');
  await favorites();
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Error de almacenamiento'));
  fireEvent.press(screen.getByLabelText('Quitar piloto favorito Ana Prueba'));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo eliminar el favorito', expect.any(String)));
  expect(screen.getByText('Ana Prueba')).toBeTruthy();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual(['piloto_prueba']);
});

test('una preferencia cambiada durante la carga de la tabla prevalece sobre el estado anterior', async () => {
  let resume;
  const originalMock = global.fetch;
  global.fetch = jest.fn(url => url.includes('driverstandings') ? new Promise(resolve => { resume = resolve; }) : originalMock(url));
  const nav = navigation();
  render(<FavoritosScreen navigation={nav} />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  await act(async () => { await LocalStorageManager.guardarFavorito('piloto_ensayo'); });
  await act(async () => {
    resume(okStandings(standingsResponse('driver', [driverStanding(), secondDriverStanding()])));
    await nav.focus();
  });
  expect(screen.getByText('Bruno Ensayo')).toBeTruthy();
});

test.each([false, true])('conserva la identidad de Verstappen al cambiar de número; metadata guardada: %s', async withIdentity => {
  const max = secondDriverStanding({ Driver: { driverId: 'max_verstappen', permanentNumber: '33', code: 'VER', givenName: 'Max', familyName: 'Verstappen' } });
  global.fetch = mockStandingsFetch({ drivers: [driverStanding(), max] });
  if (withIdentity) {
    await LocalStorageManager.guardarFavorito(1, { driverId: 'max_verstappen' });
    global.fetch = mockStandingsFetch({ drivers: [driverStanding({ Driver: { driverId: 'norris', permanentNumber: '1', code: 'NOR', givenName: 'Lando', familyName: 'Norris' } }), max] });
  } else await AsyncStorage.setItem(driverKey, '1');
  const classification = render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('M. VERSTAPPEN');
  fireEvent.press(screen.getAllByTestId('icon-star')[1]);
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Favorito eliminado', expect.stringContaining('Max Verstappen')));
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(0));
  expect(await AsyncStorage.getItem(collectionKey)).toBe('[]');
});

test('la flecha accesible de Favoritos vuelve una vez si hay historial y conserva las preferencias', async () => {
  await LocalStorageManager.guardarFavorito('piloto_prueba');
  const nav = { ...navigation(), canGoBack: jest.fn(() => true), goBack: jest.fn() };
  await favorites(nav);
  const stored = await AsyncStorage.getItem(collectionKey);
  fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
  expect(nav.canGoBack).toHaveBeenCalledTimes(1);
  expect(nav.goBack).toHaveBeenCalledTimes(1);
  expect(nav.navigate).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(collectionKey)).toBe(stored);
});

test('Favoritos abierto sin historial regresa a la ruta registrada MainTabs → Más', async () => {
  const nav = { ...navigation(), canGoBack: jest.fn(() => false), goBack: jest.fn() };
  await favorites(nav);
  fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
  expect(nav.goBack).not.toHaveBeenCalled();
  expect(nav.navigate).toHaveBeenCalledTimes(1);
  expect(nav.navigate).toHaveBeenCalledWith('MainTabs', { screen: 'Más' });
});

test('si no se puede consultar el historial utiliza Más en lugar de ejecutar un regreso no confirmado', async () => {
  const nav = { ...navigation(), goBack: jest.fn() };
  await favorites(nav);
  fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
  expect(nav.goBack).not.toHaveBeenCalled();
  expect(nav.navigate).toHaveBeenCalledWith('MainTabs', { screen: 'Más' });
});

test('eliminar uno de varios favoritos actualiza su estrella al regresar con la flecha sin depender de focus', async () => {
  const classification = render(<ClasificacionScreen navigation={navigation()} />);
  await screen.findByText('A. PRUEBA');
  fireEvent.press(classification.getAllByTestId('icon-star-outline')[0]);
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(2));
  fireEvent.press(classification.getByTestId('icon-star-outline'));
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(4));

  const nav = { ...navigation(), canGoBack: () => true, goBack: jest.fn() };
  const saved = await favorites(nav);
  fireEvent.press(saved.getByLabelText('Quitar piloto favorito Ana Prueba'));
  await waitFor(() => expect(saved.queryByText('Ana Prueba')).toBeNull());
  expect(saved.getByText('Bruno Ensayo')).toBeTruthy();
  fireEvent.press(saved.getByRole('button', { name: 'Volver' }));
  expect(nav.goBack).toHaveBeenCalledTimes(1);
  saved.unmount();
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(2));
  expect(classification.getByTestId('icon-star-outline')).toBeTruthy();
  expect(classification.getByText('125.5')).toBeTruthy();
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([82]);
  expect(global.fetch).toHaveBeenCalledTimes(2);

  classification.unmount();
  const reloaded = render(<ClasificacionScreen navigation={navigation()} />);
  await reloaded.findByText('A. PRUEBA');
  expect(reloaded.getAllByTestId('icon-star')).toHaveLength(2);
  await favorites();
  expect(screen.queryByText('Ana Prueba')).toBeNull();
  expect(screen.getByText('Bruno Ensayo')).toBeTruthy();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('las estrellas agregan y quitan solamente ese piloto y notifican a Favoritos ya montado sin consultar HTTP', async () => {
  // Un único árbol conserva ambas pantallas montadas, como el navegador de la app.
  render(<>
    <View testID="classification"><ClasificacionScreen navigation={navigation()} /></View>
    <View testID="favorites"><FavoritosScreen navigation={navigation()} /></View>
  </>);
  const classification = within(screen.getByTestId('classification'));
  const saved = within(screen.getByTestId('favorites'));
  await classification.findByText('A. PRUEBA');
  await waitFor(() => expect(saved.queryByText('Cargando favoritos...')).toBeNull());
  fireEvent.press(classification.getAllByTestId('icon-star-outline')[0]);
  await saved.findByText('Ana Prueba');
  fireEvent.press(classification.getByTestId('icon-star-outline'));
  await saved.findByText('Bruno Ensayo');
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(4));
  fireEvent.press(classification.getAllByTestId('icon-star')[1]);
  await waitFor(() => expect(saved.queryByText('Ana Prueba')).toBeNull());
  expect(saved.getByText('Bruno Ensayo')).toBeTruthy();
  await waitFor(() => expect(classification.queryAllByTestId('icon-star')).toHaveLength(2));
  expect(await LocalStorageManager.obtenerFavoritos()).toEqual([82]);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('la eliminación de escuderías notifica a Clasificación sin un evento focus', async () => {
  const classification = render(<ClasificacionScreen navigation={navigation()} />);
  await classification.findByText('A. PRUEBA');
  fireEvent.press(classification.getByText('CONSTRUCTORES'));
  fireEvent.press(classification.getByLabelText('Marcar escudería favorita Equipo de prueba'));
  await classification.findByLabelText('Quitar escudería favorita Equipo de prueba');
  const saved = await favorites();
  fireEvent.press(saved.getByLabelText('Quitar escudería favorita Equipo de prueba'));
  await classification.findByLabelText('Marcar escudería favorita Equipo de prueba');
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
