import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SessionCard({ session, onPress }) {
  const isLive = session.esLive || session.estado === 'En curso';
  const isFinished = session.estado === 'Finalizado';

  return (
    <TouchableOpacity
      style={[styles.card, isLive && styles.liveCard]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.leftCol}>
        <View style={styles.titleRow}>
          <Text style={styles.sessionType}>{session.tipo}</Text>
          {isLive && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
          )}
        </View>
        <Text style={styles.timeText}>
          {session.dia || 'Hoy'} {session.horaChile || '12:00'} CLT
        </Text>
      </View>

      <View style={styles.rightCol}>
        {isLive ? (
          <View style={styles.badgeLive}>
            <Text style={styles.badgeLiveText}>VUELTA {session.vueltaActual || 12}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.accentCyan} />
          </View>
        ) : isFinished ? (
          <View style={styles.badgeFinished}>
            <Text style={styles.badgeFinishedText}>FINALIZADO</Text>
          </View>
        ) : (
          <View style={styles.badgeUpcoming}>
            <Text style={styles.badgeUpcomingText}>{session.horaChile || '09:00'}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  liveCard: {
    borderColor: Colors.accentCyan,
    backgroundColor: '#122026',
  },
  leftCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  sessionType: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 6, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryRed,
    marginRight: 4,
  },
  liveText: {
    color: Colors.primaryRed,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  badgeLive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 210, 190, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accentCyan,
  },
  badgeLiveText: {
    color: Colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  badgeFinished: {
    backgroundColor: Colors.backgroundCardElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeFinishedText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeUpcoming: {
    backgroundColor: Colors.backgroundCardElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeUpcomingText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

