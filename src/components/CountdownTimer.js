import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { calculateTimeRemaining } from '../utils/timezone';
import { Ionicons } from '@expo/vector-icons';

export default function CountdownTimer({ targetDate, onCalendarPress, round, totalRounds, location, country, title = 'Próximo Gran Premio' }) {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(targetDate));
  const hasTarget = Boolean(targetDate) && Number.isFinite(new Date(targetDate).getTime());

  useEffect(() => {
    setTimeRemaining(calculateTimeRemaining(targetDate));
    if (!hasTarget || new Date(targetDate).getTime() <= Date.now()) return;
    const timer = setInterval(() => {
      const remaining = calculateTimeRemaining(targetDate);
      setTimeRemaining(remaining);
      if (remaining.isPassed) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, hasTarget]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          {country ? <Text style={styles.badgeText}>{country}</Text> : null}
          {country && location ? <Text style={styles.dotSeparator}>•</Text> : null}
          {location ? <Text style={styles.locationText}>{location}</Text> : null}
        </View>
        {round != null && (
          <Text style={styles.roundText}>Round {round}{totalRounds != null ? ` de ${totalRounds}` : ''}</Text>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      {hasTarget && !timeRemaining.isPassed ? (
      <View style={styles.timerRow} accessibilityLabel="Cuenta regresiva para la carrera">
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

      </View>
      ) : (
        <Text style={styles.locationText}>
          {hasTarget ? 'Inicio programado alcanzado. Estado real sin confirmar.' : 'Fecha y hora por confirmar.'}
        </Text>
      )}

      <View style={styles.timerRow}>
        <TouchableOpacity accessibilityRole="button" style={styles.calendarBtn} onPress={onCalendarPress} activeOpacity={0.8}>
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
