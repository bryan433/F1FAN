import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import StandingsTable from '../components/StandingsTable';
import LoadingScreen from '../components/LoadingScreen';
import SeasonSelector from '../components/SeasonSelector';
import { getSeasons } from '../services/JolpicaService';
import { getChileDateTimeParts } from '../utils/timezone';
import F1DataService from '../services/F1DataService';
import LocalStorageManager from '../storage/LocalStorageManager';
import { Ionicons } from '@expo/vector-icons';
import { resolveDriverFavorites } from '../utils/favorites';

export default function ClasificacionScreen({ navigation, route }) {
  const routeYear = String(route?.params?.season ?? '').trim();
  const routeSeason = /^\d{4}$/.test(routeYear) && Number(routeYear) >= 1950 ? routeYear : null;
  const [season, setSeason] = useState(() => routeSeason ?? getChileDateTimeParts(Date.now())?.fechaChile.slice(0, 4));
  const [seasons, setSeasons] = useState(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [seasonsError, setSeasonsError] = useState(null);
  const [seasonsWarning, setSeasonsWarning] = useState(null);
  const seasonsInFlight = useRef(false);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
        if (!mounted.current || inFlight.current?.promise !== promise) return;
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
          if (mounted.current) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      });
    inFlight.current = { season, promise };
    return promise;
  }, [season, loadPreferences]);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = LocalStorageManager.suscribirFavoritos(loadPreferences);
    return () => {
      mounted.current = false;
      inFlight.current = null;
      preferenceRequest.current += 1;
      unsubscribe();
    };
  }, [loadPreferences]);

  // Solo un cambio explícito de navegación reemplaza la selección del usuario.
  useEffect(() => {
    if (!routeSeason) return;
    inFlight.current = null;
    setSnapshot(null);
    setError(null);
    setLoading(true);
    setSeason(routeSeason);
  }, [routeSeason]);

  useEffect(() => {
    setLoading(true);
    setSnapshot(null);
    setError(null);
    setRefreshing(false);
    loadStandings();
    const unsubscribe = navigation.addListener('focus', loadStandings);
    return () => { inFlight.current = null; unsubscribe(); };
  }, [navigation, loadStandings]);

  const loadSeasons = async () => {
    if (seasonsInFlight.current) return;
    seasonsInFlight.current = true;
    setLoadingSeasons(true);
    setSeasonsError(null);
    setSeasonsWarning(null);
    try {
      const result = await getSeasons();
      if (!mounted.current) return;
      setSeasons(result.data);
      setSeasonsWarning(result.warning);
    } catch {
      if (mounted.current) setSeasonsError('No se pudieron cargar las temporadas de Jolpica.');
    } finally {
      seasonsInFlight.current = false;
      if (mounted.current) setLoadingSeasons(false);
    }
  };

  const openSeasonSelector = () => {
    setSelectorVisible(true);
    if (seasons === null) loadSeasons();
  };

  const selectSeason = year => {
    setSelectorVisible(false);
    if (year === season) return;
    // Invalida la consulta anterior antes del efecto del nuevo año.
    inFlight.current = null;
    setSnapshot(null);
    setError(null);
    setLoading(true);
    setRefreshing(false);
    setSeason(year);
  };

  const onRefresh = () => {
    setRefreshing(true);
    return loadStandings();
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
    const id = String(team.idEscuderia).trim().toLowerCase();
    try {
      // Si la escritura falla se devuelve la lista guardada sin cambios.
      const lista = await LocalStorageManager.toggleEscuderiaFavorita(team.idEscuderia);
      if (lista.includes(id) === team.esFavorito) throw new Error('Sin cambios');
    } catch {
      Alert.alert('No se pudo guardar la escudería favorita', 'Tu selección guardada no cambió. Inténtalo de nuevo.');
    }
    await loadPreferences();
  };

  const resolvedFavorites = resolveDriverFavorites(favoriteRecords, snapshot?.drivers.data ?? []);
  const drivers = snapshot?.drivers.data.map(driver => Object.assign(
    Object.create(Object.getPrototypeOf(driver)), driver,
    { esFavorito: resolvedFavorites.some(entry => entry.current === driver) },
  )) ?? [];
  const teams = snapshot?.teams.data.map(team => ({ ...team, esFavorito: favoriteTeams.includes(String(team.idEscuderia).toLowerCase()) })) ?? [];

  const query = searchQuery.trim().toLowerCase();
  const filteredDrivers = query
    ? drivers.filter(d => {
        const full = `${d.nombre || ''} ${d.apellido || ''}`.toLowerCase();
        const code = (d.codigo || '').toLowerCase();
        const team = (d.nombreEscuderia || d.teamName || '').toLowerCase();
        const num = String(d.numero || '');
        return full.includes(query) || code.includes(query) || team.includes(query) || num === query;
      })
    : drivers;

  const filteredTeams = query
    ? teams.filter(t => {
        const name = (t.name || t.nombre || t.idEscuderia || '').toLowerCase();
        return name.includes(query);
      })
    : teams;

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
      <Header subtitle={`CAMPEONATO MUNDIAL ${season ?? 'ACTUAL'}`}
        title="Clasificación" onProfilePress={() => navigation.navigate('Perfil')} />
      <View style={styles.subHeader}>
        <View style={styles.seasonControl}>
          <SeasonSelector selectedSeason={season} seasons={seasons ?? []}
            accessibilityLabel="Seleccionar temporada de clasificación" triggerStyle={styles.seasonTrigger}
            visible={selectorVisible} loading={loadingSeasons} error={seasonsError} warning={seasonsWarning}
            onOpen={openSeasonSelector} onClose={() => setSelectorVisible(false)}
            onSelect={selectSeason} onRetry={loadSeasons} />
        </View>
        <TouchableOpacity style={styles.compareBtn}
          onPress={() => navigation.navigate('Comparador', { season })}
          activeOpacity={0.8}>
          <Ionicons name="git-compare-outline" size={14} color={Colors.textPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.compareBtnText}>Comparar</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Filtro en Vivo */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={15} color={Colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filtrar piloto o escudería..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Filtrar tabla de clasificación"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Limpiar filtro de clasificación"
            onPress={() => setSearchQuery('')}
            style={{ padding: 4 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading && <LoadingScreen message="Consultando posiciones..." />}
        <ScrollView style={[styles.scrollArea, loading && styles.hidden]}
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
          </>}
          {/* Permanece montada para conservar la pestaña al cambiar de temporada. */}
          <View style={!snapshot && styles.hidden}>
            <StandingsTable drivers={filteredDrivers} teams={filteredTeams}
              onDriverPress={driver => navigation.navigate('PerfilPiloto', { driverId: driver.idPiloto, driver })}
              onToggleFavorite={handleToggleFavorite} onToggleTeamFavorite={handleToggleTeamFavorite} />
          </View>
          <TouchableOpacity style={styles.compareBtn} onPress={onRefresh}>
            <Text style={styles.compareBtnText}>Reintentar / Actualizar</Text>
          </TouchableOpacity>
        </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 12,
    paddingVertical: 0,
  },
  seasonControl: { flex: 1, marginRight: 12 },
  seasonTrigger: { marginHorizontal: 0, marginTop: 0 },
  hidden: { display: 'none' },
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
