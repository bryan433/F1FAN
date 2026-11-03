import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { filterHistoricalRaces, getSeasons, getSeasonHistory } from '../services/JolpicaService';

export default function HistorialWebScreen({ navigation }) {
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [races, setRaces] = useState([]);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [loadingRaces, setLoadingRaces] = useState(false);
  const [seasonsError, setSeasonsError] = useState(null);
  const [racesError, setRacesError] = useState(null);
  const [seasonsWarning, setSeasonsWarning] = useState(null);
  const [racesWarning, setRacesWarning] = useState(null);
  const [seasonsAttempt, setSeasonsAttempt] = useState(0);
  const [racesAttempt, setRacesAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadingSeasons(true);
    setSeasonsError(null);
    getSeasons()
      .then(({ data, warning }) => {
        if (!active) return;
        setSeasons(data);
        setSeasonsWarning(warning);
        setSelectedSeason(previous => data.includes(previous) ? previous : data[0] || null);
      })
      .catch(() => {
        if (active) setSeasonsError('No se pudieron cargar las temporadas de Jolpica.');
      })
      .finally(() => {
        if (active) setLoadingSeasons(false);
      });
    return () => { active = false; };
  }, [seasonsAttempt]);

  useEffect(() => {
    if (!selectedSeason) return;
    let active = true;
    setLoadingRaces(true);
    setRaces([]);
    setRacesError(null);
    setRacesWarning(null);
    getSeasonHistory(selectedSeason)
      .then(({ data, warning }) => {
        if (!active) return;
        setRaces(data);
        setRacesWarning(warning);
      })
      .catch(() => {
        if (active) setRacesError(`No se pudieron cargar las carreras de ${selectedSeason}.`);
      })
      .finally(() => {
        if (active) setLoadingRaces(false);
      });
    // Una respuesta anterior no debe reemplazar la temporada seleccionada después.
    return () => { active = false; };
  }, [selectedSeason, racesAttempt]);

  const selectSeason = year => {
    setSelectorVisible(false);
    if (year === selectedSeason) return;
    setRaces([]);
    setRacesError(null);
    setRacesWarning(null);
    setLoadingRaces(true);
    setSelectedSeason(year);
  };

  const filteredRaces = filterHistoricalRaces(races, searchQuery);

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Volver" style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Historial Multiplataforma (Web & Móvil)</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Selector de Temporada y Buscador en el Cliente (SD-08) */}
      <View style={styles.controlBar}>
        <View style={styles.seasonRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Seleccionar temporada"
            accessibilityState={{ expanded: selectorVisible, disabled: loadingSeasons || seasons.length === 0 }}
            style={[styles.yearPill, styles.yearPillActive, styles.seasonSelector]}
            disabled={loadingSeasons || seasons.length === 0}
            onPress={() => setSelectorVisible(true)}
          >
            <Text style={[styles.yearText, styles.yearTextActive]}>
              {selectedSeason ? `Temporada ${selectedSeason}` : 'Seleccionar temporada'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            accessibilityLabel="Buscar en el historial"
            style={styles.searchInput}
            placeholder="Buscar por piloto, Gran Premio o circuito (ej: Russell, Leclerc)..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Modal
        visible={selectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.seasonModal} accessibilityViewIsModal>
            <View style={styles.modalAccentBar} />
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleBlock}>
                <Ionicons name="time" size={16} color={Colors.accentOrange} style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Selecciona una temporada</Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector"
                onPress={() => setSelectorVisible(false)}
                style={styles.modalCloseCircle}
              >
                <Ionicons name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView accessibilityLabel="Temporadas disponibles" showsVerticalScrollIndicator={false}>
              {seasons.map(year => (
                <TouchableOpacity
                  key={year}
                  accessibilityRole="button"
                  accessibilityLabel={`Temporada ${year}`}
                  accessibilityState={{ selected: year === selectedSeason }}
                  style={[styles.seasonOption, year === selectedSeason && styles.yearPillActive]}
                  onPress={() => selectSeason(year)}
                >
                  <Text style={[styles.yearText, year === selectedSeason && styles.yearTextActive]}>
                    Temporada {year}
                  </Text>
                  {year === selectedSeason && (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity accessibilityRole="button" style={[styles.yearPill, styles.modalCloseBtn]} onPress={() => setSelectorVisible(false)}>
              <Text style={styles.yearText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {(loadingSeasons || loadingRaces) && (
          <View style={styles.emptyState}>
            <ActivityIndicator color={Colors.primaryRed} />
            <Text style={styles.emptyText}>
              {loadingSeasons ? 'Cargando temporadas...' : `Cargando carreras de ${selectedSeason}...`}
            </Text>
          </View>
        )}
        {(seasonsError || racesError) && (
          <View style={styles.emptyState}>
            <Text accessibilityRole="alert" style={styles.emptyText}>{seasonsError || racesError}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.yearPill}
              onPress={() => seasonsError ? setSeasonsAttempt(value => value + 1) : setRacesAttempt(value => value + 1)}
            >
              <Text style={styles.yearText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
        {(seasonsWarning || racesWarning) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{[seasonsWarning, racesWarning].filter(Boolean).join(' ')}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.yearPill}
              onPress={() => {
                if (seasonsWarning) setSeasonsAttempt(value => value + 1);
                if (racesWarning) setRacesAttempt(value => value + 1);
              }}
            >
              <Text style={styles.yearText}>Reintentar actualización</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.dataNotice}>Clasif. P1: primera posición de clasificación informada por Jolpica. — indica datos no disponibles.</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { width: 32 }]}>RND</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>GRAN PREMIO</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>GANADOR</Text>
          <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>CLASIF. P1</Text>
        </View>

        {!loadingSeasons && !loadingRaces && !seasonsError && !racesError && (filteredRaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {seasons.length === 0
                ? 'No hay temporadas disponibles.'
                : races.length === 0
                  ? 'No hay carreras disponibles para esta temporada.'
                  : 'No se encontraron carreras con ese filtro.'}
            </Text>
          </View>
        ) : (
          filteredRaces.map((race) => (
            <View key={race.round} style={styles.row}>
              <Text style={styles.rndCol}>{race.round}</Text>
              <View style={styles.gpCol}>
                <Text style={styles.gpName}>{race.gp}</Text>
                <Text style={styles.circuitName}>{race.circuit}</Text>
              </View>
              <View style={styles.winnerCol}>
                {race.winner && <Ionicons name="trophy" size={12} color={Colors.accentYellow} style={{ marginRight: 4 }} />}
                <Text style={styles.winnerName}>{race.winner || '—'}</Text>
              </View>
              <Text style={styles.poleCol}>{race.qualifyingFirst || '—'}</Text>
            </View>
          ))
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
    fontSize: 15,
    fontWeight: '800',
  },
  controlBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  seasonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  yearPill: {
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  yearPillActive: {
    backgroundColor: Colors.primaryRed,
    borderColor: Colors.primaryRed,
  },
  yearText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  yearTextActive: {
    color: '#FFFFFF',
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  seasonModal: {
    width: '100%',
    maxWidth: 380,
    height: '72%',
    backgroundColor: Colors.backgroundCardElevated,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.borderHighlight,
    position: 'relative',
    overflow: 'hidden',
  },
  modalAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.accentOrange,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  modalTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.backgroundDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seasonOption: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.backgroundDark,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCloseBtn: {
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  dataNotice: {
    color: Colors.textSecondary,
    fontSize: 11,
    padding: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  th: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rndCol: {
    width: 32,
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  gpCol: {
    flex: 1.2,
  },
  gpName: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  circuitName: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  winnerCol: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  winnerName: {
    color: Colors.accentYellow,
    fontSize: 12,
    fontWeight: '800',
  },
  poleCol: {
    flex: 1.2,
    textAlign: 'right',
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});

