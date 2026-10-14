import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import TrackMap from '../components/TrackMap';

export default function ARScreen({ navigation }) {
  const [arStep, setArStep] = useState('scan'); // 'scan' | 'table'
  const [scale, setScale] = useState('1:100');
  const [arMode, setArMode] = useState('realtime'); // 'realtime' | 'replay' | 'gaps'
  const [isRecording, setIsRecording] = useState(false);

  const handlePlaceCircuit = () => {
    setArStep('table');
  };

  const handleRecordClip = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      Alert.alert('Grabación AR', 'Grabando clip de realidad aumentada...');
      setTimeout(() => {
        setIsRecording(false);
        Alert.alert('Clip guardado', 'Tu video de RA se ha guardado en la galería local.');
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      {/* MODO 1: ESCANEO Y ESCALA (Mockup 07) */}
      {arStep === 'scan' ? (
        <View style={styles.scanContainer}>
          {/* Header */}
          <View style={styles.arHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Calibración AR</Text>
            <View style={{ width: 40 }} />
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
              Mueve el teléfono suavemente para detectar la mesa o superficie plana
            </Text>
          </View>

          {/* Selector de Escala (Mockup 07) */}
          <View style={styles.scaleCard}>
            <Text style={styles.scaleLabel}>ESCALA DEL CIRCUITO</Text>
            <View style={styles.scaleOptions}>
              {['1:50', '1:100', '1:200'].map((sc) => (
                <TouchableOpacity
                  key={sc}
                  style={[styles.scalePill, scale === sc && styles.scalePillActive]}
                  onPress={() => setScale(sc)}
                >
                  <Text style={[styles.scalePillText, scale === sc && styles.scalePillTextActive]}>
                    {sc}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Botón Colocar Circuito */}
            <TouchableOpacity style={styles.placeBtn} onPress={handlePlaceCircuit} activeOpacity={0.8}>
              <Text style={styles.placeBtnText}>COLOCAR CIRCUITO</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* MODO 2: CIRCUITO EN LA MESA CON TELEMETRÍA (Mockup 06) */
        <View style={styles.tableContainer}>
          {/* Header con Indicador de Sesión */}
          <View style={styles.tableHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setArStep('scan')}>
              <Ionicons name="scan" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.arLiveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.arLiveText}>AR LIVE • MARINA BAY • L24/62</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Torre pequeña de líderes AR (Mockup 06) */}
          <View style={styles.miniTower}>
            <Text style={styles.miniTowerRow}>1. VER <Text style={styles.miniGap}>LÍDER</Text></Text>
            <Text style={styles.miniTowerRow}>2. NOR <Text style={styles.miniGap}>+1.2s</Text></Text>
            <Text style={[styles.miniTowerRow, { color: Colors.accentCyan }]}>
              3. RUS ★ <Text style={styles.miniGap}>+1.8s</Text>
            </Text>
          </View>

          {/* Renderizado 3D / Trazado sobre la mesa */}
          <View style={styles.tableTrackCanvas}>
            <TrackMap circuitName="SIMULACIÓN AR EN TU MESA" isLive={true} />
          </View>

          {/* HUD de Telemetría Flotante (Mockup 06) */}
          <View style={styles.arHud}>
            <View style={styles.arDriverPill}>
              <View style={styles.favStarBadge}>
                <Ionicons name="star" size={10} color="#000000" />
              </View>
              <Text style={styles.arDriverName}>RUSSELL #63</Text>
            </View>
            <View style={styles.arSpeedRow}>
              <Text style={styles.arSpeedVal}>294.06</Text>
              <Text style={styles.arSpeedUnit}>KM/H</Text>
            </View>
          </View>

          {/* Barra de Controles Inferior (Mockup 06) */}
          <View style={styles.bottomControls}>
            <View style={styles.modeTabs}>
              {[
                { key: 'realtime', label: 'TIEMPO REAL' },
                { key: 'replay', label: 'REPLAY' },
                { key: 'gaps', label: 'GAPS 3D' }
              ].map(mode => (
                <TouchableOpacity
                  key={mode.key}
                  style={[styles.modeTab, arMode === mode.key && styles.modeTabActive]}
                  onPress={() => setArMode(mode.key)}
                >
                  <Text style={[styles.modeTabText, arMode === mode.key && styles.modeTabTextActive]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              onPress={handleRecordClip}
              activeOpacity={0.8}
            >
              <Ionicons name={isRecording ? 'stop-circle' : 'videocam'} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.recordBtnText}>
                {isRecording ? 'GRABANDO...' : 'Grabar clip AR'}
              </Text>
            </TouchableOpacity>
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
    backgroundColor: 'rgba(225, 6, 0, 0.25)',
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
    color: '#FF6B6B',
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

