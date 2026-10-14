import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import DriverCard from './DriverCard';

export default function StandingsTable({
  drivers = [],
  teams = [],
  onDriverPress,
  onTeamPress,
  onToggleFavorite
}) {
  const [activeTab, setActiveTab] = useState('pilotos'); // 'pilotos' | 'constructores'

  // Datos para la comparativa rápida de los dos punteros
  const leader1 = drivers[0] || { codigo: 'NOR', puntos: 324, colorHex: '#FF8000' };
  const leader2 = drivers[1] || { codigo: 'VER', puntos: 310, colorHex: '#3671C6' };
  const totalPoints = (leader1.puntos + leader2.puntos) || 1;
  const pct1 = Math.round((leader1.puntos / totalPoints) * 100);
  const pct2 = 100 - pct1;

  return (
    <View style={styles.container}>
      {/* Tabs Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pilotos' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pilotos')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'pilotos' && styles.tabTextActive]}>
            PILOTOS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'constructores' && styles.tabButtonActive]}
          onPress={() => setActiveTab('constructores')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'constructores' && styles.tabTextActive]}>
            CONSTRUCTORES
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Clasificación */}
      {activeTab === 'pilotos' ? (
        <View style={styles.listContainer}>
          {drivers.map((driver, index) => (
            <DriverCard
              key={driver.idPiloto || index}
              driver={driver}
              position={index + 1}
              onPress={() => onDriverPress && onDriverPress(driver)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}

          {/* Gráfico Comparativo Inferior según mockup 08 */}
          <View style={styles.comparisonBox}>
            <Text style={styles.compTitle}>Duelo por el Campeonato Mundial</Text>
            <View style={styles.compBar}>
              <View style={[styles.barHalf, { flex: pct1, backgroundColor: leader1.colorHex }]} />
              <View style={[styles.barHalf, { flex: pct2, backgroundColor: leader2.colorHex }]} />
            </View>
            <View style={styles.compLabels}>
              <Text style={[styles.compLabelText, { color: leader1.colorHex }]}>
                {leader1.codigo} • {leader1.puntos} PTS ({pct1}%)
              </Text>
              <Text style={[styles.compLabelText, { color: leader2.colorHex }]}>
                {leader2.codigo} • {leader2.puntos} PTS ({pct2}%)
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {teams.map((team, index) => (
            <TouchableOpacity
              key={team.id || index}
              style={styles.teamCard}
              onPress={() => onTeamPress && onTeamPress(team)}
              activeOpacity={0.8}
            >
              <Text style={styles.teamPos}>{index + 1}</Text>
              <View style={[styles.teamColor, { backgroundColor: team.colorHex }]} />
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{team.name || team.fullName}</Text>
              </View>
              <View style={styles.teamPointsBox}>
                <Text style={styles.teamPoints}>{team.puntos || team.points || 0}</Text>
                <Text style={styles.teamPointsUnit}>PTS</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCardElevated,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryRed,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingBottom: 24,
  },
  teamCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  teamPos: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
    width: 24,
  },
  teamColor: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  teamPointsBox: {
    alignItems: 'flex-end',
  },
  teamPoints: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  teamPointsUnit: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  comparisonBox: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  compBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 8,
  },
  barHalf: {
    height: '100%',
  },
  compLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compLabelText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

