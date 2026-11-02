import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Header from '../../src/components/Header';

describe('Header component', () => {
  test('renderiza el título predeterminado F1FAN cuando no se proporciona título', () => {
    render(<Header />);
    expect(screen.getByText('F1FAN')).toBeTruthy();
  });

  test('renderiza el título y subtítulo personalizados cuando se suministran', () => {
    render(<Header title="Hola, Diego" subtitle="TEMPORADA 2024 • EN VIVO" />);
    expect(screen.getByText('Hola, Diego')).toBeTruthy();
    expect(screen.getByText('TEMPORADA 2024 • EN VIVO')).toBeTruthy();
  });

  test('no muestra subtítulo si es nulo o indefinido', () => {
    render(<Header title="Clasificación" />);
    expect(screen.getByText('Clasificación')).toBeTruthy();
    expect(screen.queryByText('TEMPORADA 2024 • EN VIVO')).toBeNull();
  });

  test('muestra el avatar de usuario con iniciales DM de forma predeterminada', () => {
    render(<Header title="Inicio" />);
    expect(screen.getByText('DM')).toBeTruthy();
  });

  test('oculta el avatar cuando showProfile es false', () => {
    render(<Header title="Detalle" showProfile={false} />);
    expect(screen.queryByText('DM')).toBeNull();
  });

  test('dispara el callback onProfilePress al presionar el avatar', () => {
    const onProfilePressMock = jest.fn();
    render(<Header title="Inicio" onProfilePress={onProfilePressMock} />);
    
    const avatarButton = screen.getByText('DM');
    fireEvent.press(avatarButton);

    expect(onProfilePressMock).toHaveBeenCalledTimes(1);
  });
});

