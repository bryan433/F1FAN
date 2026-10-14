import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import LocalStorageManager from '../storage/LocalStorageManager';
import F1DataService from '../services/F1DataService';
import { Ionicons } from '@expo/vector-icons';
import { DRIVERS } from '../data/teamsAndDrivers';

export default function PerfilPilotoScreen({ route, navigation }) {
  const driverParam = route.params?.driver;
  const driverId = route.params?.driverId || (driverParam ? driverParam.idPiloto : 63);

  const [driver, setDriver] = useState(driverParam || DRIVERS.find(d => d.idPiloto === driverId) || DRIVERS[3]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const checkFav = async () => {
      const fav = await LocalStorageManager.esFavorito(driver.idPiloto);
      setIsFavorite(fav);
    };
    checkFav();
  }, [driver.idPiloto]);

  /**
   * Flujo CU-06: Gestión de favoritos con AsyncStorage
   */
  const handleToggleFavorite = async () => {
    if (isFavorite) {
      await LocalStorageManager.eliminarFavorito(driver.idPiloto);
      setIsFavorite(false);
      Alert.alert('Favorito eliminado', `${driver.nombre} ${driver.apellido} eliminado de tus favoritos.`);
    } else {
      await LocalStorageManager.guardarFavorito(driver.idPiloto);
      setIsFavorite(true);
      Alert.alert('Agregado a favoritos', `${driver.nombre} ${driver.apellido} guardado como tu piloto favorito.`);
    }
  };

  const raceHistory = [
    { gp: 'Singapur', pos: 'FP2', status: 'En curso', points: '-' },
    { gp: 'Países Bajos', pos: 'P3', status: 'Finalizado', points: '+15' },
    { gp: 'Hungría', pos: 'P5', status: 'Finalizado', points: '+10' },
    { gp: 'Bélgica', pos: 'P17', status: 'Finalizado', points: '+0' },
    { gp: 'Gran Bretaña', pos: 'P1', status: 'Finalizado', points: '+25' },
  ];

  return (
    <View style={styles.container}>
      {/* Barra superior de navegación */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Perfil del Piloto</Text>
        <TouchableOpacity
          style={[styles.favHeaderBtn, isFavorite && styles.favHeaderBtnActive]}
          onPress={handleToggleFavorite}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={18}
            color={isFavorite ? '#000000' : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Banner Hero del Piloto con color de escudería */}
        <View style={[styles.heroCard, { borderColor: driver.colorHex || Colors.accentCyan }]}>
          <View style={styles.heroTop}>
            <View style={[styles.numberCircle, { backgroundColor: driver.colorHex || Colors.accentCyan }]}>
              <Text style={styles.numberLarge}>{driver.numero}</Text>
            </View>
            <View style={styles.countryBadge}>
              <Text style={styles.countryFlag}>{driver.bandera || '🏁'}</Text>
              <Text style={styles.countryName}>{driver.pais}</Text>
            </View>
          </View>

          <Text style={styles.driverName}>{driver.nombre} {driver.apellido ? driver.apellido.toUpperCase() : ''}</Text>
          <Text style={styles.teamTitle}>{driver.nombreEscuderia || driver.teamName}</Text>

          {/* Botón interactivo de Favorito según Mockup 10 */}
          <TouchableOpacity
            style={[styles.favActionBtn, isFavorite && styles.favActionBtnActive]}
            onPress={handleToggleFavorite}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFavorite ? 'star' : 'star-outline'}
              size={18}
              color={isFavorite ? '#000000' : Colors.accentYellow}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.favActionText, isFavorite && styles.favActionTextActive]}>
              {isFavorite ? 'ES TU PILOTO FAVORITO' : 'MARCAR COMO FAVORITO'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Estadísticas de la Temporada (Mockup 10) */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionHeader}>RENDIMIENTO EN EL CAMPEONATO 2024</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>P{driver.posicionCampeonato || 4}</Text>
              <Text style={styles.statLabel}>POSICIÓN</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: Colors.accentYellow }]}>{driver.puntos}</Text>
              <Text style={styles.statLabel}>PUNTOS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{driver.podios || 3}</Text>
              <Text style={styles.statLabel}>PODIOS</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{driver.victorias || 1}</Text>
              <Text style={styles.statLabel}>VICTORIAS</Text>
            </View>
          </View>
        </View>

        {/* Historial de Carreras (Mockup 10) */}
        <View style={styles.historySection}>
          <Text style={styles.sectionHeader}>HISTORIAL RECIENTE DE CARRERAS</Text>
          {raceHistory.map((race, index) => (
            <View key={index} style={styles.historyRow}>
              <View style={styles.raceInfo}>
                <Text style={styles.raceGp}>{race.gp}</Text>
                <Text style={styles.raceStatus}>{race.status}</Text>
              </View>
              <View style={styles.raceResult}>
                <Text style={[styles.racePos, race.pos === 'P1' && { color: Colors.accentYellow }]}>
                  {race.pos}
                </Text>
                <Text style={styles.racePoints}>{race.points} pts</Text>
              </View>
            </View>
          ))}
        </View>
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
  favHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.backgroundCardElevated,
  },
  favHeaderBtnActive: {
    backgroundColor: Colors.accentYellow,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 14,
    borderWidth: 1.5,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberLarge: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  countryFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  countryName: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  driverName: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  teamTitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 16,
  },
  favActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundDark,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentYellow,
  },
  favActionBtnActive: {
    backgroundColor: Colors.accentYellow,
    borderColor: Colors.accentYellow,
  },
  favActionText: {
    color: Colors.accentYellow,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  favActionTextActive: {
    color: '#000000',
  },
  statsSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  historySection: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  historyRow: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  raceInfo: {
    flex: 1,
  },
  raceGp: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  raceStatus: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  raceResult: {
    alignItems: 'flex-end',
  },
  racePos: {
    color: Colors.accentCyan,
    fontSize: 16,
    fontWeight: '900',
  },
  racePoints: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});

