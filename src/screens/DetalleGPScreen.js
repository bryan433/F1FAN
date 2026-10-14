import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import TrackMap from '../components/TrackMap';
import SessionCard from '../components/SessionCard';
import { Ionicons } from '@expo/vector-icons';
import { CURRENT_MEETING } from '../data/mockData';

export default function DetalleGPScreen({ route, navigation }) {
  const meeting = route.params?.meeting || CURRENT_MEETING;
  const circuito = meeting.circuito || CURRENT_MEETING.circuito;
  const sesiones = meeting.sesiones || CURRENT_MEETING.sesiones;

  const [selectedSessionResults, setSelectedSessionResults] = useState(null);

  const mockSessionResults = [
    { pos: 1, code: 'LEC', driver: 'C. Leclerc', team: 'Ferrari', time: '1:31.763', gap: 'LÍDER', color: '#E8002D' },
    { pos: 2, code: 'RUS', driver: 'G. Russell', team: 'Mercedes', time: '1:31.844', gap: '+0.081s', color: '#27F4D2' },
    { pos: 3, code: 'NOR', driver: 'L. Norris', team: 'McLaren', time: '1:31.902', gap: '+0.139s', color: '#FF8000' },
    { pos: 4, code: 'VER', driver: 'M. Verstappen', team: 'Red Bull', time: '1:32.011', gap: '+0.248s', color: '#3671C6' },
    { pos: 5, code: 'HAM', driver: 'L. Hamilton', team: 'Mercedes', time: '1:32.225', gap: '+0.462s', color: '#27F4D2' },
  ];

  const handleSessionPress = (session) => {
    if (session.esLive) {
      navigation.navigate('Live');
    } else if (session.estado === 'Finalizado') {
      setSelectedSessionResults(session);
    } else {
      Alert.alert('Sesión Programada', `${session.tipo} iniciará el ${session.dia} a las ${session.horaChile} CLT.`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra superior de navegación */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{meeting.nombreCorto || meeting.name || 'Gran Premio'}</Text>
        <TouchableOpacity style={styles.followBtn} onPress={toggleFollow}>
          <Ionicons name={isFollowing ? 'notifications' : 'notifications-outline'} size={18} color={isFollowing ? Colors.accentYellow : Colors.textPrimary} />
          <Text style={[styles.followBtnText, isFollowing && { color: Colors.accentYellow }]}>
            {isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Título y Ciudad */}
        <View style={styles.headerInfo}>
          <Text style={styles.circuitTitle}>{circuito.nombreCircuito}</Text>
          <Text style={styles.circuitLocation}>{circuito.ciudad}, {circuito.pais} • Round {meeting.round || 17}</Text>
        </View>

        {/* Acceso a Vista AR según Mockup 11 */}
        <TouchableOpacity
          style={styles.arBanner}
          onPress={() => navigation.navigate('RealidadAumentada')}
          activeOpacity={0.8}
        >
          <Ionicons name="cube" size={20} color="#000000" />
          <Text style={styles.arBannerText}>VER CIRCUITO EN REALIDAD AUMENTADA</Text>
        </TouchableOpacity>

        {/* Mapa Gráfico */}
        <TrackMap circuitName={circuito.nombreCircuito} isLive={false} />

        {/* Ficha Técnica del Circuito según Mockup 11 */}
        <View style={styles.statsCard}>
          <Text style={styles.cardSectionTitle}>FICHA TÉCNICA DEL TRAZADO</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{circuito.longitudKm} km</Text>
              <Text style={styles.statLbl}>LONGITUD</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statVal}>{circuito.numeroVueltas}</Text>
              <Text style={styles.statLbl}>VUELTAS</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statVal}>{circuito.numeroCurvas}</Text>
              <Text style={styles.statLbl}>CURVAS</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statVal}>{circuito.recordVuelta}</Text>
              <Text style={styles.statLbl}>RÉCORD VUELTA</Text>
            </View>
          </View>
        </View>

        {/* Condiciones Meteorológicas */}
        <View style={styles.weatherCard}>
          <Text style={styles.cardSectionTitle}>CONDICIONES METEOROLÓGICAS</Text>
          <View style={styles.weatherRow}>
            <View style={styles.weatherItem}>
              <Ionicons name="thermometer-outline" size={18} color={Colors.accentOrange} />
              <Text style={styles.weatherText}>Aire: {circuito.temperaturaAire || '29°C'}</Text>
            </View>
            <View style={styles.weatherItem}>
              <Ionicons name="speedometer-outline" size={18} color={Colors.primaryRed} />
              <Text style={styles.weatherText}>Pista: {circuito.temperaturaPista || '38°C'}</Text>
            </View>
            <View style={styles.weatherItem}>
              <Ionicons name="water-outline" size={18} color={Colors.accentCyan} />
              <Text style={styles.weatherText}>Humedad: 76%</Text>
            </View>
          </View>
        </View>

        {/* Sesiones del Gran Premio */}
        <View style={styles.sessionsHeader}>
          <Text style={styles.cardSectionTitle}>SESIONES DEL FIN DE SEMANA</Text>
          <Text style={styles.cltNotice}>HORARIOS CHILE (CLT)</Text>
        </View>

        {sesiones.map((session) => (
          <SessionCard
            key={session.idSesion}
            session={session}
            onPress={() => handleSessionPress(session)}
          />
        ))}

        {/* Modal / Sección de Resultados de Sesión (RF-04: /session_result) */}
        {selectedSessionResults && (
          <View style={styles.resultsModalCard}>
            <View style={styles.resultsHeaderRow}>
              <View>
                <Text style={styles.resultsTitle}>RESULTADOS: {selectedSessionResults.tipo.toUpperCase()}</Text>
                <Text style={styles.resultsSubtitle}>Tiempos y diferencias oficiales (/session_result)</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedSessionResults(null)} style={styles.closeResultsBtn}>
                <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.resultsTableHead}>
              <Text style={[styles.thText, { width: 30 }]}>POS</Text>
              <Text style={[styles.thText, { flex: 1 }]}>PILOTO</Text>
              <Text style={[styles.thText, { width: 75, textAlign: 'right' }]}>TIEMPO</Text>
              <Text style={[styles.thText, { width: 65, textAlign: 'right' }]}>DIF</Text>
            </View>

            {mockSessionResults.map((res) => (
              <View key={res.pos} style={styles.resultRow}>
                <Text style={styles.resultPos}>{res.pos}</Text>
                <View style={[styles.teamDot, { backgroundColor: res.color }]} />
                <View style={styles.pilotInfo}>
                  <Text style={styles.resultDriver}>{res.driver}</Text>
                  <Text style={styles.resultTeam}>{res.team}</Text>
                </View>
                <Text style={styles.resultTime}>{res.time}</Text>
                <Text style={[styles.resultGap, res.gap === 'LÍDER' ? styles.gapLeader : null]}>
                  {res.gap}
                </Text>
              </View>
            ))}
          </View>
        )}
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
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCardElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  followBtnText: {
    color: Colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerInfo: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  circuitTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  circuitLocation: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  arBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentCyan,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  arBannerText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statsCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    width: '47%',
    backgroundColor: Colors.backgroundDark,
    padding: 12,
    borderRadius: 8,
  },
  statVal: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
  },
  weatherCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weatherText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  sessionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  cltNotice: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  resultsModalCard: {
    backgroundColor: Colors.backgroundCardElevated,
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.accentCyan,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  resultsTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultsSubtitle: {
    color: Colors.accentCyan,
    fontSize: 11,
    marginTop: 2,
  },
  closeResultsBtn: {
    padding: 2,
  },
  resultsTableHead: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 6,
  },
  thText: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  resultPos: {
    width: 30,
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  teamDot: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 8,
  },
  pilotInfo: {
    flex: 1,
  },
  resultDriver: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  resultTeam: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  resultTime: {
    width: 75,
    textAlign: 'right',
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  resultGap: {
    width: 65,
    textAlign: 'right',
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  gapLeader: {
    color: Colors.accentYellow,
    fontWeight: '800',
  },
});

