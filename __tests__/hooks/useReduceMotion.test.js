import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import useReduceMotion from '../../src/hooks/useReduceMotion';

function Muestra({ id }) {
  const reducir = useReduceMotion();
  return <Text testID={id}>{reducir ? 'reducido' : 'completo'}</Text>;
}
const estado = id => screen.getByTestId(id).props.children;

afterEach(() => { jest.restoreAllMocks(); });

test('consulta la preferencia una sola vez, la comparte entre componentes y sigue sus cambios', async () => {
  const remove = jest.fn();
  let avisarCambio;
  const alta = jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((_evento, oyente) => {
    avisarCambio = oyente;
    return { remove };
  });
  const consulta = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);

  const { rerender, unmount } = render(<><Muestra id="a" /><Muestra id="b" /></>);
  await act(async () => {});
  expect(consulta).toHaveBeenCalledTimes(1);
  expect(alta).toHaveBeenCalledTimes(1);
  expect(alta).toHaveBeenCalledWith('reduceMotionChanged', expect.any(Function));
  expect([estado('a'), estado('b')]).toEqual(['completo', 'completo']);

  act(() => { avisarCambio(true); });
  expect([estado('a'), estado('b')]).toEqual(['reducido', 'reducido']);

  // Un componente que aparece después la conoce desde su primer cuadro.
  rerender(<><Muestra id="a" /><Muestra id="b" /><Muestra id="c" /></>);
  expect(estado('c')).toBe('reducido');
  expect(consulta).toHaveBeenCalledTimes(1);

  act(() => { avisarCambio(false); });
  expect([estado('a'), estado('b'), estado('c')]).toEqual(['completo', 'completo', 'completo']);

  unmount();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('si la plataforma no responde, asume movimiento completo', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('sin servicio'));
  render(<Muestra id="a" />);
  await act(async () => {});
  expect(estado('a')).toBe('completo');
});
