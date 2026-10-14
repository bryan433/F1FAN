import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const HISTORICAL_DATA = {
  '2024': [
    { round: 1, gp: 'Baréin', circuit: 'Sakhir', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'M. VERSTAPPEN' },
    { round: 2, gp: 'Arabia Saudita', circuit: 'Jeddah', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'C. LECLERC' },
    { round: 3, gp: 'Australia', circuit: 'Melbourne', winner: 'C. SAINZ', pole: 'M. VERSTAPPEN', fastest: 'C. LECLERC' },
    { round: 4, gp: 'Japón', circuit: 'Suzuka', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'M. VERSTAPPEN' },
    { round: 5, gp: 'China', circuit: 'Shanghai', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'F. ALONSO' },
    { round: 6, gp: 'Miami', circuit: 'Miami', winner: 'L. NORRIS', pole: 'M. VERSTAPPEN', fastest: 'O. PIASTRI' },
    { round: 7, gp: 'Emilia-Romaña', circuit: 'Imola', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'G. RUSSELL' },
    { round: 8, gp: 'Mónaco', circuit: 'Monte Carlo', winner: 'C. LECLERC', pole: 'C. LECLERC', fastest: 'L. HAMILTON' },
    { round: 9, gp: 'Canadá', circuit: 'Montreal', winner: 'M. VERSTAPPEN', pole: 'G. RUSSELL', fastest: 'L. HAMILTON' },
    { round: 10, gp: 'España', circuit: 'Barcelona', winner: 'M. VERSTAPPEN', pole: 'L. NORRIS', fastest: 'L. NORRIS' },
    { round: 11, gp: 'Austria', circuit: 'Red Bull Ring', winner: 'G. RUSSELL', pole: 'M. VERSTAPPEN', fastest: 'F. ALONSO' },
    { round: 12, gp: 'Gran Bretaña', circuit: 'Silverstone', winner: 'L. HAMILTON', pole: 'G. RUSSELL', fastest: 'C. SAINZ' },
    { round: 13, gp: 'Hungría', circuit: 'Hungaroring', winner: 'O. PIASTRI', pole: 'L. NORRIS', fastest: 'G. RUSSELL' },
    { round: 14, gp: 'Bélgica', circuit: 'Spa-Francorchamps', winner: 'L. HAMILTON', pole: 'C. LECLERC', fastest: 'S. PÉREZ' },
    { round: 15, gp: 'Países Bajos', circuit: 'Zandvoort', winner: 'L. NORRIS', pole: 'L. NORRIS', fastest: 'L. NORRIS' },
    { round: 16, gp: 'Italia', circuit: 'Monza', winner: 'C. LECLERC', pole: 'L. NORRIS', fastest: 'L. NORRIS' },
    { round: 17, gp: 'Azerbaiyán', circuit: 'Baku', winner: 'O. PIASTRI', pole: 'C. LECLERC', fastest: 'L. NORRIS' }
  ],
  '2023': [
    { round: 1, gp: 'Baréin', circuit: 'Sakhir', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'Z. GUANYU' },
    { round: 2, gp: 'Arabia Saudita', circuit: 'Jeddah', winner: 'S. PÉREZ', pole: 'S. PÉREZ', fastest: 'M. VERSTAPPEN' },
    { round: 3, gp: 'Australia', circuit: 'Melbourne', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'S. PÉREZ' },
    { round: 16, gp: 'Singapur', circuit: 'Marina Bay', winner: 'C. SAINZ', pole: 'C. SAINZ', fastest: 'L. HAMILTON' },
    { round: 22, gp: 'Abu Dabi', circuit: 'Yas Marina', winner: 'M. VERSTAPPEN', pole: 'M. VERSTAPPEN', fastest: 'M. VERSTAPPEN' }
  ]
};

export default function HistorialWebScreen({ navigation }) {
  const [selectedSeason, setSelectedSeason] = useState('2024');
  const [searchQuery, setSearchQuery] = useState('');

  const currentRaces = HISTORICAL_DATA[selectedSeason] || HISTORICAL_DATA['2024'];

  // Filtro en el cliente según SD-08 sin consultar al servidor
  const filteredRaces = currentRaces.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.winner.toLowerCase().includes(q) ||
      r.gp.toLowerCase().includes(q) ||
      r.circuit.toLowerCase().includes(q) ||
      r.pole.toLowerCase().includes(q)
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Historial Multiplataforma (Web & Móvil)</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Selector de Temporada y Buscador en el Cliente (SD-08) */}
      <View style={styles.controlBar}>
        <View style={styles.seasonRow}>
          {['2024', '2023'].map(year => (
            <TouchableOpacity
              key={year}
              style={[styles.yearPill, selectedSeason === year && styles.yearPillActive]}
              onPress={() => setSelectedSeason(year)}
            >
              <Text style={[styles.yearText, selectedSeason === year && styles.yearTextActive]}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Filtrar por piloto (ej: Russell, Leclerc)..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: 32 }]}>RND</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>GRAN PREMIO</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>GANADOR</Text>
          <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>POLE</Text>
        </View>

        {filteredRaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No se encontraron carreras con ese filtro.</Text>
          </View>
        ) : (
          filteredRaces.map((race) => (
            <View key={race.round} style={styles.row}>
              <Text style={styles.rndCol}>{race.round}</Text>
              <View style={styles.gpCol}>
                <Text style={styles.gpName}>{race.gp}</Text>
                <Text style={styles.circuitName}>{race.circuit}</Text>
              </View>
              <View style={styles.winnerCol}>
                <Ionicons name="trophy" size={12} color={Colors.accentYellow} style={{ marginRight: 4 }} />
                <Text style={styles.winnerName}>{race.winner}</Text>
              </View>
              <Text style={styles.poleCol}>{race.pole.split(' ').pop()}</Text>
            </View>
          ))
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
    fontSize: 15,
    fontWeight: '800',
  },
  controlBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  yearPill: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  yearPillActive: {
    backgroundColor: Colors.primaryRed,
    borderColor: Colors.primaryRed,
  },
  yearText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  yearTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  th: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rndCol: {
    width: 32,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  gpCol: {
    flex: 1.2,
  },
  gpName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  circuitName: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  winnerCol: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerName: {
    color: Colors.accentYellow,
    fontSize: 12,
    fontWeight: '800',
  },
  poleCol: {
    flex: 1.2,
    textAlign: 'right',
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});

