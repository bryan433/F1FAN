import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

// Coordenadas normalizadas aproximadas del trazado de Marina Bay Street Circuit
const TRACK_POINTS = [
  { x: 30, y: 70 },
  { x: 70, y: 70 },
  { x: 120, y: 72 },
  { x: 160, y: 55 },
  { x: 190, y: 45 },
  { x: 230, y: 48 },
  { x: 260, y: 75 },
  { x: 280, y: 110 },
  { x: 275, y: 140 },
  { x: 245, y: 155 },
  { x: 210, y: 140 },
  { x: 180, y: 160 },
  { x: 140, y: 170 },
  { x: 90, y: 165 },
  { x: 60, y: 145 },
  { x: 40, y: 115 },
  { x: 30, y: 70 },
];

export default function TrackMap({ circuitName = 'MARINA BAY STREET CIRCUIT', isLive = true }) {
  const [carProgress, setCarProgress] = useState(0);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setCarProgress(prev => (prev + 1) % TRACK_POINTS.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLive]);

  const carPos = TRACK_POINTS[carProgress] || TRACK_POINTS[0];
  const secondCarIndex = (carProgress + 3) % TRACK_POINTS.length;
  const car2Pos = TRACK_POINTS[secondCarIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.trackName}>{circuitName}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>EN VIVO • V12</Text>
        </View>
      </View>

      <View style={styles.mapCanvas}>
        {/* Renderizado de segmentos del trazado */}
        {TRACK_POINTS.map((pt, index) => {
          if (index === TRACK_POINTS.length - 1) return null;
          const next = TRACK_POINTS[index + 1];
          const midX = (pt.x + next.x) / 2;
          const midY = (pt.y + next.y) / 2;
          const length = Math.hypot(next.x - pt.x, next.y - pt.y);
          const angle = Math.atan2(next.y - pt.y, next.x - pt.x) * (180 / Math.PI);

          return (
            <View
              key={index}
              style={[
                styles.trackSegment,
                {
                  left: midX - length / 2,
                  top: midY,
                  width: length,
                  transform: [{ rotate: `${angle}deg` }],
                },
              ]}
            />
          );
        })}

        {/* Marcadores de Curvas Principales */}
        <View style={[styles.cornerPin, { left: 190, top: 40 }]}>
          <Text style={styles.cornerText}>T7</Text>
        </View>
        <View style={[styles.cornerPin, { left: 275, top: 135 }]}>
          <Text style={styles.cornerText}>T14</Text>
        </View>

        {/* Auto Líder (L. Norris - McLaren Orange #FF8000) */}
        <View style={[styles.carMarker, { left: car2Pos.x - 7, top: car2Pos.y - 7, backgroundColor: '#FF8000' }]}>
          <Text style={styles.carCode}>4</Text>
        </View>

        {/* Auto de Russell (Mercedes Cyan #27F4D2 con aura de favorito) */}
        <View style={[styles.carMarker, styles.favCar, { left: carPos.x - 9, top: carPos.y - 9, backgroundColor: '#27F4D2' }]}>
          <Text style={styles.carCodeFav}>63</Text>
        </View>
      </View>

      {/* Leyenda del Mapa */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF8000' }]} />
          <Text style={styles.legendText}>NOR #4 (P1)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#27F4D2' }]} />
          <Text style={styles.legendText}>RUS #63 (P3 ★)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E10600' }]} />
          <Text style={styles.legendText}>Zona DRS 1 & 2</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundDark,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trackName: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusBadge: {
    backgroundColor: 'rgba(225, 6, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    color: Colors.primaryRed,
    fontSize: 10,
    fontWeight: '800',
  },
  mapCanvas: {
    height: 210,
    position: 'relative',
    marginVertical: 8,
    justifyContent: 'center',
  },
  trackSegment: {
    position: 'absolute',
    height: 5,
    backgroundColor: '#384050',
    borderRadius: 2.5,
  },
  cornerPin: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  cornerText: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '700',
  },
  carMarker: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  favCar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 20,
  },
  carCode: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  carCodeFav: {
    color: '#000000',
    fontSize: 8,
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 10,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
});

