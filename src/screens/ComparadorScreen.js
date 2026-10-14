import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { DRIVERS } from '../data/teamsAndDrivers';
import { Ionicons } from '@expo/vector-icons';

export default function ComparadorScreen({ navigation }) {
  const [driverA, setDriverA] = useState(DRIVERS[0]); // Norris (#4)
  const [driverB, setDriverB] = useState(DRIVERS[1]); // Verstappen (#1)

  const swapDrivers = () => {
    // Rotar entre los mejores pilotos
    const nextA = DRIVERS[(DRIVERS.indexOf(driverA) + 1) % DRIVERS.length];
    setDriverA(nextA);
  };

  const renderComparisonBar = (label, valA, valB, isTime = false) => {
    const numA = Number(valA) || 0;
    const numB = Number(valB) || 0;
    const sum = numA + numB || 1;
    const pctA = Math.max(10, Math.round((numA / sum) * 100));
    const pctB = Math.max(10, 100 - pctA);

    return (
      <View style={styles.metricRow}>
        <View style={styles.metricLabels}>
          <Text style={[styles.valText, { color: driverA.colorHex }]}>{valA}</Text>
          <Text style={styles.metricTitle}>{label.toUpperCase()}</Text>
          <Text style={[styles.valText, { color: driverB.colorHex }]}>{valB}</Text>
        </View>

        <View style={styles.barTrack}>
          <View style={[styles.barLeft, { flex: pctA, backgroundColor: driverA.colorHex }]} />
          <View style={[styles.barRight, { flex: pctB, backgroundColor: driverB.colorHex }]} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Comparador Estadístico</Text>
        <TouchableOpacity style={styles.swapBtn} onPress={swapDrivers}>
          <Ionicons name="shuffle" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cabecera de los 2 Pilotos Enfrentados (Mockup 09) */}
        <View style={styles.versusContainer}>
          {/* Piloto A */}
          <View style={styles.driverCol}>
            <View style={[styles.numberPill, { backgroundColor: driverA.colorHex }]}>
              <Text style={styles.pillNumber}>{driverA.numero}</Text>
            </View>
            <Text style={styles.driverNameBig}>{driverA.apellido.toUpperCase()}</Text>
            <Text style={styles.teamSub}>{driverA.teamName}</Text>
          </View>

          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* Piloto B */}
          <View style={styles.driverCol}>
            <View style={[styles.numberPill, { backgroundColor: driverB.colorHex }]}>
              <Text style={styles.pillNumber}>{driverB.numero}</Text>
            </View>
            <Text style={styles.driverNameBig}>{driverB.apellido.toUpperCase()}</Text>
            <Text style={styles.teamSub}>{driverB.teamName}</Text>
          </View>
        </View>

        {/* Ficha Comparativa Frente a Frente */}
        <View style={styles.statsCard}>
          <Text style={styles.cardHeader}>TEMPORADA 2024 • CARA A CARA</Text>

          {renderComparisonBar('Puntos Totales', driverA.puntos, driverB.puntos)}
          {renderComparisonBar('Victorias', driverA.victorias, driverB.victorias)}
          {renderComparisonBar('Pole Positions', driverA.poles, driverB.poles)}
          {renderComparisonBar('Podios', driverA.podios, driverB.podios)}
          {renderComparisonBar('Posición Actual', `P${driverA.posicionCampeonato}`, `P${driverB.posicionCampeonato}`)}
        </View>

        {/* Gráfico Simulado de Ritmo de Vuelta Rápida (Mockup 09) */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>DELTA DE RITMO EN CARRERA</Text>
            <Text style={styles.chartSub}>-0.180s</Text>
          </View>

          <View style={styles.mockWaveContainer}>
            <View style={[styles.waveLine, { borderColor: driverA.colorHex }]} />
            <View style={[styles.waveLine2, { borderColor: driverB.colorHex }]} />
          </View>

          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: driverA.colorHex }]} />
              <Text style={styles.legendText}>{driverA.codigo}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: driverB.colorHex }]} />
              <Text style={styles.legendText}>{driverB.codigo}</Text>
            </View>
          </View>
        </View>

        {/* Botón Cambiar Pilotos según Mockup 09 */}
        <TouchableOpacity style={styles.changeBtn} onPress={swapDrivers} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.changeBtnText}>CAMBIAR PILOTOS</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 6,
  },
  navTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  swapBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: Colors.backgroundCardElevated,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  versusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverCol: {
    alignItems: 'center',
    flex: 1,
  },
  numberPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  pillNumber: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  driverNameBig: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  teamSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  vsText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  statsCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 16,
    textAlign: 'center',
  },
  metricRow: {
    marginBottom: 14,
  },
  metricLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  valText: {
    fontSize: 15,
    fontWeight: '900',
  },
  metricTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.backgroundDark,
  },
  barLeft: {
    height: '100%',
  },
  barRight: {
    height: '100%',
  },
  chartCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  chartSub: {
    color: Colors.accentGreen,
    fontSize: 13,
    fontWeight: '800',
  },
  mockWaveContainer: {
    height: 60,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 8,
  },
  waveLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    borderBottomWidth: 3,
    borderRadius: 10,
  },
  waveLine2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 35,
    borderBottomWidth: 3,
    borderRadius: 10,
    opacity: 0.7,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryRed,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  changeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

