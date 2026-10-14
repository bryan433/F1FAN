import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { Colors } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider style={styles.root}>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <AppNavigator />
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: '100%',
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
    height: '100%',
  },
});

