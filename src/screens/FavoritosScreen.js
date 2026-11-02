import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import LocalStorageManager from '../storage/LocalStorageManager';
import F1DataService from '../services/F1DataService';
import { resolveDriverFavorites, resolveTeamFavorites } from '../utils/favorites';
import { Ionicons } from '@expo/vector-icons';

export default function FavoritosScreen({ navigation }) {
  const [favoriteRecords, setFavoriteRecords] = useState([]);
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [catalog, setCatalog] = useState({ drivers: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [lookupWarning, setLookupWarning] = useState(false);
  const [alerts, setAlerts] = useState({
    boxes: true, radio: true, safetyCar: true, leaderChange: false,
  });
  const mounted = useRef(true);
  const inFlight = useRef(null);
  const preferenceRequest = useRef(0);

  const loadPreferences = useCallback(async () => {
    const request = ++preferenceRequest.current;
    const [records, teams] = await Promise.all([
      LocalStorageManager.obtenerDetalleFavoritos(), LocalStorageManager.obtenerEscuderiasFavoritas(),
    ]);
    if (mounted.current && request === preferenceRequest.current) {
      setFavoriteRecords(records);
      setFavoriteTeams(teams);
    }
  }, []);

  const loadFavs = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const promise = (async () => {
      const [, savedAlerts] = await Promise.all([loadPreferences(), LocalStorageManager.obtenerAlertas()]);
      if (!mounted.current) return;
      setAlerts(prev => ({ ...prev, ...savedAlerts }));
      try {
        // Reutiliza el servicio/caché existentes; no transforma clasificaciones ni sus cifras.
        const standings = await F1DataService.getChampionshipStandings();
        if (mounted.current) {
          setCatalog({ drivers: standings.drivers.data, teams: standings.teams.data });
          setLookupWarning(Boolean(standings.drivers.error || standings.teams.error));
        }
      } catch {
        if (mounted.current) {
          setCatalog({ drivers: [], teams: [] });
          setLookupWarning(true);
        }
      }
      // Si cambió una preferencia mientras se resolvía la consulta, gana lo persistido.
      await loadPreferences();
    })().finally(() => {
      inFlight.current = null;
      if (mounted.current) setLoading(false);
    });
    inFlight.current = promise;
    return promise;
  }, [loadPreferences]);

  useEffect(() => {
    mounted.current = true;
    loadFavs();
    const unsubscribe = navigation.addListener('focus', loadFavs);
    const unsubscribePreferences = LocalStorageManager.suscribirFavoritos(loadPreferences);
    return () => { mounted.current = false; unsubscribe(); unsubscribePreferences(); };
  }, [navigation, loadFavs, loadPreferences]);

  const toggleAlert = async key => {
    const updated = { ...alerts, [key]: !alerts[key] };
    setAlerts(updated);
    await LocalStorageManager.guardarAlertas(updated);
  };

  const removeFavDriver = async driver => {
    if (!await LocalStorageManager.eliminarFavorito(driver.savedIds)) {
      Alert.alert('No se pudo eliminar el favorito', 'La preferencia guardada se conserva.');
      await loadPreferences();
      return;
    }
    await loadPreferences();
    Alert.alert('Favorito eliminado', 'Se actualizó tu lista de pilotos destacados.');
  };

  const removeFavTeam = async id => {
    await LocalStorageManager.toggleEscuderiaFavorita(id);
    await loadPreferences();
  };

  const openStandings = () => navigation.navigate('MainTabs', { screen: 'Tablas' });
  const goBack = () => {
    if (navigation.canGoBack?.()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: 'Más' });
  };
  const favoriteDrivers = resolveDriverFavorites(favoriteRecords, catalog.drivers);
  const favoriteTeamItems = resolveTeamFavorites(favoriteTeams, catalog.teams);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver"
          accessibilityHint="Regresa a la pantalla anterior o a Más" onPress={goBack}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Header subtitle="CENTRO DE PREFERENCIAS" title="Favoritos"
            onProfilePress={() => navigation.navigate('Perfil')} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading && <Text style={styles.favSub}>Cargando favoritos...</Text>}
        {lookupWarning && <Text style={styles.favSub}>No se pudo actualizar la información de clasificación. Tus favoritos guardados se conservan.</Text>}
        {/* SECCIÓN 1: PILOTOS FAVORITOS (Mockup 12) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PILOTOS FAVORITOS</Text>
          <TouchableOpacity accessibilityLabel="Añadir piloto favorito" onPress={openStandings}>
            <Text style={styles.headerAction}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        {!loading && !favoriteDrivers.length && <Text style={styles.favSub}>No tienes pilotos favoritos guardados.</Text>}
        {favoriteDrivers.map((driver) => (
          <View key={driver.key} style={styles.favItemCard}>
            <View style={[styles.dorsalCircle, { backgroundColor: driver.color }]}>
              <Text style={styles.dorsalText}>{driver.number}</Text>
            </View>
            <View style={styles.favDetails}>
              <Text style={styles.favName}>{driver.name}</Text>
              <Text style={styles.favSub}>{driver.subtitle}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Quitar piloto favorito ${driver.name}`}
              onPress={() => removeFavDriver(driver)} style={styles.starAction}>
              <Ionicons name="star" size={20} color={Colors.accentYellow} />
            </TouchableOpacity>
          </View>
        ))}

        {/* SECCIÓN 2: ESCUDERÍAS FAVORITAS (Mockup 12) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ESCUDERÍAS FAVORITAS</Text>
          <TouchableOpacity accessibilityLabel="Elegir escuderías favoritas" onPress={openStandings}>
            <Text style={styles.headerAction}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.teamsChipRow}>
          {!loading && !favoriteTeamItems.length && <Text style={styles.favSub}>No tienes escuderías favoritas guardadas.</Text>}
          {favoriteTeamItems.map((team) => (
            <View key={team.id} style={[styles.teamChip, { borderColor: team.color }]}>
              <View style={[styles.chipDot, { backgroundColor: team.color }]} />
              <Text style={styles.chipText}>{team.name}</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Quitar escudería favorita ${team.name}`}
                onPress={() => removeFavTeam(team.id)} style={styles.starAction}>
                <Ionicons name="close" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* SECCIÓN 3: ALERTAS DE CARRERA (Mockup 12) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>NOTIFICACIONES DE CARRERA</Text>
        </View>

        <View style={styles.alertsCard}>
          <View style={styles.alertRow}>
            <View style={styles.alertInfo}>
              <Ionicons name="flag-outline" size={18} color={Colors.accentCyan} style={styles.alertIcon} />
              <View>
                <Text style={styles.alertTitle}>Mi piloto entra a boxes</Text>
                <Text style={styles.alertDesc}>Aviso inmediato cuando cambie de compuesto</Text>
              </View>
            </View>
            <Switch
              value={alerts.boxes}
              onValueChange={() => toggleAlert('boxes')}
              trackColor={{ false: Colors.backgroundDark, true: Colors.accentCyan }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.alertRow}>
            <View style={styles.alertInfo}>
              <Ionicons name="radio-outline" size={18} color={Colors.accentOrange} style={styles.alertIcon} />
              <View>
                <Text style={styles.alertTitle}>Radio de mi piloto</Text>
                <Text style={styles.alertDesc}>Mensajes de voz y transcripción del equipo</Text>
              </View>
            </View>
            <Switch
              value={alerts.radio}
              onValueChange={() => toggleAlert('radio')}
              trackColor={{ false: Colors.backgroundDark, true: Colors.accentCyan }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.alertRow}>
            <View style={styles.alertInfo}>
              <Ionicons name="warning-outline" size={18} color={Colors.primaryRed} style={styles.alertIcon} />
              <View>
                <Text style={styles.alertTitle}>Bandera roja o Safety Car</Text>
                <Text style={styles.alertDesc}>Incidentes mayores e interrupción de sesión</Text>
              </View>
            </View>
            <Switch
              value={alerts.safetyCar}
              onValueChange={() => toggleAlert('safetyCar')}
              trackColor={{ false: Colors.backgroundDark, true: Colors.accentCyan }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.alertRow, { borderBottomWidth: 0 }]}>
            <View style={styles.alertInfo}>
              <Ionicons name="swap-vertical-outline" size={18} color={Colors.accentYellow} style={styles.alertIcon} />
              <View>
                <Text style={styles.alertTitle}>Cada cambio de líder</Text>
                <Text style={styles.alertDesc}>Adelantamientos en el podio de carrera</Text>
              </View>
            </View>
            <Switch
              value={alerts.leaderChange}
              onValueChange={() => toggleAlert('leaderChange')}
              trackColor={{ false: Colors.backgroundDark, true: Colors.accentCyan }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerAction: {
    color: Colors.accentCyan,
    fontSize: 12,
    fontWeight: '700',
  },
  favItemCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dorsalCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dorsalText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  favDetails: {
    flex: 1,
  },
  favName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  favSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  starAction: {
    padding: 6,
  },
  teamsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
  },
  teamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  chipText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  alertsCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    marginHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  alertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  alertDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});

