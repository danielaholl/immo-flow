import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { Button, Avatar, colors, spacing } from '@immoflow/ui';
import { useAuth } from '@immoflow/database';

/**
 * Profile Screen
 */
export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.icon}>👤</Text>
          <Text style={styles.title}>Not logged in</Text>
          <Text style={styles.subtitle}>Sign in to access your profile</Text>
          {/* TODO: Add login/signup buttons */}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar
          name={user.user_metadata?.name || user.email || 'User'}
          size="xl"
        />
        <Text style={styles.name}>
          {user.user_metadata?.name || 'User'}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.menuItem}>
          <Text style={styles.menuText}>Edit Profile</Text>
          <Text style={styles.menuIcon}>›</Text>
        </View>

        <View style={styles.menuItem}>
          <Text style={styles.menuText}>Saved Searches</Text>
          <Text style={styles.menuIcon}>›</Text>
        </View>

        <View style={styles.menuItem}>
          <Text style={styles.menuText}>Bookings</Text>
          <Text style={styles.menuIcon}>›</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.menuItem}>
          <Text style={styles.menuText}>Notifications</Text>
          <Text style={styles.menuIcon}>›</Text>
        </View>

        <View style={styles.menuItem}>
          <Text style={styles.menuText}>Privacy</Text>
          <Text style={styles.menuIcon}>›</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          variant="outline"
          onPress={handleSignOut}
          loading={loading}
        >
          Sign Out
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  email: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  menuText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  menuIcon: {
    fontSize: 20,
    color: colors.text.tertiary,
  },
  footer: {
    padding: spacing.xl,
  },
});
