import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import RaceCard from '../components/RaceCard';
import OfflineBanner from '../components/OfflineBanner';
import LoadingScreen from '../components/LoadingScreen';
import SeasonSelector from '../components/SeasonSelector';
import { getSeasons } from '../services/JolpicaService';
import F1DataService from '../services/F1DataService';
import { getChileDateTimeParts, isValidCalendarDate } from '../utils/timezone';
import { Ionicons } from '@expo/vector-icons';

export default function CalendarioScreen({ navigation }) {
  const [filterTab, setFilterTab] = useState('todo'); // 'todo' | 'proximas' | 'anteriores'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeason, setSelectedSeason] = useState(() => getChileDateTimeParts(Date.now())?.fechaChile.slice(0, 4) ?? null);
  const [seasons, setSeasons] = useState(null);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [seasonsError, setSeasonsError] = useState(null);
  const [seasonsWarning, setSeasonsWarning] = useState(null);
  const seasonsInFlight = useRef(false);
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const mounted = useRef(false);
  const request = useRef(0);

  const loadCalendar = useCallback(async () => {
    const currentRequest = ++request.current;
    setLoading(true);
    setError(null);
    setWarning(null);
    setCalendar([]);
    try {
      // El año se elige en pantalla; el servicio mantiene transformación y caché.
      const data = await F1DataService.getCalendar(selectedSeason);
      if (!Array.isArray(data)) throw new Error('Calendario no válido.');
      if (!mounted.current || currentRequest !== request.current) return;
      setCalendar(data);
      setWarning(F1DataService.calendarWarning || data.find(race => race.warning)?.warning || null);
    } catch (e) {
      if (!mounted.current || currentRequest !== request.current) return;
      setError('No se pudo cargar el calendario.');
    } finally {
      if (mounted.current && currentRequest === request.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedSeason]);

  useEffect(() => {
    mounted.current = true;
    loadCalendar();
    return () => {
      mounted.current = false;
      request.current += 1;
    };
  }, [loadCalendar]);

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
    // La lista se consulta al abrir, sin descargar calendarios de otros años.
    if (seasons === null) loadSeasons();
  };

  const selectSeason = year => {
    setSelectorVisible(false);
    if (year === selectedSeason) return;
    // Invalida de inmediato la consulta anterior, incluso antes del próximo efecto.
    request.current += 1;
    setCalendar([]);
    setLoading(true);
    setRefreshing(false);
    setError(null);
    setWarning(null);
    setSelectedSeason(year);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendar();
  };

  const now = Date.now();
  const todayUTC = new Date(now).toISOString().slice(0, 10);
  const season = selectedSeason;

  const filteredRaces = calendar.filter((race) => {
    // 1. Filtro por pestañas de tiempo (programadas)
    if (filterTab !== 'todo') {
      const instant = race.fechaCarreraUTC ? new Date(race.fechaCarreraUTC).getTime() : NaN;
      if (Number.isFinite(instant)) {
        if (filterTab === 'proximas' && instant <= now) return false;
        if (filterTab === 'anteriores' && instant > now) return false;
      } else if (!isValidCalendarDate(race.date)) {
        return false;
      } else {
        if (filterTab === 'proximas' && race.date <= todayUTC) return false;
        if (filterTab === 'anteriores' && race.date >= todayUTC) return false;
      }
    }

    // 2. Filtro en tiempo real por búsqueda de texto
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const name = String(race.name || race.nombreOficial || race.nombreCorto || race.nombreCarrera || '').toLowerCase();
      const circuitName = String(race.circuit || race.circuito?.nombreCircuito || (typeof race.circuito === 'string' ? race.circuito : '')).toLowerCase();
      const country = String(race.country || race.pais || race.circuito?.pais || '').toLowerCase();
      const roundStr = String(race.round || '').toLowerCase();
      const matches = name.includes(query)
        || circuitName.includes(query)
        || country.includes(query)
        || roundStr === query
        || `round ${roundStr}`.includes(query)
        || `ronda ${roundStr}`.includes(query);
      if (!matches) return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        subtitle={season ? `TEMPORADA ${season} • HORA DE SANTIAGO` : 'CALENDARIO • HORA DE SANTIAGO'}
        title="Calendario"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <OfflineBanner visible={Boolean(warning)} message={warning || ''} />
      <SeasonSelector selectedSeason={selectedSeason} seasons={seasons ?? []}
        visible={selectorVisible} loading={loadingSeasons} error={seasonsError} warning={seasonsWarning}
        onOpen={openSeasonSelector} onClose={() => setSelectorVisible(false)}
        onSelect={selectSeason} onRetry={loadSeasons} />

      {/* Barra de Búsqueda en Vivo */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={17} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar carrera, circuito o país..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Buscar carrera en el calendario"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchBtn}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs de Filtro según Mockup 14 */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'todo', label: 'TODO' },
          { key: 'proximas', label: 'PRÓXIMAS' },
          { key: 'anteriores', label: 'ANTERIORES' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: filterTab === tab.key }}
            style={[styles.tabButton, filterTab === tab.key && styles.tabButtonActive]}
            onPress={() => setFilterTab(tab.key)}
          >
            <Text style={[styles.tabText, filterTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.filterNotice}>Los filtros comparan fechas programadas; no confirman resultados. Fechas desconocidas: consulta TODO.</Text>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />
        }
      >
        {loading && <LoadingScreen message="Cargando calendario de carreras..." />}
        {!loading && error && (
          <View style={styles.historyCard}>
            <Text accessibilityRole="alert" style={styles.historyTitle}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={loadCalendar} style={styles.tabButton}>
              <Text style={styles.tabTextActive}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        {!loading && !error && filteredRaces.length === 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>
              {calendar.length === 0
                ? 'No hay Grandes Premios publicados para esta temporada.'
                : searchQuery.trim()
                  ? `No se encontraron carreras para "${searchQuery.trim()}".`
                  : 'No hay Grandes Premios para este filtro.'}
            </Text>
            {searchQuery.trim() ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setSearchQuery('')}
                style={[styles.tabButton, styles.clearResultButton]}
              >
                <Text style={styles.tabTextActive}>Limpiar búsqueda</Text>
              </TouchableOpacity>
            ) : calendar.length === 0 ? (
              <TouchableOpacity accessibilityRole="button" onPress={loadCalendar} style={styles.tabButton}>
                <Text style={styles.tabTextActive}>Volver a consultar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        {!loading && !error && filteredRaces.map((race) => (
          <RaceCard
            key={race.idMeeting || race.id || `${race.season}:${race.round}`}
            race={race}
            onPress={() => navigation.navigate('DetalleGP', { meeting: race })}
            onLivePress={() => navigation.navigate('En Vivo')}
          />
        ))}

        {/* Registro Histórico Footer Mockup 14 */}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.historyCard}
          onPress={() => navigation.navigate('HistorialWeb')}
          activeOpacity={0.8}
        >
          <Text style={styles.historyTitle}>Registro Histórico</Text>
          <Text style={styles.historySub}>Explora las temporadas y los resultados disponibles</Text>
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
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearResultButton: {
    marginTop: 10,
    backgroundColor: Colors.backgroundCardElevated,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCardElevated,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 3,
  },
  filterNotice: {
    color: Colors.textMuted,
    fontSize: 11,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.backgroundCard,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  tabTextActive: {
    color: Colors.primaryRed,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  historyTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  historySub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});

