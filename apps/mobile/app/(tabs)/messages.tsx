import { View, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '@immoflow/ui';

/**
 * Messages Screen - Placeholder for chat functionality
 */
export default function MessagesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>💬</Text>
      <Text style={styles.title}>Messages</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
      <Text style={styles.description}>
        Chat with property agents and ask questions about properties you're interested in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
