import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import LocalStorageManager from '../storage/LocalStorageManager';
import AuthService from '../services/AuthService';
import { Ionicons } from '@expo/vector-icons';

export default function PerfilScreen({ navigation }) {
  const [settings, setSettings] = useState({
    modoExperto: false,
    evitarSpoilers: false,
    unidades: 'km/h',
    horaChilenaActivada: true,
  });
  const [user, setUser] = useState({
    nombre: 'Diego Morales',
    tag: '@diegof1',
    carrerasVistas: 47,
    polesAcertadas: 12,
    aniosFan: 9
  });

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await LocalStorageManager.obtenerAjustes();
      if (saved) setSettings(saved);
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) setUser(prev => ({ ...prev, nombre: currentUser.nombre }));
    };
    loadSettings();
  }, []);

  const handleToggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    await LocalStorageManager.guardarAjustes(updated);
  };

  const handleToggleUnits = async () => {
    const newUnit = settings.unidades === 'km/h' ? 'mph' : 'km/h';
    const updated = { ...settings, unidades: newUnit };
    setSettings(updated);
    await LocalStorageManager.guardarAjustes(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Perfil & Ajustes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta de Perfil de Fan (Mockup 13) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitial}>DM</Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.userName}>{user.nombre}</Text>
            <Text style={styles.userTag}>{user.tag} • Fan Platinum</Text>
          </View>
        </View>

        {/* Insignias / Métricas del Aficionado (Mockup 13) */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricVal}>{user.carrerasVistas}</Text>
            <Text style={styles.metricLbl}>CARRERAS VISTAS</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: Colors.accentYellow }]}>{user.polesAcertadas}</Text>
            <Text style={styles.metricLbl}>POLES ACERTADAS</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: Colors.accentCyan }]}>{user.aniosFan}</Text>
            <Text style={styles.metricLbl}>AÑOS FAN</Text>
          </View>
        </View>

        {/* Actividad en Temporada (Mockup 13) */}
        <View style={styles.activityCard}>
          <Text style={styles.cardHeading}>ACTIVIDAD EN TEMPORADA 2024</Text>
          <View style={styles.barsContainer}>
            {[40, 65, 80, 50, 95, 70, 85, 60, 90, 75, 80, 100].map((h, i) => (
              <View key={i} style={styles.barCol}>
                <View style={[styles.barFill, { height: `${h}%`, backgroundColor: i === 11 ? Colors.accentCyan : Colors.borderHighlight }]} />
                <Text style={styles.barLabel}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Sección de Ajustes (Mockup 13) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AJUSTES DE LA APLICACIÓN</Text>
        </View>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Modo Experto</Text>
              <Text style={styles.settingDesc}>Habilita telemetría detallada y micro-sectores</Text>
            </View>
            <Switch
              value={settings.modoExperto}
              onValueChange={() => handleToggle('modoExperto')}
              trackColor={{ false: Colors.backgroundDark, true: Colors.accentCyan }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Evitar Spoilers</Text>
              <Text style={styles.settingDesc}>Oculta posiciones y podios hasta abrir la carrera</Text>
            </View>
            <Switch
              value={settings.evitarSpoilers}
              onValueChange={() => handleToggle('evitarSpoilers')}
              trackColor={{ false: Colors.backgroundDark, true: Colors.accentCyan }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Hora Local de Chile (CLT)</Text>
              <Text style={styles.settingDesc}>Ajuste automático según HU-02 a Santiago</Text>
            </View>
            <Switch
              value={settings.horaChilenaActivada}
              onValueChange={() => handleToggle('horaChilenaActivada')}
              trackColor={{ false: Colors.backgroundDark, true: Colors.accentGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity style={[styles.settingRow, { borderBottomWidth: 0 }]} onPress={handleToggleUnits}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingName}>Unidades de Velocidad</Text>
              <Text style={styles.settingDesc}>Sistema de medición para telemetría y live</Text>
            </View>
            <View style={styles.unitBadge}>
              <Text style={styles.unitText}>{settings.unidades}</Text>
            </View>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCard,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.backgroundCardElevated,
    borderWidth: 2,
    borderColor: Colors.accentCyan,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitial: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  nameBlock: {
    flex: 1,
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },
  userTag: {
    color: Colors.accentCyan,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: Colors.backgroundCard,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricVal: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
  },
  metricLbl: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },
  activityCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeading: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 70,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: 6,
    borderRadius: 3,
  },
  barLabel: {
    color: Colors.textMuted,
    fontSize: 8,
    marginTop: 6,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  settingsCard: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  settingDesc: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  unitBadge: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accentCyan,
  },
  unitText: {
    color: Colors.accentCyan,
    fontSize: 12,
    fontWeight: '800',
  },
});

