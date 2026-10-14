import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import TrackMap from '../components/TrackMap';
import TelemetryWidget from '../components/TelemetryWidget';
import OfflineBanner from '../components/OfflineBanner';
import F1DataService from '../services/F1DataService';
import { LIVE_TIMING_DATA, TELEMETRY_SAMPLE } from '../data/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function LiveScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('timing'); // 'timing' | 'mapa' | 'radio' | 'telemetria'
  const [timingData, setTimingData] = useState(LIVE_TIMING_DATA);
  const [telemetry, setTelemetry] = useState(TELEMETRY_SAMPLE);
  const [safetyCar, setSafetyCar] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const live = await F1DataService.getLiveTiming();
        if (live && live.length > 0) setTimingData(live);
      } catch (e) {
        setIsOffline(true);
      }
    };
    fetchData();
  }, []);

  return (
    <View style={styles.container}>
      <Header
        subtitle="MARINA BAY • PRACTICE 2"
        title="En Vivo"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <OfflineBanner visible={isOffline} />

      {/* Banner de Estado de Pista */}
      <View style={[styles.trackStatusBanner, safetyCar ? styles.scBanner : styles.greenBanner]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: safetyCar ? '#FFE600' : '#00E676' }]} />
          <Text style={styles.statusTitle}>
            {safetyCar ? 'SAFETY CAR DESPLEGADO • L12/25' : 'PISTA VERDE • CONDICIONES ÓPTIMAS'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.scToggle}
          onPress={() => setSafetyCar(!safetyCar)}
        >
          <Text style={styles.scToggleText}>{safetyCar ? 'Quitar SC' : 'Simular SC'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Tabs de navegación interna según mockups 02, 04 y 05 */}
      <View style={styles.subTabsContainer}>
        {['timing', 'mapa', 'telemetria', 'radio'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.subTabButton, activeTab === tab && styles.subTabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.subTabText, activeTab === tab && styles.subTabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* VISTA 1: TORRE DE TIEMPOS (TIMING TOWER - Mockup 04) */}
        {activeTab === 'timing' && (
          <View style={styles.timingTower}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { width: 28 }]}>POS</Text>
              <Text style={[styles.thText, { flex: 1, marginLeft: 8 }]}>PILOTO</Text>
              <Text style={[styles.thText, { width: 65, textAlign: 'right' }]}>GAP</Text>
              <Text style={[styles.thText, { width: 70, textAlign: 'right' }]}>TIEMPO</Text>
              <Text style={[styles.thText, { width: 28, textAlign: 'center' }]}>TY</Text>
            </View>

            {timingData.map((row, index) => {
              const isFav = row.isFavorite;
              return (
                <TouchableOpacity
                  key={row.driverNumber || index}
                  style={[styles.timingRow, isFav && styles.favTimingRow]}
                  onPress={() => navigation.navigate('PerfilPiloto', { driverId: row.driverNumber })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.posCell}>{row.position}</Text>
                  <View style={[styles.teamBar, { backgroundColor: row.color }]} />
                  <View style={styles.driverCell}>
                    <Text style={styles.driverCodeText}>{row.driverCode}</Text>
                    {isFav && <Ionicons name="star" size={12} color={Colors.accentYellow} style={{ marginLeft: 4 }} />}
                  </View>
                  <Text style={styles.gapCell}>{row.gap}</Text>
                  <Text style={styles.timeCell}>{row.time}</Text>
                  <View style={[
                    styles.tyreBadge,
                    row.tyre === 'S' ? styles.tyreSoft : row.tyre === 'M' ? styles.tyreMedium : styles.tyreHard
                  ]}>
                    <Text style={styles.tyreText}>{row.tyre}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* VISTA 2: MAPA EN VIVO DEL CIRCUITO (Mockup 05) */}
        {activeTab === 'mapa' && (
          <View>
            <TrackMap circuitName="MARINA BAY STREET CIRCUIT" isLive={true} />
            <TelemetryWidget
              driverName="G. RUSSELL"
              teamName="Mercedes"
              number={63}
              speed={telemetry.speed}
              gear={telemetry.gear}
              drs={telemetry.drs}
              throttle={telemetry.throttle}
              brake={telemetry.brake}
            />
          </View>
        )}

        {/* VISTA 3: TELEMETRÍA DETALLADA (Mockup 05) */}
        {activeTab === 'telemetria' && (
          <View>
            <TelemetryWidget
              driverName="G. RUSSELL"
              teamName="Mercedes"
              number={63}
              speed={telemetry.speed}
              gear={telemetry.gear}
              drs={telemetry.drs}
              throttle={telemetry.throttle}
              brake={telemetry.brake}
            />
            <View style={styles.telemetryCard}>
              <Text style={styles.cardHeader}>Métricas del Vehículo Mercedes W15</Text>
              <View style={styles.metricGrid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>RPM Motor</Text>
                  <Text style={styles.gridVal}>11,840</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Carga de Batería (ERS)</Text>
                  <Text style={styles.gridVal}>84%</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Temp. Frenos Delanteros</Text>
                  <Text style={styles.gridVal}>520°C</Text>
                </View>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Desgaste Neumático</Text>
                  <Text style={styles.gridVal}>11 vueltas (Medio)</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* VISTA 4: RADIOS DE EQUIPO (TEAM RADIO) */}
        {activeTab === 'radio' && (
          <View style={styles.radioList}>
            <View style={styles.radioItem}>
              <View style={styles.radioBadgeRow}>
                <Text style={styles.radioTeam}>MERCEDES • RUSSELL #63 (FAVORITO)</Text>
                <Text style={styles.radioTime}>Vuelta 11</Text>
              </View>
              <Text style={styles.radioMsg}>"El balance en el sector medio es excelente. Podemos empujar más en la curva 14."</Text>
            </View>

            <View style={styles.radioItem}>
              <View style={styles.radioBadgeRow}>
                <Text style={[styles.radioTeam, { color: '#3671C6' }]}>RED BULL • VERSTAPPEN #1</Text>
                <Text style={styles.radioTime}>Vuelta 10</Text>
              </View>
              <Text style={styles.radioMsg}>"The front wing feels light on turn-in, check the telemetry please."</Text>
            </View>

            <View style={styles.radioItem}>
              <View style={styles.radioBadgeRow}>
                <Text style={[styles.radioTeam, { color: '#FF8000' }]}>MCLAREN • NORRIS #4</Text>
                <Text style={styles.radioTime}>Vuelta 9</Text>
              </View>
              <Text style={styles.radioMsg}>"Modo ataque listo para la simulación de clasificación."</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  trackStatusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  greenBanner: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 118, 0.3)',
  },
  scBanner: {
    backgroundColor: 'rgba(255, 230, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusTitle: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scToggle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  scToggleText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCardElevated,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 8,
    padding: 3,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  subTabActive: {
    backgroundColor: Colors.backgroundCard,
  },
  subTabText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  subTabTextActive: {
    color: Colors.accentCyan,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  timingTower: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  thText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  favTimingRow: {
    backgroundColor: '#1E1B12',
  },
  posCell: {
    width: 28,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  teamBar: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    marginRight: 8,
  },
  driverCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverCodeText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  gapCell: {
    width: 65,
    textAlign: 'right',
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  timeCell: {
    width: 70,
    textAlign: 'right',
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  tyreBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  tyreSoft: {
    backgroundColor: '#E10600',
  },
  tyreMedium: {
    backgroundColor: '#FFD700',
  },
  tyreHard: {
    backgroundColor: '#FFFFFF',
  },
  tyreText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  telemetryCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    backgroundColor: Colors.backgroundDark,
    padding: 10,
    borderRadius: 8,
  },
  gridLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  gridVal: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  radioList: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  radioItem: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  radioBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  radioTeam: {
    color: Colors.accentCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  radioTime: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  radioMsg: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

