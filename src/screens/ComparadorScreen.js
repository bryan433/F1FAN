import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import F1DataService from '../services/F1DataService';
import LoadingScreen from '../components/LoadingScreen';
import { Ionicons } from '@expo/vector-icons';

export default function ComparadorScreen({ navigation, route }) {
  const season = route?.params?.season;
  const [table, setTable] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(season);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(1);
  const [selectionSide, setSelectionSide] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    F1DataService.getChampionshipStandings(season).then(result => {
      if (active) {
        setTable(result.drivers);
        setSelectedSeason(result.season);
        setError(null);
        setIndexA(0);
        setIndexB(1);
        setSelectionSide(null);
      }
    }).catch(failure => {
      if (active) { setTable(null); setError(failure.message); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [season, attempt]);

  const drivers = table?.data ?? [];
  const driverA = drivers[indexA];
  const driverB = drivers[indexB];
  const sameDriver = (first, second) => (first.driverId ?? first.idPiloto) === (second.driverId ?? second.idPiloto);
  const swapDrivers = () => {
    setIndexA(indexB);
    setIndexB(indexA);
    setSelectionSide(null);
  };
  const selectDriver = index => {
    const candidate = drivers[index];
    const other = selectionSide === 'left' ? driverB : driverA;
    if (!candidate || sameDriver(candidate, other)) return;
    if (selectionSide === 'left') setIndexA(index);
    else setIndexB(index);
    setSelectionSide(null);
  };
  const display = value => value ?? 'No disponible';
  const renderComparisonBar = (label, valA, valB, numeric = true) => {
    const sum = valA + valB;
    const comparable = numeric && Number.isFinite(valA) && Number.isFinite(valB)
      && valA >= 0 && valB >= 0 && Number.isFinite(sum) && sum > 0;
    const aWins = comparable && valA > valB;
    const bWins = comparable && valB > valA;
    return (
      <View style={styles.metricRow} key={label}>
        <View style={styles.metricLabels}>
          <Text style={styles.metricTitle}>{label.toUpperCase()}</Text>
          <Text style={[styles.valText, styles.valLeft, aWins && styles.valWinning]}>{display(valA)}</Text>
          <Text style={[styles.valText, styles.valRight, bWins && styles.valWinning]}>{display(valB)}</Text>
        </View>
        {comparable && (
          <View style={styles.barTrack}>
            <View style={[styles.barLeft, { flex: valA / sum }]} />
            <View style={styles.barDivider} />
            <View style={[styles.barRight, { flex: valB / sum }]} />
          </View>
        )}
      </View>
    );
  };

  const driverHeading = (driver, side) => (
    <View style={styles.driverCol}>
      <View style={[styles.numberPill, { backgroundColor: side === 'left' ? Colors.accentCyan : Colors.accentOrange }]}>
        <Text style={styles.pillNumber}>{display(driver.numero)}</Text>
      </View>
      <Text style={styles.driverNameBig}>{(driver.apellido || driver.nombre || driver.codigo).toUpperCase()}</Text>
      <Text style={styles.teamSub}>{driver.nombreEscuderia || 'No disponible'}</Text>
      <TouchableOpacity accessibilityRole="button"
        accessibilityLabel={`Seleccionar piloto ${side === 'left' ? 'izquierdo' : 'derecho'}`}
        style={styles.selectButton} onPress={() => setSelectionSide(side)}>
        <Text style={styles.selectButtonText}>ELEGIR PILOTO</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity accessibilityLabel="Volver" style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Comparador Estadístico</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Intercambiar pilotos" disabled={loading || !driverA || !driverB} style={styles.swapBtn} onPress={swapDrivers}>
          <Ionicons name="swap-horizontal" size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {loading ? <LoadingScreen message="Cargando comparación..." /> : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.cardHeader}>TEMPORADA {selectedSeason ?? season ?? 'ACTUAL'} • CARA A CARA</Text>
          {table?.origin && <Text style={styles.cardHeader}>Fuente: Jolpica · {table.origin === 'api' ? 'API' : table.origin === 'cache' ? 'caché local' : 'última copia guardada'} · ronda {table.round ?? 'no disponible'}</Text>}
          {table?.warning && <Text style={styles.teamSub}>{table.warning}</Text>}
          {(error || table?.error) && <Text style={styles.teamSub}>No se pudo actualizar la comparación: {error || table.error}</Text>}
          {driverA && driverB ? <>
            <View style={styles.versusContainer}>
              {driverHeading(driverA, 'left')}
              <View style={styles.vsBadge}><Text style={styles.vsText}>VS</Text></View>
              {driverHeading(driverB, 'right')}
            </View>
            {selectionSide && <View style={styles.statsCard}>
              <Text style={styles.cardHeader}>ELEGIR PILOTO {selectionSide === 'left' ? 'IZQUIERDO' : 'DERECHO'}</Text>
              <Text style={styles.teamSub}>El piloto del otro lado no se puede seleccionar.</Text>
              {drivers.map((driver, index) => {
                const isOther = sameDriver(driver, selectionSide === 'left' ? driverB : driverA);
                const isSelected = sameDriver(driver, selectionSide === 'left' ? driverA : driverB);
                const name = [driver.nombre, driver.apellido].filter(Boolean).join(' ') || driver.codigo;
                return <TouchableOpacity key={driver.driverId ?? driver.idPiloto}
                  accessibilityRole="button" accessibilityLabel={`Elegir a ${name}`}
                  accessibilityState={{ disabled: isOther, selected: isSelected }} disabled={isOther}
                  style={[styles.driverOption, isOther && styles.driverOptionDisabled]}
                  onPress={() => selectDriver(index)}>
                  <Text style={styles.selectButtonText}>{name}</Text>
                  {isOther && <Text style={styles.teamSub}>Seleccionado en el otro lado</Text>}
                </TouchableOpacity>;
              })}
              <TouchableOpacity accessibilityRole="button" onPress={() => setSelectionSide(null)} style={styles.selectButton}>
                <Text style={styles.selectButtonText}>Cancelar selección</Text>
              </TouchableOpacity>
            </View>}
            <View style={styles.statsCard}>
              {renderComparisonBar('Puntos Totales', driverA.puntos, driverB.puntos)}
              {renderComparisonBar('Victorias', driverA.victorias, driverB.victorias)}
              {renderComparisonBar('Pole Positions', driverA.poles, driverB.poles)}
              {renderComparisonBar('Podios', driverA.podios, driverB.podios)}
              {renderComparisonBar('Posición publicada', driverA.positionText || driverA.posicionCampeonato, driverB.positionText || driverB.posicionCampeonato, false)}
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>DELTA DE RITMO EN CARRERA</Text>
              <Text style={styles.teamSub}>No disponible</Text>
              <Text style={styles.teamSub}>Jolpica no proporciona ritmo de carrera, poles ni podios en esta consulta.</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.changeBtn} onPress={swapDrivers}>
              <Text style={styles.changeBtnText}>INTERCAMBIAR PILOTOS</Text>
            </TouchableOpacity>
          </> : <Text style={styles.teamSub}>Se necesitan al menos dos pilotos con clasificación disponible para comparar.</Text>}
          <TouchableOpacity style={styles.changeBtn} onPress={() => setAttempt(value => value + 1)}>
            <Text style={styles.changeBtnText}>Reintentar / Actualizar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
    paddingHorizontal: 18,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  driverCol: {
    alignItems: 'center',
    flex: 1,
  },
  selectButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectButtonText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  driverOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    borderRadius: 8,
  },
  driverOptionDisabled: {
    opacity: 0.35,
  },
  numberPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: 38,
    alignItems: 'center',
  },
  pillNumber: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
  driverNameBig: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  teamSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  vsBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderLeftColor: Colors.accentCyan,
    borderRightColor: Colors.accentOrange,
    borderTopColor: Colors.borderHighlight,
    borderBottomColor: Colors.borderHighlight,
    marginHorizontal: 8,
  },
  vsText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statsCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 14,
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
    marginBottom: 16,
  },
  metricLabels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  valText: {
    width: '48%',
    minWidth: 0,
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  valWinning: {
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  valLeft: {
    color: Colors.accentCyan,
    textAlign: 'left',
  },
  valRight: {
    color: Colors.accentOrange,
    textAlign: 'right',
  },
  metricTitle: {
    width: '100%',
    textAlign: 'center',
    marginBottom: 6,
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.backgroundDark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  barDivider: {
    width: 2,
    height: '100%',
    backgroundColor: Colors.background,
  },
  barLeft: {
    height: '100%',
    backgroundColor: Colors.accentCyan,
  },
  barRight: {
    height: '100%',
    backgroundColor: Colors.accentOrange,
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

