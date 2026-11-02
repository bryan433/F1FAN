import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import StandingsTable from '../components/StandingsTable';
import LoadingScreen from '../components/LoadingScreen';
import F1DataService from '../services/F1DataService';
import LocalStorageManager from '../storage/LocalStorageManager';
import { Ionicons } from '@expo/vector-icons';
import { resolveDriverFavorites } from '../utils/favorites';

export default function ClasificacionScreen({ navigation, route }) {
  const season = route?.params?.season;
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteRecords, setFavoriteRecords] = useState([]);
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [teamsReadError, setTeamsReadError] = useState(false);
  const inFlight = useRef(null);
  const mounted = useRef(true);
  const preferenceRequest = useRef(0);

  const loadPreferences = useCallback(async () => {
    const request = ++preferenceRequest.current;
    const [records, teams] = await Promise.all([
      LocalStorageManager.obtenerDetalleFavoritos(),
      // Si no se pueden leer las escuderías no se inventan: se informa el fallo y la tabla sigue visible.
      LocalStorageManager.obtenerEscuderiasFavoritas().catch(() => null),
    ]);
    if (mounted.current && request === preferenceRequest.current) {
      setFavoriteRecords(records);
      setFavoriteTeams(teams ?? []);
      setTeamsReadError(teams === null);
    }
  }, []);

  const loadStandings = useCallback(() => {
    // El primer evento focus puede coincidir con el montaje.
    if (inFlight.current && inFlight.current.season === season) return inFlight.current.promise;
    const promise = F1DataService.getChampionshipStandings(season)
      .then(async result => {
        await loadPreferences();
        if (mounted.current && inFlight.current?.promise === promise) {
          setSnapshot(result);
          setError(null);
        }
      }).catch(failure => {
        if (mounted.current && inFlight.current?.promise === promise) {
          setSnapshot(null);
          setError(failure.message);
        }
      }).finally(() => {
        if (inFlight.current?.promise === promise) {
          inFlight.current = null;
          if (mounted.current) setLoading(false);
        }
      });
    inFlight.current = { season, promise };
    return promise;
  }, [season, loadPreferences]);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    loadStandings();
    const unsubscribe = navigation.addListener('focus', loadStandings);
    const unsubscribePreferences = LocalStorageManager.suscribirFavoritos(loadPreferences);
    return () => { mounted.current = false; unsubscribe(); unsubscribePreferences(); };
  }, [navigation, loadStandings, loadPreferences]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStandings();
    if (mounted.current) setRefreshing(false);
  };

  const handleToggleFavorite = async driver => {
    try {
      if (driver.esFavorito) {
        const selected = resolveDriverFavorites(favoriteRecords, snapshot.drivers.data).find(entry => entry.current?.driverId === driver.driverId);
        if (!await LocalStorageManager.eliminarFavorito(selected?.savedIds ?? [driver.driverId ?? driver.idPiloto])) throw new Error('No se pudo eliminar el favorito.');
        Alert.alert('Favorito eliminado', `${driver.obtenerNombreCompleto()} ya no es tu piloto destacado.`);
      } else {
        if (!await LocalStorageManager.guardarFavorito(driver.idPiloto, driver)) throw new Error('No se pudo guardar el favorito.');
        Alert.alert('Agregado a favoritos', `${driver.obtenerNombreCompleto()} guardado como tu favorito.`);
      }
      await loadPreferences();
    } catch (failure) {
      Alert.alert('No se pudo guardar el favorito', failure.message);
    }
  };

  const handleToggleTeamFavorite = async team => {
    await LocalStorageManager.toggleEscuderiaFavorita(team.idEscuderia);
    await loadPreferences();
  };

  const resolvedFavorites = resolveDriverFavorites(favoriteRecords, snapshot?.drivers.data ?? []);
  const drivers = snapshot?.drivers.data.map(driver => Object.assign(
    Object.create(Object.getPrototypeOf(driver)), driver,
    { esFavorito: resolvedFavorites.some(entry => entry.current === driver) },
  )) ?? [];
  const teams = snapshot?.teams.data.map(team => ({ ...team, esFavorito: favoriteTeams.includes(String(team.idEscuderia).toLowerCase()) })) ?? [];

  const tableStatus = (label, table) => {
    const origin = table.origin === 'api' ? 'API' : table.origin === 'cache' ? 'caché local' : 'última copia guardada';
    return (
      <View key={label} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        {table.origin && <Text style={styles.seasonText}>{label} · Jolpica · {origin} · ronda {table.round ?? 'no disponible'}</Text>}
        {table.warning && <Text style={styles.seasonText}>{label}: {table.warning}</Text>}
        {table.error && <Text style={styles.seasonText}>{label}: No se pudo actualizar ({table.error}).</Text>}
        {!table.data.length && <Text style={styles.seasonText}>{label}: No hay clasificación disponible para esta temporada.</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Header subtitle={`CAMPEONATO MUNDIAL ${snapshot?.season ?? season ?? 'ACTUAL'}`}
        title="Clasificación" onProfilePress={() => navigation.navigate('Perfil')} />
      <View style={styles.subHeader}>
        <View style={styles.seasonBadge}>
          <Ionicons name="trophy-outline" size={14} color={Colors.accentYellow} style={{ marginRight: 6 }} />
          <Text style={styles.seasonText}>Temporada {snapshot?.season ?? season ?? 'actual'}</Text>
        </View>
        <TouchableOpacity style={styles.compareBtn}
          onPress={() => navigation.navigate('Comparador', { season: snapshot?.season ?? season })}
          activeOpacity={0.8}>
          <Ionicons name="git-compare-outline" size={14} color={Colors.textPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.compareBtnText}>Comparar</Text>
        </TouchableOpacity>
      </View>
      {loading ? <LoadingScreen message="Consultando posiciones..." /> : (
        <ScrollView style={styles.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />}>
          {error && <Text style={styles.seasonText}>No se pudo consultar la clasificación: {error}</Text>}
          {snapshot && <>
            {tableStatus('Pilotos', snapshot.drivers)}
            {tableStatus('Constructores', snapshot.teams)}
            {teamsReadError && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <Text accessibilityRole="alert" style={styles.seasonText}>No se pudieron leer tus escuderías favoritas guardadas.</Text>
              </View>
            )}
            <StandingsTable drivers={drivers} teams={teams}
              onDriverPress={driver => navigation.navigate('PerfilPiloto', { driverId: driver.idPiloto, driver })}
              onToggleFavorite={handleToggleFavorite} onToggleTeamFavorite={handleToggleTeamFavorite} />
          </>}
          <TouchableOpacity style={styles.compareBtn} onPress={onRefresh}>
            <Text style={styles.compareBtnText}>Reintentar / Actualizar</Text>
          </TouchableOpacity>
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

