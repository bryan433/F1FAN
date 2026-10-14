import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import Header from '../components/Header';
import { NEWS_HEADLINES } from '../data/mockData';
import { Ionicons } from '@expo/vector-icons';

export default function MasScreen({ navigation }) {
  const hubOptions = [
    {
      id: 'favs',
      title: 'Favoritos',
      subtitle: 'Russell #63, Mercedes',
      icon: 'star',
      color: Colors.accentYellow,
      route: 'Favoritos'
    },
    {
      id: 'profile',
      title: 'Perfil',
      subtitle: 'Diego Morales',
      icon: 'person',
      color: Colors.accentCyan,
      route: 'Perfil'
    },
    {
      id: 'ar',
      title: 'Vista AR',
      subtitle: 'Circuito 3D en mesa',
      icon: 'cube',
      color: '#A855F7',
      route: 'RealidadAumentada'
    },
    {
      id: 'history',
      title: 'Histórico',
      subtitle: 'Desde 2023 (Panel Web)',
      icon: 'time',
      color: Colors.accentOrange,
      route: 'HistorialWeb'
    },
    {
      id: 'calendar',
      title: 'Calendario',
      subtitle: '24 Grandes Premios',
      icon: 'calendar',
      color: Colors.accentBlue,
      route: 'Calendario'
    },
    {
      id: 'basics',
      title: 'F1 Básico',
      subtitle: 'Glosario, DRS y reglas',
      icon: 'book',
      color: Colors.accentGreen,
      onPress: () => Alert.alert('F1 Básico', 'Guía rápida: DRS (Drag Reduction System) se abre en zonas designadas si estás a menos de 1.0s del auto que precede para favorecer adelantamientos.')
    }
  ];

  return (
    <View style={styles.container}>
      <Header
        subtitle="CENTRO DE RECURSOS"
        title="Más"
        onProfilePress={() => navigation.navigate('Perfil')}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Hub de Opciones en Cuadrícula (Mockup 15) */}
        <View style={styles.grid}>
          {hubOptions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem}
              onPress={() => item.route ? navigation.navigate(item.route) : item.onPress && item.onPress()}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sección Editorial y Noticias de F1 (Mockup 15) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ARTÍCULOS Y ANÁLISIS TÉCNICO</Text>
        </View>

        {NEWS_HEADLINES.map((news) => (
          <TouchableOpacity
            key={news.id}
            style={styles.newsCard}
            onPress={() => Alert.alert(news.title, `${news.subtitle}\n\nPublicado: ${news.time}`)}
            activeOpacity={0.8}
          >
            <View style={styles.badgeRow}>
              <Text style={styles.newsCategory}>{news.category}</Text>
              <Text style={styles.newsTime}>{news.time}</Text>
            </View>
            <Text style={styles.newsTitle}>{news.title}</Text>
            <Text style={styles.newsSub}>{news.subtitle}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.techExplainerCard}
          onPress={() => Alert.alert('¿Qué es un Undercut?', 'Estrategia en la que un piloto para en boxes una o dos vueltas antes que su rival para rodar más rápido con gomas frescas y superarlo cuando este pare.')}
          activeOpacity={0.8}
        >
          <Ionicons name="bulb-outline" size={20} color={Colors.accentYellow} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.explainerTitle}>¿Cómo funciona el DRS y el Undercut?</Text>
            <Text style={styles.explainerSub}>Explicación técnica en 90 segundos</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: Colors.backgroundCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  itemSubtitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  newsCategory: {
    color: Colors.accentCyan,
    fontSize: 10,
    fontWeight: '800',
  },
  newsTime: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  newsTitle: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  newsSub: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  techExplainerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundCardElevated,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  explainerTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  explainerSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});

