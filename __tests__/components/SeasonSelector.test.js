import React from 'react';
import { Modal } from 'react-native';
import { render, screen, fireEvent, within } from '@testing-library/react-native';
import SeasonSelector from '../../src/components/SeasonSelector';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { Ionicons: ({ name }) => <Text>{name}</Text> };
});

function openSelector(overrides = {}) {
  const props = {
    selectedSeason: '2026', seasons: ['2026', '2025', '1950'], visible: false,
    onOpen: jest.fn(), onClose: jest.fn(), onSelect: jest.fn(), onRetry: jest.fn(),
    ...overrides,
  };
  const view = render(<SeasonSelector {...props} />);
  return { ...view, props };
}

test('el control muestra la selección y solicita abrir sin renderizar opciones cerradas', () => {
  const { props } = openSelector();
  fireEvent.press(screen.getByRole('button', { name: 'Seleccionar temporada del calendario' }));
  expect(props.onOpen).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Temporada 2026')).toBeTruthy();
  expect(screen.queryByLabelText('Temporadas disponibles')).toBeNull();
});

test('marca la opción actual y comunica la temporada elegida sin inventar años', () => {
  const { props } = openSelector({ visible: true });
  expect(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2026' }).props.accessibilityState.selected).toBe(true);
  expect(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2025' }).props.accessibilityState.selected).toBe(false);
  expect(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 1950' })).toBeTruthy();
  expect(within(screen.getByLabelText('Temporadas disponibles')).queryByRole('button', { name: 'Temporada 2024' })).toBeNull();
  fireEvent.press(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2025' }));
  expect(props.onSelect).toHaveBeenCalledWith('2025');
});

test('cerrar y el regreso del modal solicitan cancelar sin cambiar la selección', () => {
  const { props } = openSelector({ visible: true });
  fireEvent.press(screen.getByRole('button', { name: 'Cerrar selector de temporadas' }));
  screen.UNSAFE_getByType(Modal).props.onRequestClose();
  expect(props.onClose).toHaveBeenCalledTimes(2);
  expect(props.onSelect).not.toHaveBeenCalled();
});

test('durante la carga informa el estado y oculta las opciones anteriores', () => {
  openSelector({ visible: true, loading: true });
  expect(screen.getByText('Cargando temporadas...')).toBeTruthy();
  expect(screen.getByLabelText('Cargando temporadas')).toBeTruthy();
  expect(within(screen.getByLabelText('Temporadas disponibles')).queryByRole('button', { name: 'Temporada 2025' })).toBeNull();
});

test('un error informa y permite reintentar sin ofrecer opciones como vigentes', () => {
  const { props } = openSelector({ visible: true, error: 'No se pudieron cargar las temporadas.' });
  expect(screen.getByRole('alert')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar temporadas' }));
  expect(props.onRetry).toHaveBeenCalledTimes(1);
  expect(within(screen.getByLabelText('Temporadas disponibles')).queryByRole('button', { name: 'Temporada 2025' })).toBeNull();
});

test('una copia con advertencia sigue permitiendo seleccionar y reintentar', () => {
  const { props } = openSelector({ visible: true, warning: 'Mostrando la última copia guardada.' });
  expect(screen.getByText('Mostrando la última copia guardada.')).toBeTruthy();
  fireEvent.press(within(screen.getByLabelText('Temporadas disponibles')).getByRole('button', { name: 'Temporada 2025' }));
  fireEvent.press(screen.getByRole('button', { name: 'Reintentar temporadas' }));
  expect(props.onSelect).toHaveBeenCalledWith('2025');
  expect(props.onRetry).toHaveBeenCalledTimes(1);
});

test('una lista vacía informa ausencia sin fabricar el año seleccionado como disponible', () => {
  openSelector({ visible: true, seasons: [] });
  expect(screen.getByText('No hay temporadas disponibles.')).toBeTruthy();
  expect(within(screen.getByLabelText('Temporadas disponibles')).queryByRole('button', { name: 'Temporada 2026' })).toBeNull();
});
