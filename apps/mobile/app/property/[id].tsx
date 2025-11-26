import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Property } from '@immoflow/database';
import { getPropertyById, incrementPropertyViews } from '@immoflow/api';
import { Button, Badge, colors, spacing } from '@immoflow/ui';
import { formatPrice, formatArea, formatRooms } from '@immoflow/utils';

/**
 * Property Details Screen
 */
export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadProperty() {
      if (!id) return;

      try {
        setLoading(true);
        const data = await getPropertyById(id);
        setProperty(data);

        // Increment views
        if (data) {
          await incrementPropertyViews(id);
        }
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Images */}
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {property.images.map((image, index) => (
          <Image
            key={index}
            source={{ uri: image }}
            style={styles.image}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {/* Title & Location */}
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.location}>📍 {property.location}</Text>

        {/* Price & Details */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>{formatPrice(property.price)}</Text>
          <Text style={styles.details}>
            {formatArea(property.sqm)} • {formatRooms(property.rooms)}
          </Text>
        </View>

        {/* Features */}
        {property.features.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.features}>
              {property.features.map((feature, idx) => (
                <Badge key={idx}>{feature}</Badge>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        {property.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{property.description}</Text>
          </View>
        )}

        {/* Highlights */}
        {property.highlights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highlights</Text>
            {property.highlights.map((highlight, idx) => (
              <Text key={idx} style={styles.listItem}>✓ {highlight}</Text>
            ))}
          </View>
        )}

        {/* Red Flags */}
        {property.red_flags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Things to Consider</Text>
            {property.red_flags.map((flag, idx) => (
              <Text key={idx} style={styles.warningItem}>⚠️ {flag}</Text>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={styles.footer}>
          <Button onPress={() => alert('Booking coming soon!')}>
            Book Viewing
          </Button>
          <Button variant="outline" onPress={() => alert('Contact coming soon!')}>
            Contact Agent
          </Button>
        </View>
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
  },
  image: {
    width: 400, // Adjust based on device width
    height: 300,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  location: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  priceSection: {
    marginBottom: spacing.xl,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  details: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  description: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 24,
  },
  listItem: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  warningItem: {
    fontSize: 16,
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
  },
  footer: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
