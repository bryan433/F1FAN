
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoadingScreen from '../../src/components/LoadingScreen';

describe('LoadingScreen', () => {

  // TEST 1: Mensaje personalizado
  test('muestra el mensaje de carga personalizado', () => {
    render(<LoadingScreen message="Cargando calendario..." />);

    expect(screen.getByText('Cargando calendario...')).toBeTruthy();
  });

  // TEST 2: Mensaje predeterminado
  test('muestra el mensaje predeterminado', () => {
    render(<LoadingScreen />);

    expect(screen.getByText('Cargando datos de F1...')).toBeTruthy();
  });

});
