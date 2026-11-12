import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '../theme/colors';
import { MAX_TRACK_SEGMENTS, TRACK_CANVAS, esPuntoValido, samplePoints } from '../utils/trackGeometry';
import { USE_NATIVE_DRIVER } from '../utils/motion';
import useReduceMotion from '../hooks/useReduceMotion';

// Ritmo del marcador de referencia sobre un trazado real: ms por punto muestreado (~150 puntos ≈ 37 s
// por vuelta). Los puntos de OpenF1 están equiespaciados en el tiempo, así que el marcador conserva
// el perfil de velocidad de la vuelta real (más lento en las curvas lentas).
export const REAL_TRACK_MS_PER_POINT = 250;
// Duración de la aparición progresiva del trazado real ("se dibuja" en el sentido de la vuelta).
export const TRACK_REVEAL_MS = 600;
const REAL_SEGMENT_THICKNESS = 4;
const REFERENCE_MARKER_SIZE = 16;

// Coordenadas normalizadas aproximadas del trazado de Marina Bay Street Circuit
const TRACK_POINTS = [
  { x: 30, y: 70 },
  { x: 70, y: 70 },
  { x: 120, y: 72 },
  { x: 160, y: 55 },
  { x: 190, y: 45 },
  { x: 230, y: 48 },
  { x: 260, y: 75 },
  { x: 280, y: 110 },
  { x: 275, y: 140 },
  { x: 245, y: 155 },
  { x: 210, y: 140 },
  { x: 180, y: 160 },
  { x: 140, y: 170 },
  { x: 90, y: 165 },
  { x: 60, y: 145 },
  { x: 40, y: 115 },
  { x: 30, y: 70 },
];

/**
 * Posición, largo y ángulo de un segmento rotado entre dos puntos.
 * `centrar` ubica el centro del segmento sobre la línea (trazado real); el trazado de
 * demostración conserva su posicionamiento original.
 */
function geometriaSegmento(pt, next, { grosor = 0, centrar = false }) {
  const midX = (pt.x + next.x) / 2;
  const midY = (pt.y + next.y) / 2;
  const length = Math.hypot(next.x - pt.x, next.y - pt.y);
  const angle = Math.atan2(next.y - pt.y, next.x - pt.x) * (180 / Math.PI);
  return {
    left: midX - length / 2,
    top: centrar ? midY - grosor / 2 : midY,
    width: length,
    transform: [{ rotate: `${angle}deg` }],
  };
}

/** Segmentos rotados que dibujan la polilínea del trazado de demostración. */
function renderSegments(trazado, { estilo }) {
  return trazado.slice(0, -1).map((pt, index) => (
    <View key={index} style={[estilo, geometriaSegmento(pt, trazado[index + 1], {})]} />
  ));
}

/**
 * Mapa del circuito con marcadores animados.
 * Sin `points` dibuja el trazado de demostración de Marina Bay con dos autos simulados.
 * Con `points` (coordenadas ya normalizadas al lienzo TRACK_CANVAS) dibuja ese trazado real
 * y anima un único marcador de referencia; la animación no representa posiciones en vivo.
 */
export default function TrackMap({ circuitName = 'MARINA BAY STREET CIRCUIT', isLive = true, isDemo = false, points, markerLabel }) {
  const realTrack = useMemo(() => {
    const validos = Array.isArray(points) ? points.filter(esPuntoValido) : [];
    return validos.length >= 2 ? samplePoints(validos, MAX_TRACK_SEGMENTS) : null;
  }, [points]);
  // Un trazado distinto se vuelve a dibujar desde cero.
  const claveTrazado = useMemo(() => (realTrack ? realTrack.map(p => `${p.x},${p.y}`).join(';') : ''), [realTrack]);

  if (realTrack) {
    return <TrazadoReal key={claveTrazado} trazado={realTrack} circuitName={circuitName} isLive={isLive} markerLabel={markerLabel} />;
  }
  return <TrazadoDemo circuitName={circuitName} isLive={isLive} isDemo={isDemo} />;
}

/**
 * Trazado real de OpenF1. Al aparecer se "dibuja" segmento a segmento en el sentido de la vuelta;
 * luego un marcador de referencia lo recorre de forma continua, interpolando su posición entre
 * los puntos muestreados (solo transformaciones y opacidad). Con "Reducir movimiento" el trazado
 * aparece completo de inmediato.
 */
function TrazadoReal({ trazado, circuitName, isLive, markerLabel }) {
  const reducir = useReduceMotion();
  const ultimo = trazado.length - 1; // índice del último punto = cantidad de segmentos
  const revelado = useRef(new Animated.Value(reducir ? ultimo : 0)).current; // segmentos visibles
  const progreso = useRef(new Animated.Value(0)).current; // posición del marcador, en puntos
  const recorrido = useRef(null);
  const [dibujado, setDibujado] = useState(reducir);

  useEffect(() => {
    if (reducir) return undefined;
    const aparicion = Animated.timing(revelado, {
      toValue: ultimo,
      duration: TRACK_REVEAL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    aparicion.start(({ finished }) => { if (finished) setDibujado(true); });
    return () => aparicion.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Si la preferencia de movimiento reducido llega después de montar, el trazado se completa ya.
  useEffect(() => {
    if (!reducir) return;
    revelado.stopAnimation();
    revelado.setValue(ultimo);
    setDibujado(true);
  }, [reducir]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isLive || !dibujado) return undefined;
    let activo = true;
    // Recorre desde `desde` hasta el final de la vuelta y encadena la siguiente desde el inicio.
    // (Se encadena a mano en lugar de Animated.loop, que sin módulo nativo hace una sola vuelta).
    const recorrer = desde => {
      let arrancando = true;
      const animacion = Animated.timing(progreso, {
        toValue: ultimo,
        duration: (ultimo - desde) * REAL_TRACK_MS_PER_POINT,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      });
      recorrido.current = animacion;
      animacion.start(({ finished }) => {
        // Una animación que termina en el mismo ciclo en que empezó (duración nula o animaciones
        // simuladas) no encadena otra vuelta: evita una recursión sin fin.
        if (!finished || !activo || arrancando) return;
        progreso.setValue(0);
        recorrer(0);
      });
      arrancando = false;
    };
    // Continúa desde donde quedó el marcador (por ejemplo, tras una pausa).
    progreso.stopAnimation(valor => {
      if (!activo) return;
      const desde = typeof valor === 'number' && valor > 0 && valor < ultimo ? valor : 0;
      progreso.setValue(desde);
      recorrer(desde);
    });
    return () => {
      activo = false;
      recorrido.current?.stop();
      recorrido.current = null;
    };
  }, [isLive, dibujado]); // eslint-disable-line react-hooks/exhaustive-deps

  // Los segmentos y las interpolaciones solo cambian con el trazado.
  const segmentos = useMemo(() => trazado.slice(0, -1).map((pt, indice) => (
    <Animated.View
      key={indice}
      style={[
        styles.realTrackSegment,
        geometriaSegmento(pt, trazado[indice + 1], { grosor: REAL_SEGMENT_THICKNESS, centrar: true }),
        { opacity: revelado.interpolate({ inputRange: [indice, indice + 1], outputRange: [0, 1], extrapolate: 'clamp' }) },
      ]}
    />
  )), [trazado, revelado]);

  const marcador = useMemo(() => {
    const indices = trazado.map((_, indice) => indice);
    const mitad = REFERENCE_MARKER_SIZE / 2;
    return {
      opacity: revelado.interpolate({ inputRange: [ultimo - 1, ultimo], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [
        { translateX: progreso.interpolate({ inputRange: indices, outputRange: trazado.map(p => p.x - mitad) }) },
        { translateY: progreso.interpolate({ inputRange: indices, outputRange: trazado.map(p => p.y - mitad) }) },
      ],
    };
  }, [trazado, revelado, progreso, ultimo]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.trackName, styles.realHeaderText]}>{circuitName}</Text>
        <View style={[styles.statusBadge, styles.demoBadge]}>
          <Text style={[styles.statusText, styles.demoText, styles.realHeaderText]}>TRAZADO REAL</Text>
        </View>
      </View>

      <View style={[styles.mapCanvas, styles.realCanvas]}>
        {segmentos}
        {/* Marcador de referencia: recorre el trazado a ritmo simulado */}
        <Animated.View testID="track-reference-marker" style={[styles.referenceMarker, marcador]} />
      </View>

      <View style={[styles.legendRow, styles.realLegendRow]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.accentCyan }]} />
          <Text style={[styles.legendText, styles.realLegendText]}>Trazado real · OpenF1</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FFFFFF' }]} />
          <Text style={[styles.legendText, styles.realLegendText]}>
            {markerLabel ? `Auto ${markerLabel} · animación simulada` : 'Animación simulada'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Trazado de demostración de Marina Bay con dos autos simulados. */
function TrazadoDemo({ circuitName, isLive, isDemo }) {
  const [carProgress, setCarProgress] = useState(0);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setCarProgress(prev => (prev + 1) % TRACK_POINTS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLive]);

  // Los segmentos son fijos: se memorizan para que la animación no los recalcule.
  const segments = useMemo(() => renderSegments(TRACK_POINTS, { estilo: styles.trackSegment }), []);

  const carPos = TRACK_POINTS[carProgress] || TRACK_POINTS[0];
  const secondCarIndex = (carProgress + 3) % TRACK_POINTS.length;
  const car2Pos = TRACK_POINTS[secondCarIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.trackName}>{circuitName}</Text>
        <View style={[styles.statusBadge, isDemo && styles.demoBadge]}>
          <Text style={[styles.statusText, isDemo && styles.demoText]}>{isDemo ? 'V12 SIMULADA' : 'EN VIVO • V12'}</Text>
        </View>
      </View>

      <View style={styles.mapCanvas}>
        {/* Renderizado de segmentos del trazado */}
        {segments}

        {/* Marcadores de Curvas Principales */}
        <View style={[styles.cornerPin, { left: 190, top: 40 }]}>
          <Text style={styles.cornerText}>T7</Text>
        </View>
        <View style={[styles.cornerPin, { left: 275, top: 135 }]}>
          <Text style={styles.cornerText}>T14</Text>
        </View>

        {/* Auto Líder (L. Norris - McLaren Orange #FF8000) */}
        <View style={[styles.carMarker, { left: car2Pos.x - 7, top: car2Pos.y - 7, backgroundColor: '#FF8000' }]}>
          <Text style={styles.carCode}>4</Text>
        </View>

        {/* Auto de Russell (Mercedes Cyan #27F4D2 con aura de favorito) */}
        <View style={[styles.carMarker, styles.favCar, { left: carPos.x - 9, top: carPos.y - 9, backgroundColor: '#27F4D2' }]}>
          <Text style={styles.carCodeFav}>63</Text>
        </View>
      </View>

      {/* Leyenda del Mapa */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF8000' }]} />
          <Text style={styles.legendText}>{isDemo ? 'NOR #4 (P1 DEMO)' : 'NOR #4 (P1)'}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#27F4D2' }]} />
          <Text style={styles.legendText}>{isDemo ? 'RUS #63 (P3 DEMO)' : 'RUS #63 (P3 ★)'}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E10600' }]} />
          <Text style={styles.legendText}>{isDemo ? 'DRS DE EJEMPLO' : 'Zona DRS 1 & 2'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackName: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusBadge: {
    backgroundColor: 'rgba(225, 6, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    color: Colors.primaryRed,
    fontSize: 10,
    fontWeight: '800',
  },
  demoBadge: {
    backgroundColor: 'rgba(0, 210, 190, 0.15)',
  },
  demoText: {
    color: Colors.accentCyan,
  },
  mapCanvas: {
    height: 210,
    position: 'relative',
    marginVertical: 8,
    justifyContent: 'center',
  },
  trackSegment: {
    position: 'absolute',
    height: 5,
    backgroundColor: '#384050',
    borderRadius: 2.5,
  },
  cornerPin: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  cornerText: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  carMarker: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  favCar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 20,
  },
  carCode: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  carCodeFav: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 10,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  // ---- Trazado real (OpenF1) ----
  realHeaderText: {
    fontSize: 12,
  },
  realCanvas: {
    width: TRACK_CANVAS.width,
    height: TRACK_CANVAS.height,
    alignSelf: 'center',
  },
  realTrackSegment: {
    position: 'absolute',
    height: REAL_SEGMENT_THICKNESS,
    backgroundColor: 'rgba(0, 210, 190, 0.75)',
    borderRadius: REAL_SEGMENT_THICKNESS / 2,
  },
  referenceMarker: {
    position: 'absolute',
    // Se posiciona solo con transformaciones (translateX/Y) desde el origen del lienzo.
    left: 0,
    top: 0,
    width: REFERENCE_MARKER_SIZE,
    height: REFERENCE_MARKER_SIZE,
    borderRadius: REFERENCE_MARKER_SIZE / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: Colors.primaryRed,
    zIndex: 20,
  },
  realLegendRow: {
    flexWrap: 'wrap',
    gap: 8,
  },
  realLegendText: {
    fontSize: 12,
  },
});

