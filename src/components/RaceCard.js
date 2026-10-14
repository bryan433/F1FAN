import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function RaceCard({ race, onPress, onLivePress }) {
  const isLive = Boolean(race.isLive);
  const isNext = Boolean(race.isNext);
  const isFinished = race.status === 'Finalizado';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isNext && styles.cardNext,
        isLive && styles.cardLive
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.countryInfo}>
          <Text style={styles.flag}>{race.flag || '🏁'}</Text>
          <View>
            <Text style={styles.country}>{race.country || race.pais}</Text>
            <Text style={styles.round}>ROUND {race.round}</Text>
          </View>
        </View>

        {isLive ? (
          <TouchableOpacity style={styles.liveButton} onPress={onLivePress}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveBtnText}>ENTRAR AL LIVE</Text>
          </TouchableOpacity>
        ) : isFinished ? (
          <View style={styles.winnerBadge}>
            <Text style={styles.winnerText}>Ganador: {race.winner || 'VER'}</Text>
          </View>
        ) : (
          <View style={styles.upcomingBadge}>
            <Text style={styles.upcomingText}>{race.localChileHour || '09:00 CLT'}</Text>
          </View>
        )}
      </View>

      <Text style={styles.raceName}>{race.name || race.nombreOficial}</Text>
      <Text style={styles.circuitName}>{race.circuit || (race.circuito && race.circuito.nombreCircuito)}</Text>

      <View style={styles.footerRow}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textSecondary} style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>{race.dateRange || '20 - 22 Sep'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardNext: {
    borderColor: Colors.primaryRed,
  },
  cardLive: {
    borderColor: Colors.accentCyan,
    backgroundColor: '#111B22',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 22,
    marginRight: 8,
  },
  country: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  round: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryRed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  liveBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  winnerBadge: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  winnerText: {
    color: Colors.accentYellow,
    fontSize: 11,
    fontWeight: '700',
  },
  upcomingBadge: {
    backgroundColor: Colors.backgroundCardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upcomingText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  raceName: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  circuitName: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});

