import React from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  useColorScheme,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import Colors from "@/constants/colors";

interface Apartment {
  id: string;
  title: string;
  price: number;
  location: string;
  bedrooms: number;
  apartmentType: string;
  description: string;
  photos: string[];
  amenities: string[];
  landlordName: string;
  landlordPhone: string;
  landlordEmail: string;
}

interface Props {
  apartment: Apartment;
  isSaved?: boolean;
  onSaveToggle?: (id: string) => void;
  style?: object;
}

export function ApartmentCard({ apartment, isSaved = false, onSaveToggle, style }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/apartment/[id]", params: { id: apartment.id } });
  };

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSaveToggle?.(apartment.id);
  };

  const photo = apartment.photos?.[0];
  const typeLabel =
    apartment.apartmentType === "studio"
      ? "Studio"
      : apartment.apartmentType === "1bed"
      ? "1 Bedroom"
      : apartment.apartmentType === "2bed"
      ? "2 Bedrooms"
      : apartment.apartmentType === "duplex"
      ? "Duplex"
      : apartment.apartmentType;

  return (
    <Animated.View style={[animStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => { scale.value = withSpring(0.97); }}
        onPressOut={() => { scale.value = withSpring(1); }}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Photo */}
        <View style={styles.photoContainer}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: isDark ? "#1E3560" : "#E4E9F0" }]}>
              <Ionicons name="home-outline" size={40} color={isDark ? "#4A5E80" : "#9BA8BE"} />
            </View>
          )}
          {/* Save button */}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: isSaved ? Colors.accent : "rgba(0,0,0,0.4)" }]}
            onPress={handleSave}
          >
            <Ionicons
              name={isSaved ? "heart" : "heart-outline"}
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
          {/* Type badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {apartment.title}
            </Text>
            <Text style={styles.price}>
              ${apartment.price.toLocaleString()}
              <Text style={styles.priceSuffix}>/mo</Text>
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={Colors.primary} />
            <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
              {apartment.location}
            </Text>
          </View>

          {/* Tags */}
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: isDark ? "#1E3560" : "#EEF2FF" }]}>
              <Ionicons name="bed-outline" size={11} color={Colors.primary} />
              <Text style={[styles.tagText, { color: Colors.primary }]}>
                {apartment.bedrooms === 0 ? "Studio" : `${apartment.bedrooms} bed`}
              </Text>
            </View>
            {(apartment.amenities as string[]).slice(0, 2).map((a) => (
              <View key={a} style={[styles.tag, { backgroundColor: isDark ? "#1E3560" : "#EEF2FF" }]}>
                <Text style={[styles.tagText, { color: Colors.primary }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  photoContainer: {
    height: 200,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  info: {
    padding: 16,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  price: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  priceSuffix: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#9BA8BE",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
