import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function DriverCard({ driver, position, onPress, onToggleFavorite }) {
  const isFav = Boolean(driver.esFavorito);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isFav && styles.cardFavorite
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.positionContainer}>
        <Text style={styles.positionText}>{position || driver.posicionCampeonato || '-'}</Text>
      </View>

      <View style={[styles.teamIndicator, { backgroundColor: driver.colorHex || Colors.accentCyan }]} />

      <View style={styles.driverInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.driverCode}>
            {driver.nombre ? driver.nombre[0] : ''}. {driver.apellido ? driver.apellido.toUpperCase() : driver.codigo}
          </Text>
          {isFav && (
            <Ionicons name="star" size={14} color={Colors.accentYellow} style={styles.starIcon} />
          )}
        </View>
        <Text style={styles.teamName}>{driver.nombreEscuderia || driver.teamName}</Text>
      </View>

      <View style={styles.numberBox}>
        <Text style={styles.driverNumber}>{driver.numero}</Text>
      </View>

      <View style={styles.pointsContainer}>
        <Text style={styles.pointsText}>{driver.puntos}</Text>
        <Text style={styles.pointsUnit}>PTS</Text>
      </View>

      {onToggleFavorite && (
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onToggleFavorite(driver)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFav ? 'star' : 'star-outline'}
            size={18}
            color={isFav ? Colors.accentYellow : Colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardFavorite: {
    borderColor: Colors.accentYellow,
    backgroundColor: '#1E1A11',
  },
  positionContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  positionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  teamIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  driverInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverCode: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  starIcon: {
    marginLeft: 6,
  },
  teamName: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  numberBox: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 12,
  },
  driverNumber: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  pointsContainer: {
    alignItems: 'flex-end',
    minWidth: 46,
  },
  pointsText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
  },
  pointsUnit: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  favoriteButton: {
    marginLeft: 10,
    padding: 4,
  },
});

