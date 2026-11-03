import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';

/**
 * ErrorBoundary - Contiene los errores de render de cualquier pantalla.
 * Muestra una interfaz alternativa en español en lugar de desmontar toda la aplicación.
 * "Volver a intentar" reinicia el límite y vuelve a montar su contenido.
 */
export default class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Registro para diagnóstico: el error y la pila de componentes donde ocurrió.
  componentDidCatch(error, info) {
    console.warn('[ErrorBoundary] Error de render contenido:', error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text accessibilityRole="alert" style={styles.title}>Algo salió mal al mostrar esta pantalla.</Text>
        <Text style={styles.message}>Puedes volver a intentarlo. Tus favoritos y ajustes guardados no se modificaron.</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Volver a intentar"
          style={styles.retryButton}
          onPress={this.handleRetry}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>Volver a intentar</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.backgroundCardElevated,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  retryText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
