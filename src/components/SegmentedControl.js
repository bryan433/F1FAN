import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';
import PressableScale from './PressableScale';
import useReduceMotion from '../hooks/useReduceMotion';
import { SPRINGS } from '../utils/motion';

const RELLENO = 2;

/**
 * Control segmentado con un indicador que se desliza hasta la opción elegida.
 * El indicador usa un resorte interrumpible: si se elige otra opción mientras se mueve, parte
 * desde donde está y conserva su velocidad (por eso corre en JS: el resorte de Animated hereda
 * la velocidad del resorte anterior solo con el driver JS). Con "Reducir movimiento" salta.
 * @param {{options: Array<{value:any, label:string, accessibilityLabel?:string}>, value:any, onChange:Function}} props
 */
export default function SegmentedControl({ options, value, onChange, style, testID }) {
  const reducir = useReduceMotion();
  const indice = Math.max(0, options.findIndex(opcion => opcion.value === value));
  const posicion = useRef(new Animated.Value(indice)).current; // en unidades de segmento
  const [ancho, setAncho] = useState(0);
  const primeraVez = useRef(true);

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (reducir) {
      posicion.setValue(indice);
      return;
    }
    Animated.spring(posicion, { toValue: indice, ...SPRINGS.move, useNativeDriver: false }).start();
  }, [indice]); // eslint-disable-line react-hooks/exhaustive-deps

  const anchoSegmento = ancho > 0 ? (ancho - RELLENO * 2) / options.length : 0;

  return (
    <View
      testID={testID}
      style={[styles.contenedor, style]}
      onLayout={evento => setAncho(evento.nativeEvent.layout.width)}
    >
      {anchoSegmento > 0 && (
        <Animated.View
          testID={testID ? `${testID}-indicador` : undefined}
          pointerEvents="none"
          style={[styles.indicador, { width: anchoSegmento, transform: [{ translateX: Animated.multiply(posicion, anchoSegmento) }] }]}
        />
      )}
      {options.map(opcion => {
        const activa = opcion.value === value;
        return (
          <PressableScale
            key={String(opcion.value)}
            accessibilityRole="button"
            accessibilityLabel={opcion.accessibilityLabel ?? opcion.label}
            accessibilityState={{ selected: activa }}
            style={styles.segmento}
            onPress={() => { if (!activa) onChange(opcion.value); }}
          >
            <Text style={[styles.texto, activa && styles.textoActivo]}>{opcion.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    padding: RELLENO,
    borderRadius: 12,
    backgroundColor: 'rgba(118, 118, 128, 0.24)',
  },
  indicador: {
    position: 'absolute',
    top: RELLENO,
    bottom: RELLENO,
    left: RELLENO,
    borderRadius: 10,
    backgroundColor: Colors.primaryRed,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmento: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  textoActivo: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
