import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { PropertyCard, colors, spacing } from '@immoflow/ui';
import { useFavorites, useAuth } from '@immoflow/database';

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { favorites, removeFavorite, loading } = useFavorites(user?.id);

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Please login to view favorites</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>❤️</Text>
        <Text style={styles.emptyText}>No favorites yet</Text>
        <Text style={styles.emptySubtext}>
          Tap the heart icon on properties you love
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={({ item }) => {
          // @ts-ignore - properties is populated via join
          const property = item.properties;
          if (!property) return null;

          return (
            <PropertyCard
              property={{
                id: property.id,
                title: property.title,
                location: property.location,
                price: property.price,
                sqm: property.sqm,
                rooms: property.rooms,
                images: property.images,
                aiScore: property.ai_score,
                yield: property.yield,
                features: property.features,
              }}
              onPress={() => router.push(`/property/${property.id}`)}
              onFavorite={() => removeFavorite(property.id)}
              isFavorite={true}
            />
          );
        }}
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
