import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function Header({ title, subtitle, showProfile = true, onProfilePress }) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title}>{title || 'F1FAN'}</Text>
      </View>
      {showProfile ? (
        <TouchableOpacity style={styles.avatarButton} onPress={onProfilePress} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>DM</Text>
          </View>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  textContainer: {
    flex: 1,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  avatarButton: {
    marginLeft: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.backgroundCardElevated,
    borderWidth: 1.5,
    borderColor: Colors.accentCyan,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});

