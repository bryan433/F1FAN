import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export default function TelemetryWidget({
  driverName = 'G. RUSSELL',
  teamName = 'Mercedes',
  number = 63,
  speed = 312,
  gear = 7,
  drs = true,
  throttle = 98,
  brake = 0,
  unit = 'km/h'
}) {
  return (
    <View style={styles.container}>
      <View style={styles.topInfo}>
        <View style={styles.driverTag}>
          <View style={styles.numberBadge}>
            <Text style={styles.numberText}>{number}</Text>
          </View>
          <View>
            <Text style={styles.driverText}>{driverName}</Text>
            <Text style={styles.teamText}>{teamName}</Text>
          </View>
        </View>

        <View style={[styles.drsBadge, drs ? styles.drsActive : styles.drsInactive]}>
          <Text style={[styles.drsText, drs ? styles.drsTextActive : styles.drsTextInactive]}>
            DRS {drs ? 'ON' : 'OFF'}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        {/* Velocímetro */}
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{speed}</Text>
          <Text style={styles.metricLabel}>{unit}</Text>
        </View>

        {/* Marcha Actual */}
        <View style={styles.gearItem}>
          <Text style={styles.gearValue}>{gear}</Text>
          <Text style={styles.metricLabel}>MARCHA</Text>
        </View>

        {/* Barras de Acelerador y Freno */}
        <View style={styles.pedalsContainer}>
          <View style={styles.pedalRow}>
            <Text style={styles.pedalLabel}>GAS</Text>
            <View style={styles.pedalTrack}>
              <View style={[styles.pedalFillGas, { width: `${throttle}%` }]} />
            </View>
            <Text style={styles.pedalPct}>{throttle}%</Text>
          </View>

          <View style={styles.pedalRow}>
            <Text style={styles.pedalLabel}>BRK</Text>
            <View style={styles.pedalTrack}>
              <View style={[styles.pedalFillBrake, { width: `${brake}%` }]} />
            </View>
            <Text style={styles.pedalPct}>{brake}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberBadge: {
    backgroundColor: Colors.accentCyan,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  numberText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  driverText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  teamText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  drsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  drsActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderColor: Colors.accentGreen,
  },
  drsInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: Colors.border,
  },
  drsText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  drsTextActive: {
    color: Colors.accentGreen,
  },
  drsTextInactive: {
    color: Colors.textMuted,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gearItem: {
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  gearValue: {
    color: Colors.accentCyan,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  pedalsContainer: {
    flex: 1,
    marginLeft: 14,
  },
  pedalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  pedalLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    width: 28,
  },
  pedalTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.backgroundCardElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  pedalFillGas: {
    height: '100%',
    backgroundColor: Colors.accentGreen,
  },
  pedalFillBrake: {
    height: '100%',
    backgroundColor: Colors.primaryRed,
  },
  pedalPct: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    width: 28,
    textAlign: 'right',
  },
});

