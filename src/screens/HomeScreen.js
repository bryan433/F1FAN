import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import CountdownTimer from '../components/CountdownTimer';
import SessionCard from '../components/SessionCard';
import OfflineBanner from '../components/OfflineBanner';
import F1DataService from '../services/F1DataService';
import { NEWS_HEADLINES } from '../data/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [nextRace, setNextRace] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const loadData = async () => {
    try {
      const race = await F1DataService.getNextRace();
      setNextRace(race);
      setIsOffline(F1DataService.isOfflineMode);
    } catch (e) {
      setIsOffline(true);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = F1DataService.subscribeConnectionChange(setIsOffline);
    return () => unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Header
        subtitle="TEMPORADA 2024 • EN VIVO"
        title="Hola, Diego"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <OfflineBanner visible={isOffline} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />
        }
      >
        {/* Banner y Contador Regresivo */}
        <CountdownTimer
          targetDate={nextRace ? nextRace.calcularTiempoRestante() : null}
          round={nextRace ? nextRace.round : 17}
          totalRounds={nextRace ? nextRace.totalRounds : 24}
          location="MARINA BAY - SINGAPUR"
          onCalendarPress={() => navigation.navigate('Calendario')}
        />

        {/* Tarjeta de Sesión en Vivo destacada */}
        <TouchableOpacity
          style={styles.liveBanner}
          onPress={() => navigation.navigate('Live')}
          activeOpacity={0.85}
        >
          <View style={styles.liveHeader}>
            <View style={styles.liveTag}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveTagText}>SESIÓN EN PISTA</Text>
            </View>
            <Text style={styles.liveLap}>VUELTA 12 / 25</Text>
          </View>
          <Text style={styles.liveTitle}>Practice 2 • Marina Bay</Text>
          <Text style={styles.liveSub}>L. Norris lidera con 1:29.812 • Russell P3 a 0.212s</Text>
          <View style={styles.liveButton}>
            <Text style={styles.liveButtonText}>ABRIR LIVE TIMING & TELEMETRÍA</Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </View>
        </TouchableOpacity>

        {/* Sección de Sesiones del Fin de Semana */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>SESIONES DEL FIN DE SEMANA</Text>
          <Text style={styles.sectionSub}>HORA DE CHILE (CLT)</Text>
        </View>

        {nextRace && nextRace.sesiones && nextRace.sesiones.map((session) => (
          <SessionCard
            key={session.idSesion}
            session={session}
            onPress={() => {
              if (session.esLive) {
                navigation.navigate('Live');
              } else {
                navigation.navigate('DetalleGP', { meeting: nextRace });
              }
            }}
          />
        ))}

        {/* Accesos Rápidos según Mockup 01 */}
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('RealidadAumentada')}
            activeOpacity={0.8}
          >
            <Ionicons name="cube-outline" size={20} color={Colors.accentCyan} />
            <Text style={styles.quickTitle}>Ver Circuito en RA</Text>
            <Text style={styles.quickSub}>3D sobre tu mesa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => navigation.navigate('Comparador')}
            activeOpacity={0.8}
          >
            <Ionicons name="stats-chart" size={20} color={Colors.accentOrange} />
            <Text style={styles.quickTitle}>Comparador</Text>
            <Text style={styles.quickSub}>Norris vs Verstappen</Text>
          </TouchableOpacity>
        </View>

        {/* Noticias y F1 Insights (Mockup 03 - Editorial) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>LA HISTORIA DEL FIN DE SEMANA</Text>
        </View>

        {NEWS_HEADLINES.map((news) => (
          <TouchableOpacity
            key={news.id}
            style={styles.newsCard}
            onPress={() => navigation.navigate('Mas')}
            activeOpacity={0.8}
          >
            <View style={styles.newsBadge}>
              <Text style={styles.newsCategory}>{news.category}</Text>
              <Text style={styles.newsTime}>{news.time}</Text>
            </View>
            <Text style={styles.newsTitle}>{news.title}</Text>
            <Text style={styles.newsSubtitle}>{news.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  liveBanner: {
    backgroundColor: '#141E28',
    borderRadius: 14,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.accentCyan,
    marginBottom: 16,
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(225, 6, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryRed,
    marginRight: 6,
  },
  liveTagText: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveLap: {
    color: Colors.accentCyan,
    fontSize: 11,
    fontWeight: '800',
  },
  liveTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  liveSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  liveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentCyan,
    paddingVertical: 9,
    borderRadius: 8,
  },
  liveButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionSub: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  quickAccessRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    gap: 10,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  quickSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  newsCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  newsBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  newsCategory: {
    color: Colors.accentCyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  newsTime: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  newsTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
    marginBottom: 4,
  },
  newsSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});

