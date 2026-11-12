import React, { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import useReduceMotion from '../hooks/useReduceMotion';
import { SPRINGS, USE_NATIVE_DRIVER } from '../utils/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PRESSED_SCALE = 0.97;
// Con "Reducir movimiento" la respuesta es un leve cambio de opacidad en lugar de escalar.
export const PRESSED_OPACITY = 0.6;
const FUNDIDO_SALIDA_MS = 150;

/**
 * Pressable que responde en el instante en que se toca (onPressIn), no al soltar: se encoge
 * con un resorte críticamente amortiguado y vuelve al levantar el dedo. Reenvía todas las
 * props de Pressable (rol, etiqueta y estado accesibles, hitSlop, testID, disabled, onPress).
 * `style` debe ser un estilo estático (no una función de `pressed`).
 */
export default function PressableScale({
  style,
  onPressIn,
  onPressOut,
  scaleTo = PRESSED_SCALE,
  disabled,
  children,
  activeOpacity: _activeOpacity, // Se ignora: permite reemplazar TouchableOpacity sin cambios.
  ...rest
}) {
  const reducir = useReduceMotion();
  const escala = useRef(new Animated.Value(1)).current;
  const opacidad = useRef(new Animated.Value(1)).current;

  // Respeta una opacidad propia del estilo (p. ej. un control atenuado).
  const opacidadBase = StyleSheet.flatten(style)?.opacity ?? 1;
  const opacidadFinal = useMemo(
    () => (opacidadBase === 1 ? opacidad : Animated.multiply(opacidad, opacidadBase)),
    [opacidad, opacidadBase],
  );

  const responder = presionado => {
    if (reducir) {
      Animated.timing(opacidad, {
        toValue: presionado ? PRESSED_OPACITY : 1,
        duration: presionado ? 0 : FUNDIDO_SALIDA_MS,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
      return;
    }
    // Sin detener la animación previa: el resorte parte del valor en pantalla.
    Animated.spring(escala, {
      toValue: presionado ? scaleTo : 1,
      ...(presionado ? SPRINGS.press : SPRINGS.release),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={evento => {
        responder(true);
        onPressIn?.(evento);
      }}
      onPressOut={evento => {
        responder(false);
        onPressOut?.(evento);
      }}
      style={[style, { opacity: opacidadFinal, transform: [{ scale: escala }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
