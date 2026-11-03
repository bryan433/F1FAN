import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
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
    email: null,
    isGuest: true,
    tag: '@diegof1',
    carrerasVistas: 47,
    polesAcertadas: 12,
    aniosFan: 9
  });

  // Estado del modal de autenticación con Supabase
  const [modalVisible, setModalVisible] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nombreInput, setNombreInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await LocalStorageManager.obtenerAjustes();
      if (saved) setSettings(saved);
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(prev => ({
          ...prev,
          nombre: currentUser.nombre || prev.nombre,
          email: currentUser.email || null,
          isGuest: Boolean(currentUser.isGuest)
        }));
      }
    };
    loadSettings();
  }, []);

  const handleAuthSubmit = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      Alert.alert('Datos requeridos', 'Por favor ingresa correo y contraseña.');
      return;
    }
    setAuthLoading(true);
    try {
      if (isRegister) {
        await AuthService.signUp(emailInput.trim(), passwordInput, nombreInput.trim() || undefined);
        Alert.alert('Cuenta creada', 'Te has registrado con éxito en Supabase.');
      } else {
        await AuthService.login(emailInput.trim(), passwordInput);
        Alert.alert('Sesión iniciada', 'Bienvenido a F1Fan.');
      }
      const updatedUser = await AuthService.getCurrentUser();
      if (updatedUser) {
        setUser(prev => ({
          ...prev,
          nombre: updatedUser.nombre || emailInput.split('@')[0],
          email: updatedUser.email,
          isGuest: false
        }));
      }
      setModalVisible(false);
      setEmailInput('');
      setPasswordInput('');
      setNombreInput('');
    } catch (err) {
      Alert.alert('Error de autenticación', err.message || 'No se pudo completar la operación.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(prev => ({
      ...prev,
      nombre: 'Aficionado F1',
      email: null,
      isGuest: true
    }));
    Alert.alert('Sesión cerrada', 'Ahora estás en modo invitado local.');
  };

  const handleSyncCloud = async () => {
    setSyncLoading(true);
    try {
      const res = await AuthService.sincronizarFavoritosConSupabase();
      if (res.ok) {
        Alert.alert('Sincronización exitosa ☁️', `Tus favoritos están respaldados en Supabase (${res.count} elementos sincronizados).`);
      } else {
        Alert.alert('Aviso', res.error || 'Inicia sesión para sincronizar.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Fallo de sincronización.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Solo se envía el ajuste modificado: si la carga inicial falló, los valores en pantalla
  // son los predeterminados y no deben pisar los ajustes reales guardados.
  const saveSetting = async (key, value) => {
    const previous = settings[key];
    setSettings(prev => ({ ...prev, [key]: value }));
    if (await LocalStorageManager.guardarAjustes({ [key]: value })) return;
    setSettings(prev => ({ ...prev, [key]: previous }));
    Alert.alert('No se pudo guardar el ajuste', 'Se mantuvo el valor anterior. Inténtalo de nuevo.');
  };

  const handleToggle = key => saveSetting(key, !settings[key]);

  const handleToggleUnits = () => saveSetting('unidades', settings.unidades === 'km/h' ? 'mph' : 'km/h');

  const initials = (user.nombre || 'Fan')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver"
          style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Perfil & Ajustes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta de Perfil de Fan */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitial}>{initials || 'F1'}</Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.userName}>{user.nombre}</Text>
            <Text style={styles.userTag}>
              {user.email ? user.email : `${user.tag} • Fan Platinum`}
            </Text>
            <View style={styles.statusBadgeRow}>
              <View style={[styles.statusDot, { backgroundColor: user.email ? Colors.accentGreen : Colors.accentYellow }]} />
              <Text style={styles.statusText}>
                {user.email ? 'Conectado a Supabase' : 'Modo Local (AsyncStorage)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Botones de Acción de Autenticación y Nube */}
        <View style={styles.authActionContainer}>
          {user.email ? (
            <View style={styles.authButtonsRow}>
              <TouchableOpacity
                style={[styles.btnAction, styles.btnSync]}
                onPress={handleSyncCloud}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnActionText}>Sincronizar Nube</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnAction, styles.btnLogout]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={16} color={Colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={styles.btnLogoutText}>Salir</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.btnLoginModal}
              onPress={() => { setIsRegister(false); setModalVisible(true); }}
            >
              <Ionicons name="cloud-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnLoginModalText}>Iniciar Sesión / Cuenta en Supabase</Text>
            </TouchableOpacity>
          )}
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
              accessibilityRole="switch"
              accessibilityLabel="Modo Experto"
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
              accessibilityRole="switch"
              accessibilityLabel="Evitar Spoilers"
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
              accessibilityRole="switch"
              accessibilityLabel="Hora Local de Chile (CLT)"
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

      {/* Modal de Inicio de Sesión y Registro con Supabase */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isRegister ? 'Crear Cuenta Supabase' : 'Iniciar Sesión'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Conecta tu cuenta para sincronizar tus pilotos y escuderías favoritas en la nube y verlos en la web.
            </Text>

            {isRegister && (
              <TextInput
                style={styles.modalInput}
                placeholder="Nombre o apodo"
                placeholderTextColor={Colors.textMuted}
                value={nombreInput}
                onChangeText={setNombreInput}
                autoCapitalize="words"
              />
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Correo electrónico"
              placeholderTextColor={Colors.textMuted}
              value={emailInput}
              onChangeText={setEmailInput}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Contraseña"
              placeholderTextColor={Colors.textMuted}
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry={true}
            />

            <TouchableOpacity
              style={styles.modalSubmitButton}
              onPress={handleAuthSubmit}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitButtonText}>
                  {isRegister ? 'Registrarme en Supabase' : 'Ingresar'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalToggleLink}
              onPress={() => setIsRegister(prev => !prev)}
            >
              <Text style={styles.modalToggleLinkText}>
                {isRegister
                  ? '¿Ya tienes cuenta? Inicia sesión aquí'
                  : '¿No tienes cuenta? Regístrate gratis aquí'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  authActionContainer: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  authButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnSync: {
    backgroundColor: '#1E40AF',
  },
  btnActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnLogout: {
    flex: 0.45,
    backgroundColor: Colors.backgroundCardElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnLogoutText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  btnLoginModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.f1Red,
    paddingVertical: 11,
    borderRadius: 8,
  },
  btnLoginModalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 17,
  },
  modalInput: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: Colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  modalSubmitButton: {
    backgroundColor: Colors.f1Red,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  modalSubmitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalToggleLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  modalToggleLinkText: {
    color: Colors.accentCyan,
    fontSize: 12,
    fontWeight: '600',
  },
});

