import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', size = 'md', style }: BadgeProps) {
  return (
    <View style={[styles.base, styles[variant], styles[size], style]}>
      <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles], styles[`${size}Text` as keyof typeof styles]]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  success: {
    backgroundColor: colors.successLight,
  },
  warning: {
    backgroundColor: colors.warningLight,
  },
  error: {
    backgroundColor: colors.errorLight,
  },
  info: {
    backgroundColor: colors.infoLight,
  },
  default: {
    backgroundColor: colors.surfaceVariant,
  },
  sm: {
    paddingVertical: spacing.xs - 2,
    paddingHorizontal: spacing.sm,
  },
  md: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontWeight: typography.fontWeight.semibold,
  },
  successText: {
    color: colors.success,
    fontSize: typography.fontSize.xs,
  },
  warningText: {
    color: colors.warning,
    fontSize: typography.fontSize.xs,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.fontSize.xs,
  },
  infoText: {
    color: colors.info,
    fontSize: typography.fontSize.xs,
  },
  defaultText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.xs,
  },
  smText: {
    fontSize: typography.fontSize.xs - 1,
  },
  mdText: {
    fontSize: typography.fontSize.xs,
  },
});
