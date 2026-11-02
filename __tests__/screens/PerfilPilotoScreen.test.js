import React from 'react';
import { Alert, Animated } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PerfilPilotoScreen from '../../src/screens/PerfilPilotoScreen';
import LocalStorageManager from '../../src/storage/LocalStorageManager';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text>{name}</Text> };
});
const collectionKey = '@f1fan_favorite_drivers';
const legacyKey = '@f1fan_favorite_driver';
const driver = { idPiloto: 81, numero: 81, driverId: 'piloto_ensayo', nombre: 'Ana', apellido: 'Ensayo',
  source: 'jolpica', season: '2026', puntos: 0, victorias: 0, podios: null, posicionCampeonato: 2,
  urlFoto: 'https://example.com/piloto.png' };
const nav = { goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) };
function open(pilot = driver) {
  return render(<PerfilPilotoScreen route={{ params: { driver: pilot } }} navigation={nav} />);
}
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(Animated, 'timing').mockImplementation(jest.requireActual('react-native/Libraries/Animated/AnimatedMock').default.timing);
});
afterEach(() => jest.restoreAllMocks());

test('RF-05 conserva la imagen recibida y no inventa podios, victorias ni historial para Jolpica', async () => {
  open();
  await act(async () => {});
  expect(screen.getByLabelText('Foto de Ana Ensayo').props.source).toEqual({ uri: driver.urlFoto });
  expect(screen.getByText('RENDIMIENTO EN EL CAMPEONATO 2026')).toBeTruthy();
  expect(screen.getAllByText('0')).toHaveLength(2);
  expect(screen.getByText('No disponible')).toBeTruthy();
  expect(screen.getByText('Historial reciente no disponible en esta clasificación.')).toBeTruthy();
  expect(screen.queryByText(/Singapur|2024|DATOS SIMULADOS/)).toBeNull();
});

test('agregar desde Perfil conserva otros favoritos, preferencias y la identidad estable', async () => {
  await LocalStorageManager.guardarFavorito(63, { driverId: 'russell' });
  await AsyncStorage.setItem('@f1fan_user_settings', '{"unidades":"mph"}');
  open();
  await act(async () => {});
  fireEvent.press(screen.getByRole('button', { name: 'Añadir piloto a favoritos' }));
  await screen.findByText('EN TUS FAVORITOS');
  const saved = await LocalStorageManager.obtenerDetalleFavoritos();
  expect(saved).toEqual(expect.arrayContaining([
    expect.objectContaining({ driverId: 'russell', idPiloto: 63 }),
    expect.objectContaining({ driverId: driver.driverId, idPiloto: 81 }),
  ]));
  expect(saved).toHaveLength(2);
  expect(await AsyncStorage.getItem('@f1fan_user_settings')).toBe('{"unidades":"mph"}');
});

test('migrar y quitar desde Perfil conserva el respaldo legado y no restaura un favorito eliminado', async () => {
  await AsyncStorage.setItem(legacyKey, '81');
  const view = open();
  await screen.findByText('EN TUS FAVORITOS');
  expect(await AsyncStorage.getItem(legacyKey)).toBe('81');
  fireEvent.press(screen.getByRole('button', { name: 'Quitar piloto de favoritos' }));
  await screen.findByRole('button', { name: 'Añadir piloto a favoritos' });
  view.unmount();
  open();
  await act(async () => {});
  expect(await AsyncStorage.getItem(collectionKey)).toBe('[]');
  expect(await AsyncStorage.getItem(legacyKey)).toBe('81');
  expect(screen.queryByText('EN TUS FAVORITOS')).toBeNull();
});

test('eliminar con dorsal cambiado usa driverId y conserva al piloto que ahora tiene ese dorsal', async () => {
  await LocalStorageManager.guardarFavorito(1, { driverId: driver.driverId });
  await LocalStorageManager.guardarFavorito(1, { driverId: 'otro_piloto' });
  open();
  await screen.findByText('EN TUS FAVORITOS');
  fireEvent.press(screen.getByRole('button', { name: 'Quitar piloto de favoritos' }));
  await screen.findByRole('button', { name: 'Añadir piloto a favoritos' });
  expect(await LocalStorageManager.obtenerDetalleFavoritos()).toEqual([expect.objectContaining({ driverId: 'otro_piloto' })]);
});

test('las suscripciones actualizan Perfil sin foco y no cambian su foto ni estadísticas', async () => {
  open();
  await act(async () => {});
  await act(async () => { await LocalStorageManager.guardarFavorito(81, driver); });
  await screen.findByText('EN TUS FAVORITOS');
  await act(async () => { await LocalStorageManager.eliminarFavorito(driver.driverId); });
  await screen.findByRole('button', { name: 'Añadir piloto a favoritos' });
  expect(screen.getByText('P2')).toBeTruthy();
  expect(screen.getByLabelText('Foto de Ana Ensayo').props.source.uri).toBe(driver.urlFoto);
});

test('un fallo al persistir no marca éxito ni altera favoritos existentes', async () => {
  await LocalStorageManager.guardarFavorito(63, { driverId: 'russell' });
  const before = await AsyncStorage.getItem(collectionKey);
  jest.spyOn(LocalStorageManager, 'guardarFavorito').mockResolvedValue(false);
  open();
  await act(async () => {});
  fireEvent.press(screen.getByRole('button', { name: 'Añadir piloto a favoritos' }));
  await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo guardar el favorito', expect.any(String)));
  expect(screen.queryByText('EN TUS FAVORITOS')).toBeNull();
  expect(await AsyncStorage.getItem(collectionKey)).toBe(before);
});

test('los datos del catálogo legado se identifican como demostración y conservan su pantalla', async () => {
  render(<PerfilPilotoScreen route={{ params: { driverId: 63 } }} navigation={nav} />);
  await act(async () => {});
  expect(screen.getByText('PERFIL DE DEMOSTRACIÓN — ESTADÍSTICAS SIMULADAS')).toBeTruthy();
  expect(screen.getByText('HISTORIAL DE DEMOSTRACIÓN — DATOS SIMULADOS')).toBeTruthy();
  expect(screen.getByText('Singapur')).toBeTruthy();
});
