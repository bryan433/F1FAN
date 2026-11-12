import { DECELERATION_RATE, SPRINGS, project, rubberband, shouldDismissSheet, springConfig } from '../../src/utils/motion';

const razonDeAmortiguamiento = ({ stiffness, damping, mass }) => damping / (2 * Math.sqrt(stiffness * mass));

describe('springConfig: de respuesta y amortiguamiento (Apple) a rigidez y amortiguamiento (Animated)', () => {
  test('respuesta de 0,3 s críticamente amortiguada: k = (2π / 0,3)², c = 2√k', () => {
    const resorte = springConfig({ response: 0.3 });
    expect(resorte.mass).toBe(1);
    expect(resorte.stiffness).toBeCloseTo(438.649, 3);
    expect(resorte.damping).toBeCloseTo(41.888, 3);
    expect(razonDeAmortiguamiento(resorte)).toBe(1);
  });

  test('conserva la razón de amortiguamiento pedida y escala con la masa', () => {
    const resorte = springConfig({ response: 0.4, dampingRatio: 0.8, mass: 2 });
    expect(resorte.stiffness).toBeCloseTo(((2 * Math.PI) / 0.4) ** 2 * 2, 9);
    expect(razonDeAmortiguamiento(resorte)).toBeCloseTo(0.8, 12);
  });

  test('una respuesta menor da un resorte más rígido (más rápido) y los valores por defecto son 0,35 s y ζ = 1', () => {
    expect(springConfig({ response: 0.15 }).stiffness).toBeGreaterThan(springConfig({ response: 0.3 }).stiffness);
    expect(springConfig()).toEqual(springConfig({ response: 0.35, dampingRatio: 1, mass: 1 }));
  });

  test('todos los resortes de la aplicación son críticamente amortiguados (sin rebote)', () => {
    Object.values(SPRINGS).forEach(resorte => expect(razonDeAmortiguamiento(resorte)).toBe(1));
  });
});

describe('project: distancia que recorre un gesto soltado (decaimiento exponencial de Apple)', () => {
  test('con la tasa normal de iOS (0,998), 1000 px/s recorren 499 px', () => {
    expect(DECELERATION_RATE).toBe(0.998);
    expect(project(1000)).toBeCloseTo(499, 9);
    expect(project(0)).toBe(0);
  });

  test('es lineal en la velocidad, conserva el signo y una tasa menor frena antes', () => {
    expect(project(-500)).toBeCloseTo(-249.5, 9);
    expect(project(2000)).toBeCloseTo(2 * project(1000), 9);
    expect(project(1000, 0.99)).toBeCloseTo(99, 9);
  });
});

describe('rubberband: resistencia progresiva más allá de un límite', () => {
  test('aplica la fórmula (x · d · c) / (d + c · |x|) con c = 0,55 por defecto', () => {
    expect(rubberband(100, 400)).toBeCloseTo((100 * 400 * 0.55) / (400 + 55), 12);
    expect(rubberband(100, 400, 0.3)).toBeCloseTo((100 * 400 * 0.3) / (400 + 30), 12);
  });

  test('conserva el signo, sigue menos que el dedo y cada vez menos cuanto más se pasa', () => {
    expect(rubberband(0, 400)).toBe(0);
    expect(rubberband(-100, 400)).toBeCloseTo(-rubberband(100, 400), 12);
    expect(rubberband(50, 400)).toBeLessThan(50);
    const tramo1 = rubberband(100, 400) - rubberband(0, 400);
    const tramo2 = rubberband(200, 400) - rubberband(100, 400);
    expect(tramo2).toBeLessThan(tramo1);
    // Nunca supera la dimensión de referencia.
    expect(rubberband(1e9, 400)).toBeLessThan(400);
  });

  test('sin dimensión no permite pasar el límite', () => {
    expect(rubberband(80, 0)).toBe(0);
    expect(rubberband(80, undefined)).toBe(0);
  });
});

describe('shouldDismissSheet: cerrar según dónde se detendría la hoja', () => {
  test.each([
    ['quieta por debajo de la mitad', { position: 150, velocity: 0, height: 400 }, false],
    ['quieta pasada la mitad', { position: 250, velocity: 0, height: 400 }, true],
    ['lanzada hacia abajo apenas movida', { position: 20, velocity: 1000, height: 400 }, true],
    ['lanzada hacia arriba pasada la mitad', { position: 250, velocity: -800, height: 400 }, false],
    ['empujada lento hacia abajo', { position: 120, velocity: 100, height: 400 }, false],
  ])('%s', (_caso, gesto, esperado) => {
    expect(shouldDismissSheet(gesto)).toBe(esperado);
  });

  test('sin alto medido decide por el sentido del gesto', () => {
    expect(shouldDismissSheet({ position: 10, velocity: 50, height: 0 })).toBe(true);
    expect(shouldDismissSheet({ position: 10, velocity: -50, height: 0 })).toBe(false);
  });
});
