import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import StandingsTable from '../components/StandingsTable';
import OfflineBanner from '../components/OfflineBanner';
import LoadingScreen from '../components/LoadingScreen';
import F1DataService from '../services/F1DataService';
import LocalStorageManager from '../storage/LocalStorageManager';
import { Ionicons } from '@expo/vector-icons';

export default function ClasificacionScreen({ navigation }) {
  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadStandings = async () => {
    try {
      const [driverList, teamList] = await Promise.all([
        F1DataService.getDriverStandings(),
        F1DataService.getTeamStandings()
      ]);
      setDrivers(driverList);
      setTeams(teamList);
      setIsOffline(F1DataService.isOfflineMode);
    } catch (error) {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStandings();
    const unsubscribe = navigation.addListener('focus', () => {
      // Recargar para refrescar favoritos cuando vuelva de la pantalla de perfil
      loadStandings();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStandings();
    setRefreshing(false);
  };

  const handleToggleFavorite = async (driver) => {
    const isCurrentlyFav = Boolean(driver.esFavorito);
    if (isCurrentlyFav) {
      await LocalStorageManager.eliminarFavorito(driver.idPiloto);
      Alert.alert('Favorito eliminado', `${driver.obtenerNombreCompleto()} ya no es tu piloto destacado.`);
    } else {
      await LocalStorageManager.guardarFavorito(driver.idPiloto);
      Alert.alert('Agregado a favoritos', `${driver.obtenerNombreCompleto()} guardado como tu favorito.`);
    }
    await loadStandings();
  };

  return (
    <View style={styles.container}>
      <Header
        subtitle="CAMPEONATO MUNDIAL 2024"
        title="Clasificación"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <OfflineBanner visible={isOffline} message="Sin conexión - Mostrando última clasificación guardada" />

      {/* Selector de Temporada y Acceso a Comparador */}
      <View style={styles.subHeader}>
        <View style={styles.seasonBadge}>
          <Ionicons name="trophy-outline" size={14} color={Colors.accentYellow} style={{ marginRight: 6 }} />
          <Text style={styles.seasonText}>Temporada Oficial 2024</Text>
        </View>

        <TouchableOpacity
          style={styles.compareBtn}
          onPress={() => navigation.navigate('Comparador')}
          activeOpacity={0.8}
        >
          <Ionicons name="git-compare-outline" size={14} color={Colors.textPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.compareBtnText}>Comparar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingScreen message="Consultando posiciones..." />
      ) : (
        <ScrollView
          style={styles.scrollArea}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />
          }
        >
          <StandingsTable
            drivers={drivers}
            teams={teams}
            onDriverPress={(driver) => navigation.navigate('PerfilPiloto', { driverId: driver.idPiloto, driver })}
            onToggleFavorite={handleToggleFavorite}
          />
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
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCardElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  seasonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  compareBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
});

