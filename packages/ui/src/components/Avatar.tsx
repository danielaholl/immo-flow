import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography } from '../theme';

export interface AvatarProps {
  uri?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

export function Avatar({ uri, name, size = 'md', style }: AvatarProps) {
  const sizeStyles = styles[size];

  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getBackgroundColor = (text: string) => {
    const colors = ['#FF385C', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'];
    const charCode = text.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  return (
    <View style={[styles.container, sizeStyles.container, style]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, sizeStyles.container]} />
      ) : name ? (
        <View
          style={[
            styles.placeholder,
            sizeStyles.container,
            { backgroundColor: getBackgroundColor(name) },
          ]}
        >
          <Text style={[styles.initials, sizeStyles.initials]}>{getInitials(name)}</Text>
        </View>
      ) : (
        <View style={[styles.placeholder, sizeStyles.container]}>
          <Text style={[styles.initials, sizeStyles.initials]}>?</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  initials: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.bold,
  },
  sm: {
    container: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    initials: {
      fontSize: typography.fontSize.xs,
    },
  },
  md: {
    container: {
      width: 48,
      height: 48,
      borderRadius: 24,
    },
    initials: {
      fontSize: typography.fontSize.base,
    },
  },
  lg: {
    container: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    initials: {
      fontSize: typography.fontSize.xl,
    },
  },
  xl: {
    container: {
      width: 96,
      height: 96,
      borderRadius: 48,
    },
    initials: {
      fontSize: typography.fontSize.xxxl,
    },
  },
});
