import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import LocalStorageManager from '../storage/LocalStorageManager';
import { DRIVERS, TEAMS } from '../data/teamsAndDrivers';
import { Ionicons } from '@expo/vector-icons';

export default function FavoritosScreen({ navigation }) {
  const [favoriteDriverIds, setFavoriteDriverIds] = useState([63]);
  const [favoriteTeams, setFavoriteTeams] = useState(['mercedes', 'mclaren']);
  const [alerts, setAlerts] = useState({
    boxes: true,
    radio: true,
    safetyCar: true,
    leaderChange: false,
  });

  useEffect(() => {
    const loadFavs = async () => {
      const favs = await LocalStorageManager.obtenerFavoritos();
      if (favs.length > 0) setFavoriteDriverIds(favs);
      const teams = await LocalStorageManager.obtenerEscuderiasFavoritas();
      if (teams.length > 0) setFavoriteTeams(teams);
      const savedAlerts = await LocalStorageManager.obtenerAlertas();
      if (savedAlerts) setAlerts(prev => ({ ...prev, ...savedAlerts }));
    };
    loadFavs();
  }, []);

  const toggleAlert = async (key) => {
    const updated = { ...alerts, [key]: !alerts[key] };
    setAlerts(updated);
    await LocalStorageManager.guardarAlertas(updated);
  };

  const removeFavDriver = async (id) => {
    await LocalStorageManager.eliminarFavorito(id);
    setFavoriteDriverIds(favoriteDriverIds.filter(f => String(f) !== String(id)));
    Alert.alert('Favorito eliminado', 'Se actualizó tu lista de pilotos destacados.');
  };

  const favoriteDrivers = DRIVERS.filter(d => favoriteDriverIds.includes(d.idPiloto) || d.idPiloto === 63);

  return (
    <View style={styles.container}>
      <Header
        subtitle="CENTRO DE PREFERENCIAS"
        title="Favoritos"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* SECCIÓN 1: PILOTOS FAVORITOS (Mockup 12) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PILOTOS FAVORITOS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Clasificacion')}>
            <Text style={styles.headerAction}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        {favoriteDrivers.map((driver) => (
          <View key={driver.idPiloto} style={styles.favItemCard}>
            <View style={[styles.dorsalCircle, { backgroundColor: driver.colorHex }]}>
              <Text style={styles.dorsalText}>{driver.numero}</Text>
            </View>
            <View style={styles.favDetails}>
              <Text style={styles.favName}>{driver.nombre} {driver.apellido}</Text>
              <Text style={styles.favSub}>{driver.teamName} • P{driver.posicionCampeonato} ({driver.puntos} pts)</Text>
            </View>
            <TouchableOpacity onPress={() => removeFavDriver(driver.idPiloto)} style={styles.starAction}>
              <Ionicons name="star" size={20} color={Colors.accentYellow} />
            </TouchableOpacity>
          </View>
        ))}

        {/* SECCIÓN 2: ESCUDERÍAS FAVORITAS (Mockup 12) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ESCUDERÍAS FAVORITAS</Text>
          <TouchableOpacity onPress={() => Alert.alert('Escuderías', 'Selecciona escuderías en la sección de tablas.')}>
            <Text style={styles.headerAction}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.teamsChipRow}>
          {TEAMS.filter(t => favoriteTeams.includes(t.id)).map((team) => (
            <View key={team.id} style={[styles.teamChip, { borderColor: team.colorHex }]}>
              <View style={[styles.chipDot, { backgroundColor: team.colorHex }]} />
              <Text style={styles.chipText}>{team.name}</Text>
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

