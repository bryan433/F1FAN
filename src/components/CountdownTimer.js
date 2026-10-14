import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { calculateTimeRemaining } from '../utils/timezone';
import { Ionicons } from '@expo/vector-icons';

export default function CountdownTimer({ targetDate, onCalendarPress, round = 17, totalRounds = 24, location = 'MARINA BAY' }) {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Text style={styles.badgeText}>SINGAPUR</Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.locationText}>{location}</Text>
        </View>
        <Text style={styles.roundText}>Round {round} de {totalRounds}</Text>
      </View>

      <Text style={styles.title}>GRAN PREMIO DE SINGAPUR</Text>

      <View style={styles.timerRow}>
        <View style={styles.timeBox}>
          <Text style={styles.timeNumber}>{String(timeRemaining.days).padStart(2, '0')}</Text>
          <Text style={styles.timeUnit}>días</Text>
        </View>

        <Text style={styles.colon}>:</Text>

        <View style={styles.timeBox}>
          <Text style={styles.timeNumber}>{String(timeRemaining.hours).padStart(2, '0')}</Text>
          <Text style={styles.timeUnit}>horas</Text>
        </View>

        <Text style={styles.colon}>:</Text>

        <View style={styles.timeBox}>
          <Text style={styles.timeNumber}>{String(timeRemaining.minutes).padStart(2, '0')}</Text>
          <Text style={styles.timeUnit}>min</Text>
        </View>

        <TouchableOpacity style={styles.calendarBtn} onPress={onCalendarPress} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.calendarBtnText}>+ Calendario</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: Colors.primaryRed,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  dotSeparator: {
    color: Colors.textMuted,
    marginHorizontal: 5,
  },
  locationText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  roundText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  timeBox: {
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 46,
  },
  timeNumber: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  timeUnit: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  colon: {
    color: Colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 5,
  },
  calendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCardElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  calendarBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});