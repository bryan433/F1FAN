import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabNavigator from './BottomTabNavigator';
import DetalleGPScreen from '../screens/DetalleGPScreen';
import PerfilPilotoScreen from '../screens/PerfilPilotoScreen';
import ComparadorScreen from '../screens/ComparadorScreen';
import ARScreen from '../screens/ARScreen';
import FavoritosScreen from '../screens/FavoritosScreen';
import PerfilScreen from '../screens/PerfilScreen';
import HistorialWebScreen from '../screens/HistorialWebScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0D0F12' },
          animation: 'slide_from_right'
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="DetalleGP" component={DetalleGPScreen} />
        <Stack.Screen name="PerfilPiloto" component={PerfilPilotoScreen} />
        <Stack.Screen name="Comparador" component={ComparadorScreen} />
        <Stack.Screen name="RealidadAumentada" component={ARScreen} />
        <Stack.Screen name="Favoritos" component={FavoritosScreen} />
        <Stack.Screen name="Perfil" component={PerfilScreen} />
        <Stack.Screen name="HistorialWeb" component={HistorialWebScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

