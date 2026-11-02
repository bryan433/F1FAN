import React from 'react';
import { render, screen } from '@testing-library/react-native';
import OfflineBanner from '../../src/components/OfflineBanner';

describe('OfflineBanner', () => {
  test('oculta, muestra y vuelve a ocultar la advertencia según visible', () => {
    const message = 'Modo sin conexión - Mostrando datos guardados en caché';
    const { rerender } = render(<OfflineBanner />);

    expect(screen.queryByText(message)).toBeNull();

    rerender(<OfflineBanner visible={true} />);

    expect(screen.getByText(message)).toBeTruthy();

    rerender(<OfflineBanner visible={false} />);

    expect(screen.queryByText(message)).toBeNull();
  });
});
