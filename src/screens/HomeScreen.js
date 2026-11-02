import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import CountdownTimer from '../components/CountdownTimer';
import SessionCard from '../components/SessionCard';
import OfflineBanner from '../components/OfflineBanner';
import LoadingScreen from '../components/LoadingScreen';
import F1DataService from '../services/F1DataService';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen({ navigation }) {
  const [nextRace, setNextRace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const mounted = useRef(false);
  const request = useRef(0);

  const loadData = useCallback(async () => {
    const currentRequest = ++request.current;
    setLoading(true);
    setError(null);
    setNextRace(null);
    try {
      const race = await F1DataService.getNextRace();
      if (!race || typeof race.disponible !== 'boolean') throw new Error('Respuesta de calendario no válida.');
      if (!mounted.current || currentRequest !== request.current) return;
      setNextRace(race);
      setIsOffline(F1DataService.isOfflineMode);
    } catch (cause) {
      if (!mounted.current || currentRequest !== request.current) return;
      setIsOffline(true);
      setError('No se pudo consultar el próximo Gran Premio.');
    } finally {
      if (mounted.current && currentRequest === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = F1DataService.subscribeConnectionChange(status => {
      if (mounted.current) setIsOffline(status);
    });
    loadData();
    return () => {
      mounted.current = false;
      request.current += 1;
      unsubscribe();
    };
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (mounted.current) setRefreshing(false);
  };

  const hasRace = nextRace?.disponible === true;
  const sessions = hasRace && Array.isArray(nextRace.sesiones) ? nextRace.sesiones : [];
  const liveSession = sessions.find(session => session.esLive === true || session.estado === 'En curso');
  const hasRaceTime = hasRace && typeof nextRace.fechaCarreraUTC === 'string'
    && nextRace.fechaCarreraUTC.includes('T') && Number.isFinite(new Date(nextRace.fechaCarreraUTC).getTime());
  const season = hasRace ? nextRace.season ?? nextRace.temporada : null;
  const raceTitle = nextRace?.nombreOficial || nextRace?.nombreCorto || 'Gran Premio por confirmar';
  const warning = nextRace?.warning;

  return (
    <View style={styles.container}>
      <Header
        subtitle={season != null ? `TEMPORADA ${season}` : 'CALENDARIO DE FÓRMULA 1'}
        title="Hola, Diego"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <OfflineBanner
        visible={Boolean(warning) || (isOffline && hasRace)}
        message={warning || 'No se ha podido verificar la conexión. Los horarios pueden estar desactualizados.'}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primaryRed} />
        }
      >
        {loading && <LoadingScreen message="Consultando próximo Gran Premio..." />}

        {!loading && error && (
          <View style={styles.liveBanner}>
            <Text accessibilityRole="alert" style={styles.liveTitle}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.liveButton} onPress={loadData}>
              <Text style={styles.liveButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && nextRace?.disponible === false && (
          <View style={styles.liveBanner}>
            <Text style={styles.liveTitle}>
              {nextRace.estadoConsulta === 'calendario_incompleto' ? 'Calendario incompleto' : 'Sin próxima carrera publicada'}
            </Text>
            <Text style={styles.liveSub}>
              {nextRace.estadoConsulta === 'calendario_incompleto'
                ? 'Faltan fechas u horarios para identificar con seguridad el próximo Gran Premio.'
                : 'Vuelve a consultar cuando se publique una próxima carrera.'}
            </Text>
            <TouchableOpacity accessibilityRole="button" style={styles.liveButton} onPress={loadData}>
              <Text style={styles.liveButtonText}>Volver a consultar</Text>
            </TouchableOpacity>
          </View>
        )}

        {hasRace && (
          <>
            {hasRaceTime ? (
              <CountdownTimer
                targetDate={nextRace.fechaCarreraUTC}
                title={raceTitle}
                country={nextRace.pais}
                location={nextRace.circuito?.nombreCircuito}
                round={nextRace.round}
                totalRounds={nextRace.totalRounds}
                onCalendarPress={() => navigation.navigate('Calendario')}
              />
            ) : (
              <View style={styles.liveBanner}>
                <Text style={styles.liveTitle}>{raceTitle}</Text>
                {nextRace.circuito?.nombreCircuito ? <Text style={styles.liveSub}>{nextRace.circuito.nombreCircuito}</Text> : null}
                <Text style={styles.liveSub}>Hora de carrera por confirmar. Cuenta regresiva no disponible.</Text>
                {nextRace.date ? <Text style={styles.liveSub}>Fecha publicada: {nextRace.date} (UTC)</Text> : null}
              </View>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.liveButton, { marginHorizontal: 16, marginBottom: 16 }]}
              onPress={() => navigation.navigate('DetalleGP', { meeting: nextRace })}
            >
              <Text style={styles.liveButtonText}>Ver detalle del GP</Text>
            </TouchableOpacity>

            {liveSession && (
              <TouchableOpacity accessibilityRole="button" style={styles.liveBanner} onPress={() => navigation.navigate('En Vivo')}>
                <Text style={styles.liveTagText}>SESIÓN CONFIRMADA EN CURSO</Text>
                <Text style={styles.liveTitle}>{liveSession.tipo}</Text>
                <Text style={styles.liveButtonText}>ABRIR EN VIVO</Text>
              </TouchableOpacity>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SESIONES DEL FIN DE SEMANA</Text>
              <Text style={styles.sectionSub}>HORA DE SANTIAGO</Text>
            </View>
            {sessions.length === 0 && <Text style={[styles.liveSub, { marginHorizontal: 16 }]}>No hay sesiones publicadas para este GP.</Text>}
            {sessions.map(session => (
              <SessionCard
                key={session.idSesion}
                session={session}
                onPress={() => {
                  if (session.esLive === true || session.estado === 'En curso') {
                    navigation.navigate('En Vivo');
                  } else {
                    navigation.navigate('DetalleGP', { meeting: nextRace });
                  }
                }}
              />
            ))}
          </>
        )}

        <View style={styles.quickAccessRow}>
          <TouchableOpacity accessibilityRole="button" style={styles.quickCard} onPress={() => navigation.navigate('RealidadAumentada')} activeOpacity={0.8}>
            <Ionicons name="cube-outline" size={20} color={Colors.accentCyan} />
            <Text style={styles.quickTitle}>Ver Circuito en RA</Text>
            <Text style={styles.quickSub}>Vista de demostración</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.quickCard} onPress={() => navigation.navigate('Comparador')} activeOpacity={0.8}>
            <Ionicons name="stats-chart" size={20} color={Colors.accentOrange} />
            <Text style={styles.quickTitle}>Comparador</Text>
            <Text style={styles.quickSub}>Estadísticas de pilotos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>GUÍAS Y RECURSOS DE F1</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" style={styles.newsCard} onPress={() => navigation.navigate('Más')} activeOpacity={0.8}>
          <Text style={styles.newsTitle}>Explora los recursos de F1Fan</Text>
          <Text style={styles.newsSubtitle}>Consulta las guías y opciones disponibles.</Text>
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

