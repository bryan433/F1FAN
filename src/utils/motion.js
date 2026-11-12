/**
 * Utilidades de movimiento para interfaces fluidas (resortes, impulso y resistencia en bordes),
 * basadas en las charlas de diseño de Apple y traducidas a React Native Animated.
 * Las funciones son puras: reciben números y devuelven números.
 */
import { Platform } from 'react-native';

// react-native-web no tiene driver nativo de animación: allí las animaciones corren en JS.
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';

// Tasa de desaceleración del desplazamiento normal de iOS (UIScrollView.DecelerationRate.normal).
export const DECELERATION_RATE = 0.998;

/**
 * Traduce los parámetros de diseño de Apple a la física de Animated.spring.
 * - response: segundos que tarda el valor en alcanzar el destino (no es una duración fija).
 * - dampingRatio: 1 = críticamente amortiguado (llega sin rebotar); menor que 1 rebota.
 * Rigidez k = (2π / response)² · m; amortiguamiento c = 2 · ζ · √(k · m).
 */
export function springConfig({ response = 0.35, dampingRatio = 1, mass = 1 } = {}) {
  const stiffness = ((2 * Math.PI) / response) ** 2 * mass;
  const damping = dampingRatio * 2 * Math.sqrt(stiffness * mass);
  return { stiffness, damping, mass };
}

// Resortes de la aplicación: críticamente amortiguados, sin rebote.
export const SPRINGS = {
  press: springConfig({ response: 0.15 }), // Al presionar: casi inmediato.
  release: springConfig({ response: 0.3 }), // Al soltar: vuelve con suavidad.
  sheet: springConfig({ response: 0.3 }), // Hojas inferiores.
  move: springConfig({ response: 0.35 }), // Reposicionar indicadores.
};

/**
 * Distancia (px) que recorre un gesto soltado a `velocity` px/s antes de detenerse.
 * Es la función de proyección de impulso de Apple (decaimiento exponencial), no v²/2a.
 */
export function project(velocity, decelerationRate = DECELERATION_RATE) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Resistencia progresiva al arrastrar más allá de un límite: cuanto más se pasa, menos sigue
 * al dedo. Conserva el signo de `overshoot`; con `dimension` 0 no permite pasar el límite.
 */
export function rubberband(overshoot, dimension, constant = 0.55) {
  if (!(dimension > 0)) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Decide si una hoja inferior se cierra al soltarla: proyecta dónde se detendría con la
 * velocidad del gesto y la cierra si ese punto oculta más de la mitad de la hoja.
 * @param {{position:number, velocity:number, height:number}} gesto
 *   position: desplazamiento actual hacia abajo (px, 0 = abierta);
 *   velocity: velocidad al soltar (px/s, positiva hacia abajo); height: alto de la hoja (px).
 */
export function shouldDismissSheet({ position, velocity, height }) {
  if (!(height > 0)) return velocity > 0;
  return position + project(velocity) > height / 2;
}
