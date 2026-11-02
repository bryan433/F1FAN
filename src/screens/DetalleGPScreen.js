import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import SessionCard from '../components/SessionCard';
import OfflineBanner from '../components/OfflineBanner';
import { Ionicons } from '@expo/vector-icons';
import { isValidCalendarDate } from '../utils/timezone';
import OpenF1Client from '../services/OpenF1Client';

const finished = session => ['Finalizado', 'Finalizada', 'Resultados disponibles'].includes(session?.estado);
const positiveInteger = value => /^(?:[1-9]\d*)$/.test(String(value)) && Number.isSafeInteger(Number(value));

// Conserva los segmentos Q1/Q2/Q3 y los gaps por vueltas publicados por OpenF1.
function resultValue(value, gap = false) {
  if (Array.isArray(value)) return value.map(part => resultValue(part, gap)).join(' / ');
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return `${gap && value > 0 ? '+' : ''}${value.toFixed(3)} s`;
  }
  return gap && typeof value === 'string' && /^\+\d+ LAPS?$/.test(value) ? value : '—';
}

export default function DetalleGPScreen({ route, navigation }) {
  const meeting = route?.params?.meeting;
  const circuito = meeting?.circuito || {};
  const sesiones = Array.isArray(meeting?.sesiones)
    ? meeting.sesiones.filter(session => session && typeof session === 'object') : [];
  const raceSession = sesiones.find(session => session.sourceKey === 'Race'
    || ['race', 'carrera'].includes(session.tipo?.toLowerCase()));
  const [selectedSession, setSelectedSession] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [results, setResults] = useState({ session: null, loading: false, rows: [], error: null });

  useEffect(() => {
    setSelectedSession(null);
    setIsFollowing(false);
  }, [meeting]);

  useEffect(() => {
    let active = true;
    const empty = { session: selectedSession, loading: false, rows: [], error: null };
    // Nunca se infiere una clave OpenF1 desde idSesion, temporada o ronda Jolpica.
    const isOpenF1 = meeting?.source !== 'jolpica' && selectedSession?.source !== 'jolpica'
      && (selectedSession?.source ?? meeting?.source) === 'openf1';
    const key = selectedSession?.session_key;
    if (!finished(selectedSession) || !isOpenF1 || !positiveInteger(key)) {
      setResults(empty);
      return () => { active = false; };
    }
    setResults({ ...empty, loading: true });
    (async () => {
      try {
        const rows = await OpenF1Client.getSessionResults(Number(key));
        if (!active) return;
        if (!Array.isArray(rows) || rows.some(row => !row
          || String(row.session_key) !== String(key) || !positiveInteger(row.driver_number)
          || (meeting?.meeting_key != null && String(row.meeting_key) !== String(meeting.meeting_key)))) {
          throw new Error('Los resultados no corresponden a la sesión seleccionada.');
        }
        // Los nombres son opcionales: un fallo de metadatos no descarta resultados válidos.
        let drivers = [];
        if (rows.length) {
          try { drivers = await OpenF1Client.getDrivers({ session_key: Number(key) }); }
          catch { /* Se muestra el dorsal publicado sin inventar un nombre. */ }
        }
        if (!active) return;
        const data = rows.map(row => {
          const driver = Array.isArray(drivers) && drivers.find(item => item
            && String(item.session_key) === String(key) && item.driver_number === row.driver_number);
          const status = row.dsq === true ? 'DSQ' : row.dns === true ? 'DNS' : row.dnf === true ? 'DNF' : null;
          return {
            number: row.driver_number, position: positiveInteger(row.position) ? Number(row.position) : null,
            driver: driver?.full_name || `Piloto #${row.driver_number}`, team: driver?.team_name || 'Escudería no disponible',
            color: /^[0-9a-f]{6}$/i.test(driver?.team_colour) ? `#${driver.team_colour}` : Colors.textMuted,
            time: status || resultValue(row.duration),
            gap: row.position === 1 && row.gap_to_leader === 0 ? 'LÍDER' : resultValue(row.gap_to_leader, true),
          };
        }).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
        setResults({ ...empty, rows: data });
      } catch (error) {
        if (active) setResults({ ...empty, error: error.message });
      }
    })();
    return () => { active = false; };
  }, [selectedSession, meeting]);

  const displayedResults = results.session === selectedSession ? results : { rows: [], loading: false, error: null };

  const toggleFollow = () => setIsFollowing(prev => !prev);
  const season = meeting?.season ?? meeting?.temporada;
  const location = [circuito.ciudad, circuito.pais].filter(Boolean).join(', ');
  const raceDate = raceSession?.fechaChile || meeting?.dateRange
    || (isValidCalendarDate(meeting?.date) ? `${meeting.date} (fecha UTC)` : 'Fecha por confirmar');
  const raceHour = raceSession?.horaChile ? `${raceSession.horaChile} (Santiago)`
    : meeting?.localChileHour || 'Hora por confirmar';
  const positiveNumber = value => typeof value === 'number' && value > 0 && Number.isFinite(value);
  const stats = [
    ['LONGITUD', positiveNumber(circuito.longitudKm) ? `${circuito.longitudKm} km` : null],
    ['VUELTAS', positiveNumber(circuito.numeroVueltas) ? circuito.numeroVueltas : null],
    ['CURVAS', positiveNumber(circuito.numeroCurvas) ? circuito.numeroCurvas : null],
    ['RÉCORD VUELTA', circuito.recordVuelta],
  ];

  const handleSessionPress = session => {
    if (session.esLive === true || session.estado === 'En curso') {
      // Detalle es una pantalla del Stack; En Vivo pertenece a MainTabs.
      navigation.navigate('MainTabs', { screen: 'En Vivo' });
    } else {
      setSelectedSession(session);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>{meeting?.nombreCorto || meeting?.nombreOficial || meeting?.name || 'Gran Premio'}</Text>
        <TouchableOpacity accessibilityRole="button" disabled={!meeting} style={styles.followBtn} onPress={toggleFollow}>
          <Ionicons name={isFollowing ? 'notifications' : 'notifications-outline'} size={18} color={isFollowing ? Colors.accentYellow : Colors.textPrimary} />
          <Text style={[styles.followBtnText, isFollowing && { color: Colors.accentYellow }]}>
            {isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
          </Text>
        </TouchableOpacity>
      </View>

      <OfflineBanner visible={Boolean(meeting?.warning)} message={meeting?.warning || ''} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {!meeting ? (
          <View style={styles.statsCard}>
            <Text style={styles.circuitTitle}>Información del Gran Premio no disponible</Text>
            <Text style={styles.circuitLocation}>Selecciona un GP desde Inicio o Calendario.</Text>
          </View>
        ) : (
          <>
            <View style={styles.headerInfo}>
              <Text style={styles.circuitTitle}>{circuito.nombreCircuito || 'Circuito: información no disponible'}</Text>
              <Text style={styles.circuitLocation}>{location || 'Ubicación: información no disponible'}</Text>
              <Text style={styles.circuitLocation}>Temporada {season ?? 'Información no disponible'} • Ronda {meeting.round ?? 'Información no disponible'}</Text>
              <Text style={styles.circuitLocation}>{raceDate}</Text>
              <Text style={styles.circuitLocation}>{raceHour}</Text>
            </View>

            <TouchableOpacity accessibilityRole="button" style={styles.arBanner} onPress={() => navigation.navigate('RealidadAumentada')} activeOpacity={0.8}>
              <Ionicons name="cube" size={20} color="#000000" />
              <Text style={styles.arBannerText}>VER DEMOSTRACIÓN EN REALIDAD AUMENTADA</Text>
            </TouchableOpacity>
            <Text style={[styles.circuitLocation, { marginHorizontal: 16 }]}>La demostración no representa el circuito ni la telemetría de este GP.</Text>

            <View style={styles.statsCard}>
              <Text style={styles.cardSectionTitle}>MAPA Y TELEMETRÍA</Text>
              <Text style={styles.circuitLocation}>Mapa y telemetría no disponibles para este GP.</Text>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.cardSectionTitle}>FICHA TÉCNICA DEL TRAZADO</Text>
              <View style={styles.statsGrid}>
                {stats.map(([label, value]) => (
                  <View style={styles.statBox} key={label}>
                    <Text style={styles.statVal}>{value || 'Información no disponible'}</Text>
                    <Text style={styles.statLbl}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.weatherCard}>
              <Text style={styles.cardSectionTitle}>CONDICIONES METEOROLÓGICAS</Text>
              <Text style={styles.circuitLocation}>Información no disponible en el calendario de Jolpica.</Text>
            </View>

            <View style={styles.sessionsHeader}>
              <Text style={styles.cardSectionTitle}>SESIONES DEL FIN DE SEMANA</Text>
              <Text style={styles.cltNotice}>HORA DE SANTIAGO</Text>
            </View>
            {sesiones.length === 0 && (
              <Text style={[styles.circuitLocation, { marginHorizontal: 16 }]}>No hay sesiones publicadas para este GP.</Text>
            )}
            {sesiones.map((session, index) => (
              <SessionCard key={session.idSesion ?? index} session={session} onPress={() => handleSessionPress(session)} />
            ))}

            {selectedSession && (
              <View style={styles.resultsModalCard}>
                <View style={styles.resultsHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultsTitle}>RESULTADOS: {selectedSession.tipo || 'Sesión: información no disponible'}</Text>
                    {displayedResults.rows.length > 0 && <Text style={styles.resultsSubtitle}>Fuente: OpenF1 · sesión {selectedSession.session_key}</Text>}
                  </View>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar información de sesión" onPress={() => setSelectedSession(null)} style={styles.closeResultsBtn}>
                    <Ionicons name="close-circle" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.resultsTableHead}>
                  <Text style={[styles.thText, { width: 30 }]}>POS</Text>
                  <Text style={[styles.thText, { flex: 1 }]}>PILOTO</Text>
                  <Text style={[styles.thText, { width: 75, textAlign: 'right' }]}>TIEMPO</Text>
                  <Text style={[styles.thText, { width: 65, textAlign: 'right' }]}>DIF</Text>
                </View>
                {displayedResults.loading && <Text accessibilityRole="alert" style={styles.circuitLocation}>Consultando resultados publicados...</Text>}
                {displayedResults.error && <Text accessibilityRole="alert" style={styles.circuitLocation}>Resultados no disponibles: {displayedResults.error}</Text>}
                {!displayedResults.loading && !displayedResults.error && displayedResults.rows.length === 0 && <Text style={styles.circuitLocation}>
                  {finished(selectedSession)
                    ? meeting.source === 'jolpica'
                    ? 'Resultados oficiales no disponibles en el calendario de Jolpica.'
                    : 'Resultados confirmados no disponibles para esta sesión.'
                    : 'El horario publicado no confirma el estado real de la sesión.'}
                </Text>}
                {displayedResults.rows.map(row => (
                  <View key={row.number} style={styles.resultRow}>
                    <Text style={styles.resultPos}>{row.position ?? '—'}</Text>
                    <View style={[styles.teamDot, { backgroundColor: row.color }]} />
                    <View style={styles.pilotInfo}>
                      <Text style={styles.resultDriver}>{row.driver}</Text>
                      <Text style={styles.resultTeam}>{row.team}</Text>
                    </View>
                    <Text style={styles.resultTime}>{row.time}</Text>
                    <Text style={[styles.resultGap, row.gap === 'LÍDER' && styles.gapLeader]}>{row.gap}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
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
    flex: 1,
    marginHorizontal: 8,
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

