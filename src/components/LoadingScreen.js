import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';

export default function LoadingScreen({ message = 'Cargando datos de F1...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primaryRed} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

