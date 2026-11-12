import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import PressableScale from './PressableScale';
import useReduceMotion from '../hooks/useReduceMotion';
import { SPRINGS, USE_NATIVE_DRIVER, rubberband, shouldDismissSheet } from '../utils/motion';

// Movimiento mínimo (px) antes de reconocer un arrastre: los toques siguen llegando a los botones.
const UMBRAL_ARRASTRE = 10;
// La hoja cerrada queda por completo fuera de la pantalla, incluida su sombra.
const MARGEN_CIERRE = 32;
const FUNDIDO_MS = 200;
const VOLVER_SIN_MOVIMIENTO_MS = 150;
// El resorte da por terminado el movimiento por debajo de medio píxel: la cola invisible
// no retiene la pantalla (el fondo sigue bloqueando toques hasta que la hoja termina de salir).
const REPOSO = { restDisplacementThreshold: 0.5, restSpeedThreshold: 5 };
// Alto supuesto mientras la hoja aún no se mide (solo afecta a la resistencia y al fondo).
const ALTO_SUPUESTO = 360;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const altoVentana = () => Dimensions.get('window').height;

/**
 * Hoja inferior modal con fondo atenuado. Sube desde abajo con un resorte críticamente
 * amortiguado y se cierra hacia abajo por el mismo camino. Se puede arrastrar 1:1 (respetando
 * dónde se tomó), atrapar a mitad de una animación y lanzar: al soltar se proyecta el impulso
 * para decidir si se cierra y el resorte hereda la velocidad del dedo. Hacia arriba ofrece
 * resistencia progresiva. Con "Reducir movimiento" aparece y desaparece con un fundido.
 *
 * Se abre con `visible`; se cierra con su botón, el fondo, el arrastre o el botón Atrás de
 * Android, y avisa con `onDismiss` cuando terminó de salir. Quien la usa debe ocultar su
 * contenido de fondo a los lectores de pantalla mientras `visible` sea true.
 *
 * `capturarAtras` (true por defecto) decide si la hoja abierta intercepta el botón Atrás.
 * Debe ser false mientras su pantalla no tenga el foco (p. ej. otra pantalla de la pila
 * encima), para que la pulsación llegue a la pantalla visible.
 */
export default function BottomSheet({ visible, onDismiss, title, children, closeLabel = 'Cerrar detalle', testID = 'hoja-inferior', capturarAtras = true }) {
  const reducir = useReduceMotion();
  const [montada, setMontada] = useState(false);
  const [alto, setAlto] = useState(0);
  const desplazamiento = useRef(new Animated.Value(altoVentana())).current; // px hacia abajo; 0 = abierta
  const opacidad = useRef(new Animated.Value(1)).current;
  const valorActual = useRef(altoVentana()); // valor en pantalla del desplazamiento
  const altoRef = useRef(0);
  const oculta = useRef(true);
  const animando = useRef(false);
  const cerrando = useRef(false);
  const inicioArrastre = useRef(0);
  // El PanResponder y las animaciones leen siempre la versión vigente de estas props.
  const reducirRef = useRef(reducir);
  reducirRef.current = reducir;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const id = desplazamiento.addListener(({ value }) => { valorActual.current = value; });
    return () => desplazamiento.removeListener(id);
  }, [desplazamiento]);

  const posicionCerrada = () => (altoRef.current || altoVentana()) + MARGEN_CIERRE;

  const resorte = (toValue, velocity, alTerminar) => {
    animando.current = true;
    // Sin detener la animación previa: el resorte parte del valor en pantalla.
    Animated.spring(desplazamiento, { toValue, velocity, ...SPRINGS.sheet, ...REPOSO, useNativeDriver: USE_NATIVE_DRIVER })
      .start(({ finished }) => {
        if (!finished) return; // Interrumpida: el dedo o una nueva animación tomaron el control.
        animando.current = false;
        alTerminar?.();
      });
  };

  const fundido = (valor, toValue, duration, easing, alTerminar) => {
    animando.current = true;
    Animated.timing(valor, { toValue, duration, easing, useNativeDriver: USE_NATIVE_DRIVER })
      .start(({ finished }) => {
        if (!finished) return;
        animando.current = false;
        alTerminar?.();
      });
  };

  const terminarCierre = () => {
    cerrando.current = false;
    oculta.current = true;
    setMontada(false);
    onDismissRef.current?.();
  };

  const abrir = () => {
    cerrando.current = false;
    const desdeOculta = oculta.current;
    oculta.current = false;
    if (reducirRef.current) {
      if (desdeOculta) opacidad.setValue(0);
      desplazamiento.setValue(0);
      fundido(opacidad, 1, FUNDIDO_MS, Easing.out(Easing.quad));
      return;
    }
    opacidad.setValue(1);
    resorte(0, 0);
  };

  /** Cierra hacia abajo; `velocity` (px/s) es la del dedo cuando el cierre viene de un gesto. */
  const cerrar = (velocity = 0) => {
    if (cerrando.current) return;
    cerrando.current = true;
    if (reducirRef.current) {
      fundido(opacidad, 0, FUNDIDO_MS, Easing.in(Easing.quad), () => {
        desplazamiento.setValue(posicionCerrada());
        terminarCierre();
      });
      return;
    }
    resorte(posicionCerrada(), velocity, terminarCierre);
  };

  const volver = velocity => {
    if (reducirRef.current) fundido(desplazamiento, 0, VOLVER_SIN_MOVIMIENTO_MS, Easing.out(Easing.quad));
    else resorte(0, velocity);
  };

  const acciones = useRef({});
  acciones.current = { cerrar, volver };

  const gestos = useMemo(() => {
    const soltar = (_evento, gesto) => {
      const velocidad = gesto.vy * 1000; // px/ms → px/s
      const altoHoja = altoRef.current || ALTO_SUPUESTO;
      if (shouldDismissSheet({ position: valorActual.current, velocity: velocidad, height: altoHoja })) {
        acciones.current.cerrar(velocidad);
      } else {
        acciones.current.volver(velocidad);
      }
    };
    return PanResponder.create({
      // Si la hoja se está moviendo, el primer toque la atrapa donde está.
      onStartShouldSetPanResponderCapture: () => animando.current,
      onMoveShouldSetPanResponderCapture: (_evento, gesto) => Math.abs(gesto.dy) > UMBRAL_ARRASTRE && Math.abs(gesto.dy) > Math.abs(gesto.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_evento, gesto) => {
        animando.current = false;
        cerrando.current = false;
        opacidad.stopAnimation();
        opacidad.setValue(1);
        // Se sigue desde el valor en pantalla, sin saltar al punto donde está el dedo.
        inicioArrastre.current = valorActual.current - gesto.dy;
        desplazamiento.stopAnimation(valor => {
          if (typeof valor !== 'number') return;
          valorActual.current = valor;
          inicioArrastre.current = valor - gesto.dy;
        });
      },
      onPanResponderMove: (_evento, gesto) => {
        const bruto = inicioArrastre.current + gesto.dy;
        // Por encima de la posición abierta la hoja resiste cada vez más.
        desplazamiento.setValue(bruto >= 0 ? bruto : rubberband(bruto, altoRef.current || ALTO_SUPUESTO));
      },
      onPanResponderRelease: soltar,
      onPanResponderTerminate: soltar,
    });
  }, [desplazamiento, opacidad]);

  useEffect(() => {
    if (visible) {
      // Si ya está en pantalla (p. ej. se reabre mientras baja) sube desde donde está;
      // si no, se monta y sube en cuanto existe.
      if (montada) abrir();
      else setMontada(true);
    } else if (montada) {
      cerrar();
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (montada && visible) abrir();
  }, [montada]); // eslint-disable-line react-hooks/exhaustive-deps

  // Android: el botón Atrás cierra la hoja en lugar de salir de la pantalla.
  useEffect(() => {
    if (!visible || !montada || !capturarAtras) return undefined;
    const suscripcion = BackHandler.addEventListener('hardwareBackPress', () => {
      acciones.current.cerrar();
      return true;
    });
    return () => suscripcion?.remove?.();
  }, [visible, montada, capturarAtras]);

  if (!montada) return null;

  const altoEfectivo = alto || ALTO_SUPUESTO;
  // El fondo se aclara a medida que la hoja baja: la atenuación acompaña al dedo.
  const opacidadFondo = reducir
    ? opacidad
    : desplazamiento.interpolate({ inputRange: [0, altoEfectivo], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
      <AnimatedPressable
        testID={`${testID}-fondo`}
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={() => cerrar()}
        style={[styles.fondo, { opacity: opacidadFondo }]}
      />
      <Animated.View
        testID={`${testID}-hoja`}
        style={[styles.hoja, { opacity: opacidad, transform: [{ translateY: desplazamiento }] }]}
        onLayout={evento => {
          const medido = evento.nativeEvent.layout.height;
          altoRef.current = medido;
          setAlto(medido);
        }}
        onAccessibilityEscape={() => cerrar()}
        {...gestos.panHandlers}
      >
        <View style={styles.asa} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden aria-hidden>
          <View style={styles.asaBarra} />
        </View>
        <View style={styles.cabecera}>
          <Text accessibilityRole="header" style={styles.titulo} numberOfLines={2}>{title}</Text>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            testID={`${testID}-cerrar`}
            style={styles.botonCerrar}
            onPress={() => cerrar()}
          >
            <View style={styles.botonCerrarCirculo}>
              <Ionicons name="close" size={18} color={Colors.textPrimary} />
            </View>
          </PressableScale>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: 'rgba(22, 25, 34, 0.98)',
    // Borde superior claro: la luz que atrapa el material.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
    ...Platform.select({ web: { backdropFilter: 'blur(24px) saturate(160%)' }, default: {} }),
  },
  asa: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  asaBarra: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  titulo: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
    paddingTop: 8,
    marginRight: 8,
  },
  botonCerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  botonCerrarCirculo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
});
