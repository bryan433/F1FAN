import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import TrackMap from '../components/TrackMap';
import PressableScale from '../components/PressableScale';
import { getTrackOutline, TRACK_PROGRESS } from '../services/OpenF1TrackService';

// Pasos visibles mientras se arma el trazado real (los informa getTrackOutline con onProgress).
export const PASOS_TRAZADO = [
  { clave: TRACK_PROGRESS.SESSION, texto: 'Buscando la carrera' },
  { clave: TRACK_PROGRESS.LAP, texto: 'Eligiendo una vuelta' },
  { clave: TRACK_PROGRESS.OUTLINE, texto: 'Dibujando el trazado' },
];

/**
 * Solo un Gran Premio de OpenF1 (con meeting_key) tiene trazado real. Sin parámetros, o con
 * un Gran Premio de otra fuente (p. ej. Jolpica), se mantiene la demostración de Marina Bay.
 */
function meetingOpenF1(route) {
  const meeting = route?.params?.meeting;
  const clave = Number(meeting?.meeting_key);
  return meeting && Number.isInteger(clave) && clave > 0 ? meeting : null;
}

/** Carga el trazado real de OpenF1 con estados de carga (y su paso actual), error y reintento. */
function useTrackOutline(meeting) {
  const [estado, setEstado] = useState({ status: meeting ? 'loading' : 'idle', outline: null, error: null });
  const [paso, setPaso] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!meeting) return undefined;
    let activo = true;
    setEstado({ status: 'loading', outline: null, error: null });
    setPaso(null);
    const onProgress = siguiente => { if (activo) setPaso(siguiente); };
    getTrackOutline(meeting, { onProgress })
      .then(outline => { if (activo) setEstado({ status: 'ready', outline, error: null }); })
      .catch(error => {
        if (!activo) return;
        // El servicio entrega mensajes en español con `code`; cualquier otro error se resume.
        const mensaje = error?.code ? error.message : 'No se pudo cargar el trazado real desde OpenF1.';
        setEstado({ status: 'error', outline: null, error: mensaje });
      });
    return () => { activo = false; };
  }, [meeting, intento]);

  return { ...estado, paso, retry: () => setIntento(valor => valor + 1) };
}

/** Estado de carga paso a paso (en lugar de un indicador sin contexto). */
function PasosDeCarga({ pasoActual }) {
  const indiceActual = Math.max(0, PASOS_TRAZADO.findIndex(paso => paso.clave === pasoActual));
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Cargando trazado de OpenF1" accessibilityLiveRegion="polite" style={styles.pasos}>
      {PASOS_TRAZADO.map((paso, indice) => {
        const situacion = indice < indiceActual ? 'listo' : indice === indiceActual ? 'en curso' : 'pendiente';
        return (
          <View key={paso.clave} style={styles.paso} accessible accessibilityLabel={`${paso.texto}, ${situacion}`}>
            <View style={styles.pasoIcono}>
              {situacion === 'listo' && <Ionicons name="checkmark-circle" size={18} color={Colors.accentGreen} />}
              {situacion === 'en curso' && <ActivityIndicator size="small" color={Colors.accentYellow} />}
              {situacion === 'pendiente' && <View style={styles.pasoPendiente} />}
            </View>
            <Text style={[styles.pasoTexto, situacion === 'en curso' && styles.pasoTextoActual]}>{paso.texto}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ARScreen({ navigation, route }) {
  const [arStep, setArStep] = useState('scan'); // 'scan' | 'table'
  const [scale, setScale] = useState('1:100');
  const [arMode, setArMode] = useState('realtime'); // 'realtime' | 'replay' | 'gaps'
  const [isRecording, setIsRecording] = useState(false);
  const recordTimer = useRef(null);
  const realMeeting = meetingOpenF1(route);
  const track = useTrackOutline(realMeeting);
  const meetingName = realMeeting ? (realMeeting.meeting_name || realMeeting.meeting_official_name || 'Gran Premio') : null;
  // Solo el modo con trazado real usa controles que responden al instante de tocarlos (y de
  // 44 pt o más); la demostración de Marina Bay conserva sus controles originales.
  const Pulsable = realMeeting ? PressableScale : TouchableOpacity;

  // Evita que la grabación simulada actualice el estado tras cerrar la pantalla.
  useEffect(() => () => clearTimeout(recordTimer.current), []);

  const handlePlaceCircuit = () => {
    setArStep('table');
  };

  const handleRecordClip = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      Alert.alert('Grabación simulada', 'Demostración de grabación: no se genera ni guarda un video real.');
      recordTimer.current = setTimeout(() => {
        setIsRecording(false);
        Alert.alert('Simulación finalizada', 'La demostración no ha grabado ni guardado archivos.');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      {realMeeting ? (
        <View style={styles.demoBanner}>
          <Text accessibilityRole="header" style={styles.demoTitle}>{`SIMULACIÓN AR — ${meetingName.toUpperCase()}`}</Text>
          {track.status === 'loading' && <PasosDeCarga pasoActual={track.paso} />}
          {track.status === 'error' && (
            <View>
              <Text accessibilityRole="alert" style={styles.demoText}>{track.error}</Text>
              <PressableScale accessibilityRole="button" accessibilityLabel="Reintentar" style={styles.retryBtn} onPress={track.retry}>
                <Ionicons name="refresh" size={16} color="#000000" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText}>Reintentar</Text>
              </PressableScale>
            </View>
          )}
          {track.status === 'ready' && (
            <Text style={styles.demoText}>
              {`Trazado real de OpenF1 (vuelta ${track.outline.lapNumber}, auto #${track.outline.driverNumber}). Animación y telemetría simuladas.`}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.demoBanner}>
          <Text accessibilityRole="header" style={styles.demoTitle}>SIMULACIÓN AR — DATOS DE DEMOSTRACIÓN</Text>
          <Text style={styles.demoText}>Marina Bay es un circuito de demostración independiente del GP seleccionado. Pilotos, vueltas, posiciones y velocidades son simulados; no son datos oficiales.</Text>
        </View>
      )}
      {/* MODO 1: ESCANEO Y ESCALA (Mockup 07) */}
      {arStep === 'scan' ? (
        <View style={styles.scanContainer}>
          {/* Header */}
          <View style={styles.arHeader}>
            <Pulsable accessibilityRole="button" accessibilityLabel="Cerrar simulación AR" style={[styles.closeBtn, realMeeting && styles.realCloseBtn]} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </Pulsable>
            <Text style={styles.headerTitle}>Calibración AR</Text>
            <View style={{ width: realMeeting ? 44 : 40 }} />
          </View>

          {/* Área de Cámara / Detección de Superficie */}
          <View style={styles.cameraViewport}>
            <View style={styles.scanReticle}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <Ionicons name="scan-outline" size={48} color={Colors.accentCyan} />
            </View>
            <Text style={styles.instructionText}>
              Simula la colocación del circuito sobre una mesa o superficie plana
            </Text>
          </View>

          {/* Selector de Escala (Mockup 07) */}
          <View style={styles.scaleCard}>
            <Text style={[styles.scaleLabel, realMeeting && styles.realScaleLabel]}>ESCALA DEL CIRCUITO</Text>
            <View style={styles.scaleOptions}>
              {['1:50', '1:100', '1:200'].map((sc) => (
                <Pulsable
                  key={sc}
                  accessibilityRole="button"
                  accessibilityState={{ selected: scale === sc }}
                  style={[styles.scalePill, realMeeting && styles.realScalePill, scale === sc && styles.scalePillActive]}
                  onPress={() => setScale(sc)}
                >
                  <Text style={[styles.scalePillText, scale === sc && styles.scalePillTextActive]}>
                    {sc}
                  </Text>
                </Pulsable>
              ))}
            </View>

            {/* Botón Colocar Circuito */}
            <Pulsable accessibilityRole="button" style={[styles.placeBtn, realMeeting && styles.realPlaceBtn]} onPress={handlePlaceCircuit} activeOpacity={0.8}>
              <Text style={styles.placeBtnText}>COLOCAR CIRCUITO</Text>
            </Pulsable>
          </View>
        </View>
      ) : (
        /* MODO 2: CIRCUITO EN LA MESA CON TELEMETRÍA (Mockup 06) */
        <View style={styles.tableContainer}>
          {/* Header con Indicador de Sesión */}
          <View style={styles.tableHeader}>
            <Pulsable accessibilityRole="button" accessibilityLabel="Volver a colocar el circuito" style={[styles.closeBtn, realMeeting && styles.realCloseBtn]} onPress={() => setArStep('scan')}>
              <Ionicons name="scan" size={20} color={Colors.textPrimary} />
            </Pulsable>
            <View style={[styles.arLiveTag, realMeeting && styles.arRealTag]}>
              {realMeeting ? (
                <Text style={[styles.arLiveText, styles.arRealTagText]} numberOfLines={1}>{`AR • ${meetingName.toUpperCase()}`}</Text>
              ) : (
                <Text style={styles.arLiveText}>DEMO AR • MARINA BAY</Text>
              )}
            </View>
            <Pulsable accessibilityRole="button" accessibilityLabel="Cerrar simulación AR" style={[styles.closeBtn, realMeeting && styles.realCloseBtn]} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </Pulsable>
          </View>

          {/* Torre pequeña de líderes AR (Mockup 06): solo en la demostración; con un GP real
              no se muestran posiciones inventadas. */}
          {!realMeeting && (
            <View style={styles.miniTower}>
              <Text style={styles.miniGap}>CLASIFICACIÓN SIMULADA</Text>
              <Text style={styles.miniGap}>VUELTA SIMULADA 24/62</Text>
              <Text style={styles.miniTowerRow}>1. VER <Text style={styles.miniGap}>LÍDER</Text></Text>
              <Text style={styles.miniTowerRow}>2. NOR <Text style={styles.miniGap}>+1.2s</Text></Text>
              <Text style={[styles.miniTowerRow, { color: Colors.accentCyan }]}>
                3. RUS ★ <Text style={styles.miniGap}>+1.8s</Text>
              </Text>
            </View>
          )}

          {/* Renderizado 3D / Trazado sobre la mesa */}
          <View style={styles.tableTrackCanvas}>
            {!realMeeting && <TrackMap circuitName="MARINA BAY • DEMOSTRACIÓN" isLive={true} isDemo={true} />}
            {realMeeting && track.status === 'ready' && (
              <TrackMap
                circuitName={`${String(realMeeting.circuit_short_name || meetingName).toUpperCase()} • OPENF1`}
                isLive={true}
                isDemo={true}
                points={track.outline.points}
                markerLabel={`#${track.outline.driverNumber}`}
              />
            )}
            {realMeeting && track.status !== 'ready' && (
              <Text style={styles.trackPlaceholder}>
                {track.status === 'loading' ? 'Esperando el trazado de OpenF1…' : 'Trazado no disponible.'}
              </Text>
            )}
            {/* HUD flotante del modo real: capa translúcida sobre el trazado, con texto de alto contraste. */}
            {realMeeting && track.status === 'ready' && (
              <View style={styles.realHud} pointerEvents="none">
                <View style={styles.realHudIcon}>
                  <Ionicons name="speedometer-outline" size={18} color={Colors.accentCyan} />
                </View>
                <View style={styles.realHudTexts}>
                  <Text style={styles.realHudTitle}>{`AUTO #${track.outline.driverNumber} · VUELTA ${track.outline.lapNumber}`}</Text>
                  <Text style={styles.realHudNote}>{`Sesión: ${track.outline.sessionName || 'sin nombre'}`}</Text>
                </View>
              </View>
            )}
          </View>

          {/* HUD de Telemetría Flotante (Mockup 06): solo en la demostración. */}
          {!realMeeting && (
            <View style={styles.arHud}>
              <View style={styles.arDriverPill}>
                <View style={styles.favStarBadge}>
                  <Ionicons name="star" size={10} color="#000000" />
                </View>
                <Text style={styles.arDriverName}>RUSSELL #63 · DEMO</Text>
              </View>
              <View style={styles.arSpeedRow}>
                <Text style={styles.arSpeedVal}>294.06</Text>
                <Text style={styles.arSpeedUnit}>KM/H SIMULADOS</Text>
              </View>
            </View>
          )}

          {/* Barra de Controles Inferior (Mockup 06) */}
          <View style={styles.bottomControls}>
            <View style={styles.modeTabs}>
              {[
                { key: 'realtime', label: 'ANIMACIÓN DEMO' },
                { key: 'replay', label: 'REPLAY DEMO' },
                { key: 'gaps', label: 'GAPS 3D DEMO' }
              ].map(mode => (
                <Pulsable
                  key={mode.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: arMode === mode.key }}
                  style={[styles.modeTab, realMeeting && styles.realModeTab, arMode === mode.key && styles.modeTabActive]}
                  onPress={() => setArMode(mode.key)}
                >
                  <Text style={[styles.modeTabText, realMeeting && styles.realModeTabText, arMode === mode.key && styles.modeTabTextActive]}>
                    {mode.label}
                  </Text>
                </Pulsable>
              ))}
            </View>

            <Pulsable
              accessibilityRole="button"
              style={[styles.recordBtn, realMeeting && styles.realRecordBtn, isRecording && styles.recordBtnActive]}
              onPress={handleRecordClip}
              activeOpacity={0.8}
            >
              <Ionicons name={isRecording ? 'stop-circle' : 'videocam'} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.recordBtnText}>
                {isRecording ? 'SIMULANDO...' : 'Simular clip AR'}
              </Text>
            </Pulsable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050709',
  },
  demoBanner: {
    backgroundColor: '#332712',
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentYellow,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  demoTitle: {
    color: Colors.accentYellow,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },
  demoText: {
    color: Colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
  // ---- Modo con trazado real (OpenF1) ----
  pasos: {
    marginTop: 2,
  },
  paso: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 26,
  },
  pasoIcono: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  pasoPendiente: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  pasoTexto: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  pasoTextoActual: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.accentYellow,
  },
  realCloseBtn: {
    width: 44,
    height: 44,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  realScaleLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  realScalePill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  realPlaceBtn: {
    minHeight: 52,
    justifyContent: 'center',
    borderRadius: 14,
  },
  realModeTab: {
    minHeight: 44,
    justifyContent: 'center',
  },
  realModeTabText: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  realRecordBtn: {
    minHeight: 48,
    borderRadius: 12,
  },
  realHud: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    // Capa flotante translúcida: deja ver el trazado sin perder la lectura.
    backgroundColor: 'rgba(22, 25, 34, 0.74)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 30,
  },
  realHudIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(0, 210, 190, 0.16)',
  },
  realHudTexts: {
    flex: 1,
  },
  realHudTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  realHudNote: {
    // Sobre material translúcido: más contraste y peso que un gris plano.
    color: 'rgba(235, 238, 242, 0.88)',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 1,
  },
  retryBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  arRealTag: {
    flexShrink: 1,
    marginHorizontal: 8,
  },
  arRealTagText: {
    fontSize: 12,
  },
  trackPlaceholder: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  scanContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  arHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  cameraViewport: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  scanReticle: {
    width: 220,
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 190, 0.2)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Colors.accentCyan,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3, borderRightWidth: 3 },
  instructionText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  scaleCard: {
    backgroundColor: Colors.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  scaleLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    textAlign: 'center',
  },
  scaleOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  scalePill: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scalePillActive: {
    borderColor: Colors.accentCyan,
    backgroundColor: 'rgba(0, 210, 190, 0.15)',
  },
  scalePillText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  scalePillTextActive: {
    color: Colors.accentCyan,
  },
  placeBtn: {
    backgroundColor: Colors.accentCyan,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  placeBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tableContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  arLiveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 190, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryRed,
    marginRight: 6,
  },
  arLiveText: {
    color: Colors.accentCyan,
    fontSize: 11,
    fontWeight: '900',
  },
  miniTower: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(13, 15, 18, 0.85)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
  },
  miniTowerRow: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  miniGap: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  tableTrackCanvas: {
    flex: 1,
    justifyContent: 'center',
  },
  arHud: {
    backgroundColor: 'rgba(13, 15, 18, 0.9)',
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accentCyan,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  arDriverPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favStarBadge: {
    backgroundColor: Colors.accentYellow,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  arDriverName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
  },
  arSpeedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  arSpeedVal: {
    color: Colors.accentCyan,
    fontSize: 24,
    fontWeight: '900',
    marginRight: 4,
  },
  arSpeedUnit: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  bottomControls: {
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: Colors.backgroundCardElevated,
  },
  modeTabText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  modeTabTextActive: {
    color: Colors.textPrimary,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryRed,
    paddingVertical: 12,
    borderRadius: 8,
  },
  recordBtnActive: {
    backgroundColor: '#990000',
  },
  recordBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

