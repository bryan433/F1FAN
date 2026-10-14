import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import RaceCard from '../components/RaceCard';
import OfflineBanner from '../components/OfflineBanner';
import LoadingScreen from '../components/LoadingScreen';
import F1DataService from '../services/F1DataService';

export default function CalendarioScreen({ navigation }) {
  const [filterTab, setFilterTab] = useState('todo'); // 'todo' | 'proximas' | 'resultados'
  const [calendar, setCalendar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadCalendar = async () => {
    try {
      const data = await F1DataService.getCalendar(2024);
      setCalendar(data);
      setIsOffline(F1DataService.isOfflineMode);
    } catch (e) {
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCalendar();
    setRefreshing(false);
  };

  const filteredRaces = calendar.filter((race) => {
    if (filterTab === 'proximas') return race.status === 'Próxima' || race.isLive;
    if (filterTab === 'resultados') return race.status === 'Finalizado';
    return true;
  });

  return (
    <View style={styles.container}>
      <Header
        subtitle="TEMPORADA 2024 • HORA CHILE (CLT)"
        title="Calendario"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <OfflineBanner visible={isOffline} message="Sin conexión - Mostrando calendario almacenado" />

      {/* Tabs de Filtro según Mockup 14 */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'todo', label: 'TODO' },
          { key: 'proximas', label: 'PRÓXIMAS' },
          { key: 'resultados', label: 'RESULTADOS' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, filterTab === tab.key && styles.tabButtonActive]}
            onPress={() => setFilterTab(tab.key)}
          >
            <Text style={[styles.tabText, filterTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingScreen message="Cargando calendario de carreras..." />
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />
          }
        >
          {filteredRaces.map((race) => (
            <RaceCard
              key={race.id || race.round}
              race={race}
              onPress={() => navigation.navigate('DetalleGP', { meeting: race })}
              onLivePress={() => navigation.navigate('Live')}
            />
          ))}

          {/* Registro Histórico Footer Mockup 14 */}
          <TouchableOpacity
            style={styles.historyCard}
            onPress={() => navigation.navigate('HistorialWeb')}
            activeOpacity={0.8}
          >
            <Text style={styles.historyTitle}>Registro Histórico</Text>
            <Text style={styles.historySub}>Explora resultados desde 2023 con filtros por piloto</Text>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundCardElevated,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 3,
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

