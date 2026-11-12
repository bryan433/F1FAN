import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

/** Control de presentación: el consumidor obtiene las temporadas y conserva la selección. */
export default function SeasonSelector({
  selectedSeason, seasons = [], visible, loading = false, error = null, warning = null,
  onOpen, onClose, onSelect, onRetry,
}) {
  return (
    <>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Seleccionar temporada del calendario"
        accessibilityState={{ expanded: visible }} onPress={onOpen} style={styles.trigger}>
        <Ionicons name="calendar-outline" size={18} color={Colors.accentOrange} />
        <Text style={styles.triggerText}>{selectedSeason ? `Temporada ${selectedSeason}` : 'Seleccionar temporada'}</Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
      </TouchableOpacity>
      {visible && (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
          <View style={styles.backdrop}>
            <View style={styles.modal} accessibilityViewIsModal>
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={styles.title}>Selecciona una temporada</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cerrar selector de temporadas"
                  onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>
              {loading && <View accessibilityState={{ busy: true }} style={styles.status}>
                <ActivityIndicator color={Colors.accentOrange} accessibilityLabel="Cargando temporadas" />
                <Text style={styles.message}>Cargando temporadas...</Text>
              </View>}
              {!loading && error && <Text accessibilityRole="alert" style={styles.message}>{error}</Text>}
              {!loading && warning && <Text accessibilityRole="alert" style={styles.message}>{warning}</Text>}
              {!loading && !error && seasons.length === 0 && (
                <Text style={styles.message}>No hay temporadas disponibles.</Text>
              )}
              {!loading && (error || warning || seasons.length === 0) && (
                <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
                  <Text style={styles.triggerText}>Reintentar temporadas</Text>
                </TouchableOpacity>
              )}
              <ScrollView accessibilityLabel="Temporadas disponibles" style={styles.list}>
                {!loading && !error && seasons.map(year => (
                  <TouchableOpacity key={year} accessibilityRole="button" accessibilityLabel={`Temporada ${year}`}
                    accessibilityState={{ selected: year === selectedSeason }}
                    onPress={() => onSelect(year)}
                    style={[styles.option, year === selectedSeason && styles.selected]}>
                    <Text style={styles.optionText}>{year}</Text>
                    {year === selectedSeason && <Ionicons name="checkmark-circle" size={18} color={Colors.accentOrange} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44, marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12,
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.backgroundCard,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.border,
  },
  triggerText: { flex: 1, color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginHorizontal: 8 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(5, 7, 10, 0.82)' },
  modal: {
    width: '100%', maxWidth: 380, height: '72%', padding: 16, borderRadius: 18,
    backgroundColor: Colors.backgroundCardElevated, borderWidth: 1, borderColor: Colors.borderHighlight,
  },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { flex: 1, color: Colors.textPrimary, fontSize: 16, fontWeight: '800' },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  status: { alignItems: 'center', paddingVertical: 12 },
  message: { color: Colors.textSecondary, fontSize: 13, paddingVertical: 10 },
  list: { flex: 1 },
  option: {
    minHeight: 44, paddingHorizontal: 16, marginBottom: 8, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', borderRadius: 10,
    backgroundColor: Colors.backgroundDark, borderWidth: 1, borderColor: Colors.border,
  },
  selected: { borderColor: Colors.accentOrange },
  optionText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  retryButton: {
    minHeight: 44, paddingHorizontal: 8, marginBottom: 12, justifyContent: 'center',
    borderRadius: 8, backgroundColor: Colors.backgroundCard,
  },
});
