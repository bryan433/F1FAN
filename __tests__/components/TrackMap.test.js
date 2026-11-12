import React from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import TrackMap, { REAL_TRACK_MS_PER_POINT, TRACK_REVEAL_MS } from '../../src/components/TrackMap';

// No se simula useState ni el mapa: se observa la posición de sus marcadores renderizados.
function markerPosition(number) {
  let node = screen.getByText(number);
  while (node) {
    const style = StyleSheet.flatten(node.props.style);
    if (Number.isFinite(style?.left) && Number.isFinite(style?.top)) return { left: style.left, top: style.top };
    node = node.parent;
  }
  throw new Error(`Marcador ${number} sin posición renderizada`);
}

beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('anima ambos marcadores y vuelve al inicio después de recorrer el trazado de demostración', () => {
  render(<TrackMap isDemo={true} />);
  const first = markerPosition('63');
  const second = markerPosition('4');
  act(() => { jest.advanceTimersByTime(1200); });
  expect(markerPosition('63')).not.toEqual(first);
  expect(markerPosition('4')).not.toEqual(second);
  act(() => { jest.advanceTimersByTime(16 * 1200); });
  expect(markerPosition('63')).toEqual(first);
  expect(markerPosition('4')).toEqual(second);
});

test('el control de animación pausa, inicia y vuelve a pausar sin reiniciar las posiciones', () => {
  const { rerender } = render(<TrackMap circuitName="Circuito de prueba" isLive={false} isDemo={true} />);
  expect(screen.getByText('Circuito de prueba')).toBeTruthy();
  const stopped = markerPosition('63');
  act(() => { jest.advanceTimersByTime(2400); });
  expect(markerPosition('63')).toEqual(stopped);
  rerender(<TrackMap circuitName="Circuito de prueba" isLive={true} isDemo={true} />);
  act(() => { jest.advanceTimersByTime(1200); });
  const moving = markerPosition('63');
  expect(moving).not.toEqual(stopped);
  rerender(<TrackMap circuitName="Circuito de prueba" isLive={false} isDemo={true} />);
  act(() => { jest.advanceTimersByTime(2400); });
  expect(markerPosition('63')).toEqual(moving);
});

test('al desmontar deja de mantener un temporizador de animación activo', () => {
  const initial = jest.getTimerCount();
  const { unmount } = render(<TrackMap isLive={true} isDemo={true} />);
  expect(jest.getTimerCount()).toBe(initial + 1);
  unmount();
  expect(jest.getTimerCount()).toBe(initial);
});

describe('con un trazado real (points)', () => {
  // Puntos ya normalizados al lienzo: un óvalo centrado.
  const ovalo = cantidad => Array.from({ length: cantidad }, (_, i) => ({
    x: Math.round((140 + 110 * Math.cos((2 * Math.PI * i) / cantidad)) * 10) / 10,
    y: Math.round((100 + 70 * Math.sin((2 * Math.PI * i) / cantidad)) * 10) / 10,
  }));
  const segmentos = () => screen.UNSAFE_root
    .findAll(nodo => nodo.type === 'View' && /deg$/.test(StyleSheet.flatten(nodo.props.style)?.transform?.[0]?.rotate ?? ''));
  const opacidad = nodo => StyleSheet.flatten(nodo.props.style).opacity;
  const nodoMarcador = () => screen.getByTestId('track-reference-marker');
  // El marcador se posiciona solo con translateX/translateY: se devuelve su centro en el lienzo.
  const marcador = () => {
    const { left, top, width, height, transform } = StyleSheet.flatten(nodoMarcador().props.style);
    const { translateX, translateY } = Object.assign({}, ...transform);
    return { x: left + translateX + width / 2, y: top + translateY + height / 2 };
  };
  const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // Avanza el reloj hasta completar la aparición del trazado (más un cuadro de margen).
  const completarAparicion = () => act(() => { jest.advanceTimersByTime(TRACK_REVEAL_MS + 20); });

  test('dibuja el trazado muestreado a 150 segmentos, sin pines ni autos de la demostración', () => {
    render(<TrackMap circuitName="SAKHIR • OPENF1" isDemo points={ovalo(400)} markerLabel="#1" />);
    expect(segmentos()).toHaveLength(150);
    expect(screen.getByText('SAKHIR • OPENF1')).toBeTruthy();
    expect(screen.getByText('TRAZADO REAL')).toBeTruthy();
    expect(screen.getByText('Trazado real · OpenF1')).toBeTruthy();
    expect(screen.getByText('Auto #1 · animación simulada')).toBeTruthy();
    ['T7', 'T14', '63', '4', 'V12 SIMULADA', 'NOR #4 (P1 DEMO)', 'RUS #63 (P3 DEMO)', 'DRS DE EJEMPLO']
      .forEach(texto => expect(screen.queryByText(texto)).toBeNull());
  });

  test('el trazado aparece dibujándose en el sentido de la vuelta y el marcador surge al completarlo', () => {
    render(<TrackMap isDemo points={ovalo(20)} />);
    expect(segmentos()).toHaveLength(19);
    const opacidades = () => segmentos().map(opacidad);
    expect(opacidades().every(valor => valor === 0)).toBe(true);
    expect(opacidad(nodoMarcador())).toBe(0);

    act(() => { jest.advanceTimersByTime(TRACK_REVEAL_MS / 3); });
    const parcial = opacidades();
    // Los primeros tramos ya están, los últimos aún no: la opacidad nunca crece hacia el final.
    expect(parcial[0]).toBe(1);
    expect(parcial[parcial.length - 1]).toBe(0);
    expect(parcial).toEqual([...parcial].sort((a, b) => b - a));
    expect(opacidad(nodoMarcador())).toBe(0);

    completarAparicion();
    expect(opacidades().every(valor => valor === 1)).toBe(true);
    expect(opacidad(nodoMarcador())).toBe(1);
  });

  test('el marcador recorre el trazado de forma continua, sin saltos, y vuelve al inicio cada vuelta', () => {
    const puntos = ovalo(20);
    render(<TrackMap isDemo points={puntos} />);
    expect(marcador()).toEqual(puntos[0]);
    // Mientras el trazado aparece, el marcador espera en la salida.
    act(() => { jest.advanceTimersByTime(TRACK_REVEAL_MS / 2); });
    expect(marcador()).toEqual(puntos[0]);
    completarAparicion();

    // Medio paso después está entre el punto 0 y el 1, sobre el tramo, no en un punto muestreado.
    expect(marcador()).toEqual(puntos[0]);
    act(() => { jest.advanceTimersByTime(REAL_TRACK_MS_PER_POINT / 2); });
    const enCamino = marcador();
    const tramo = distancia(puntos[0], puntos[1]);
    expect(distancia(enCamino, puntos[0])).toBeGreaterThan(tramo * 0.25);
    expect(distancia(enCamino, puntos[1])).toBeGreaterThan(tramo * 0.25);
    expect(distancia(puntos[0], enCamino) + distancia(enCamino, puntos[1])).toBeCloseTo(tramo, 5);

    // En cada cuadro avanza una fracción pequeña del tramo: movimiento continuo.
    let anterior = marcador();
    for (let cuadro = 0; cuadro < 20; cuadro += 1) {
      act(() => { jest.advanceTimersByTime(16); });
      const actual = marcador();
      expect(distancia(actual, anterior)).toBeLessThan(tramo / 5);
      anterior = actual;
    }

    // Una vuelta (19 tramos) más un cuadro después vuelve a pasar por el mismo lugar.
    act(() => { jest.advanceTimersByTime(19 * REAL_TRACK_MS_PER_POINT + 16 - 20 * 16); });
    expect(distancia(marcador(), enCamino)).toBeLessThan(tramo / 5);
    expect(screen.getByText('Animación simulada')).toBeTruthy();
  });

  test('pausado no avanza, al reanudar sigue desde donde quedó y al desmontar no deja temporizadores', () => {
    const initial = jest.getTimerCount();
    const { rerender, unmount } = render(<TrackMap isLive={false} isDemo points={ovalo(30)} />);
    completarAparicion();
    const quieto = marcador();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(marcador()).toEqual(quieto);
    expect(jest.getTimerCount()).toBe(initial);

    rerender(<TrackMap isLive isDemo points={ovalo(30)} />);
    expect(jest.getTimerCount()).toBe(initial + 1);
    act(() => { jest.advanceTimersByTime(3 * REAL_TRACK_MS_PER_POINT); });
    const avanzado = marcador();
    expect(distancia(avanzado, quieto)).toBeGreaterThan(0);

    rerender(<TrackMap isLive={false} isDemo points={ovalo(30)} />);
    act(() => { jest.advanceTimersByTime(1000); });
    expect(marcador()).toEqual(avanzado);

    rerender(<TrackMap isLive isDemo points={ovalo(30)} />);
    act(() => { jest.advanceTimersByTime(32); });
    // Retoma desde la pausa, no desde la salida.
    expect(distancia(marcador(), avanzado)).toBeLessThan(distancia(marcador(), quieto));
    unmount();
    expect(jest.getTimerCount()).toBe(initial);
  });

  test('con "Reducir movimiento" el trazado aparece completo de inmediato', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(<TrackMap isDemo points={ovalo(20)} />);
    await act(async () => {});
    expect(segmentos().every(nodo => opacidad(nodo) === 1)).toBe(true);
    expect(opacidad(nodoMarcador())).toBe(1);
  });
});
