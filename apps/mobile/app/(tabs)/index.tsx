import { View, FlatList, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { PropertyCard } from '@immoflow/ui';
import { useProperties, useFavorites, useAuth } from '@immoflow/database';
import { colors, spacing } from '@immoflow/ui';

/**
 * Discover Screen - Main feed with TikTok-style property cards
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const { properties, loading, error } = useProperties({ limit: 20 });
  const { user } = useAuth();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites(user?.id);

  const handleFavorite = async (propertyId: string) => {
    if (!user) {
      // TODO: Show login modal
      alert('Please login to add favorites');
      return;
    }

    try {
      if (isFavorite(propertyId)) {
        await removeFavorite(propertyId);
      } else {
        await addFavorite(propertyId);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error loading properties</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No properties found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={properties}
        renderItem={({ item }) => (
          <PropertyCard
            property={{
              id: item.id,
              title: item.title,
              location: item.location,
              price: item.price,
              sqm: item.sqm,
              rooms: item.rooms,
              images: item.images,
              aiScore: item.ai_score || undefined,
              yield: item.yield || undefined,
              features: item.features,
              energyClass: item.energy_class || undefined,
            }}
            onPress={() => router.push(`/property/${item.id}`)}
            onFavorite={user ? () => handleFavorite(item.id) : undefined}
            isFavorite={user ? isFavorite(item.id) : false}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorDetail: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
});
