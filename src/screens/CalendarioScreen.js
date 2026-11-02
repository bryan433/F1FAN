import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import RaceCard from '../components/RaceCard';
import OfflineBanner from '../components/OfflineBanner';
import LoadingScreen from '../components/LoadingScreen';
import F1DataService from '../services/F1DataService';
import { getChileDateTimeParts, isValidCalendarDate } from '../utils/timezone';

export default function CalendarioScreen({ navigation }) {
  const [filterTab, setFilterTab] = useState('todo'); // 'todo' | 'proximas' | 'anteriores'
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
      // El servicio elige el año de Santiago y reutiliza la caché de Jolpica.
      const data = await F1DataService.getCalendar();
      if (!Array.isArray(data)) throw new Error('Calendario no válido.');
      if (!mounted.current || currentRequest !== request.current) return;
      setCalendar(data);
      setWarning(F1DataService.calendarWarning || data.find(race => race.warning)?.warning || null);
    } catch (e) {
      if (!mounted.current || currentRequest !== request.current) return;
      setError('No se pudo cargar el calendario.');
    } finally {
      if (mounted.current && currentRequest === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadCalendar();
    return () => {
      mounted.current = false;
      request.current += 1;
    };
  }, [loadCalendar]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendar();
    if (mounted.current) setRefreshing(false);
  };

  const now = Date.now();
  const todayUTC = new Date(now).toISOString().slice(0, 10);
  const currentYear = getChileDateTimeParts(now)?.fechaChile.slice(0, 4);
  const season = calendar[0]?.season ?? currentYear;
  const filteredRaces = calendar.filter((race) => {
    if (filterTab === 'todo') return true;
    // Una fecha programada pasada no implica resultados ni un estado finalizado.
    const instant = race.fechaCarreraUTC ? new Date(race.fechaCarreraUTC).getTime() : NaN;
    if (Number.isFinite(instant)) return filterTab === 'proximas' ? instant > now : instant <= now;
    if (!isValidCalendarDate(race.date)) return false;
    // Sin hora, el día UTC actual sigue siendo ambiguo y se conserva en TODO.
    return filterTab === 'proximas' ? race.date > todayUTC : race.date < todayUTC;
  });

  return (
    <View style={styles.container}>
      <Header
        subtitle={season ? `TEMPORADA ${season} • HORA DE SANTIAGO` : 'CALENDARIO • HORA DE SANTIAGO'}
        title="Calendario"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <OfflineBanner visible={Boolean(warning)} message={warning || ''} />

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
            <Text style={styles.historyTitle}>{calendar.length === 0 ? 'No hay Grandes Premios publicados para esta temporada.' : 'No hay Grandes Premios para este filtro.'}</Text>
            {calendar.length === 0 && (
              <TouchableOpacity accessibilityRole="button" onPress={loadCalendar} style={styles.tabButton}>
                <Text style={styles.tabTextActive}>Volver a consultar</Text>
              </TouchableOpacity>
            )}
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

