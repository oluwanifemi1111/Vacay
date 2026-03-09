import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

const { width } = Dimensions.get("window");

const AMENITY_ICONS: Record<string, string> = {
  parking: "car-outline",
  gym: "barbell-outline",
  furnished: "bed-outline",
  "pet-friendly": "paw-outline",
  laundry: "water-outline",
  security: "shield-checkmark-outline",
  rooftop: "sunny-outline",
  balcony: "home-outline",
  doorman: "person-outline",
  garden: "leaf-outline",
  fireplace: "flame-outline",
  "wine cellar": "wine-outline",
  concierge: "star-outline",
  storage: "archive-outline",
  "bike room": "bicycle-outline",
  terrace: "cloudy-outline",
  "utilities included": "flash-outline",
  "high-speed internet": "wifi-outline",
  "private yard": "leaf-outline",
  "private garden": "leaf-outline",
};

export default function ApartmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savingLoading, setSavingLoading] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { data: apartment, isLoading } = useQuery<any>({
    queryKey: ["/api/apartments", id],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/apartments/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Check saved status
  const { data: savedStatus } = useQuery<{ saved: boolean }>({
    queryKey: ["/api/saved", id, "status"],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/saved/${id}/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.json();
    },
    enabled: !!token,
  });

  React.useEffect(() => {
    if (savedStatus?.saved !== undefined) setSaved(savedStatus.saved);
  }, [savedStatus?.saved]);

  const handleSaveToggle = async () => {
    if (!token) {
      Alert.alert("Sign In Required", "Please sign in to save apartments.");
      return;
    }
    const baseUrl = getApiUrl();
    setSavingLoading(true);
    const newSaved = !saved;
    setSaved(newSaved);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (newSaved) {
        await fetch(`${baseUrl}api/saved/${id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${baseUrl}api/saved/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
    } catch {
      setSaved(!newSaved);
    } finally {
      setSavingLoading(false);
    }
  };

  const handleChatWithLandlord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/chat/${apartment.userId || apartment.landlordId}`);
  };

  const navigatePhotos = (direction: 'next' | 'prev') => {
    const photos: string[] = apartment.photos || [];
    let newIndex = currentPhoto;
    if (direction === 'next') {
      newIndex = (currentPhoto + 1) % photos.length;
    } else {
      newIndex = (currentPhoto - 1 + photos.length) % photos.length;
    }
    setCurrentPhoto(newIndex);
    scrollViewRef.current?.scrollTo({ x: newIndex * width, animated: true });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!apartment) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="home-outline" size={40} color={colors.border} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Apartment not found</Text>
        <Pressable style={styles.backBtnText} onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, fontFamily: "Inter_600SemiBold" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const photos: string[] = apartment.photos || [];
  const amenities: string[] = apartment.amenities || [];
  const typeLabel =
    apartment.apartmentType === "studio" ? "Studio" :
    apartment.apartmentType === "1bed" ? "1 Bedroom" :
    apartment.apartmentType === "2bed" ? "2 Bedrooms" :
    apartment.apartmentType === "duplex" ? "Duplex" :
    apartment.apartmentType;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Photo gallery */}
        <View style={styles.photoSection}>
          {photos.length > 0 ? (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setCurrentPhoto(Math.round(e.nativeEvent.contentOffset.x / width));
              }}
            >
              {photos.map((photo, i) => (
                <Image key={i} source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: isDark ? "#1E3560" : "#E4E9F0" }]}>
              <Ionicons name="home-outline" size={60} color={colors.border} />
            </View>
          )}

          {/* Overlay controls */}
          <Pressable
            style={[styles.backBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={[styles.saveBtn, { top: insets.top + 12 }]}
            onPress={handleSaveToggle}
            disabled={savingLoading}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={20}
              color={saved ? Colors.accent : "#FFFFFF"}
            />
          </Pressable>

          {/* Photo navigation arrows */}
          {photos.length > 1 && (
            <>
              <Pressable
                style={[styles.navArrow, styles.leftArrow]}
                onPress={() => navigatePhotos('prev')}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={[styles.navArrow, styles.rightArrow]}
                onPress={() => navigatePhotos('next')}
              >
                <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
              </Pressable>
            </>
          )}

          {/* Photo indicator */}
          {photos.length > 1 && (
            <View style={styles.photoIndicator}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: i === currentPhoto ? "#FFFFFF" : "rgba(255,255,255,0.45)" },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          {/* Title & price */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>{apartment.title}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={Colors.primary} />
                <Text style={[styles.location, { color: colors.textSecondary }]}>{apartment.location}</Text>
              </View>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>${apartment.price?.toLocaleString()}</Text>
              <Text style={[styles.pricePer, { color: colors.textSecondary }]}>/month</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { icon: "bed-outline", label: `${apartment.bedrooms === 0 ? "Studio" : apartment.bedrooms + " Bed"}` },
              { icon: "home-outline", label: typeLabel },
              { icon: "resize-outline", label: "Available" },
            ].map(({ icon, label }) => (
              <View key={label} style={[styles.statItem, { backgroundColor: isDark ? "#1E3560" : "#EEF2FF" }]}>
                <Ionicons name={icon as any} size={18} color={Colors.primary} />
                <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Description */}
          {apartment.description ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About this place</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{apartment.description}</Text>
            </View>
          ) : null}

          {/* Amenities */}
          {amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {amenities.map((amenity) => (
                  <View key={amenity} style={[styles.amenityItem, { backgroundColor: isDark ? "#1E3560" : "#F6F8FC", borderColor: colors.border }]}>
                    <Ionicons
                      name={(AMENITY_ICONS[amenity] || "checkmark-circle-outline") as any}
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={[styles.amenityText, { color: colors.text }]}>{amenity}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Landlord */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Landlord</Text>
            <View style={[styles.landlordCard, { backgroundColor: isDark ? "#0F2040" : "#F6F8FC", borderColor: colors.border }]}>
              <View style={styles.landlordAvatar}>
                <Text style={styles.landlordInitial}>
                  {(apartment.landlordName || "L")[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.landlordName, { color: colors.text }]}>{apartment.landlordName}</Text>
                <Text style={[styles.landlordRole, { color: colors.textSecondary }]}>Property Owner</Text>
              </View>
            </View>

            <View style={styles.contactRow}>
              <Pressable
                style={({ pressed }) => [styles.contactBtn, styles.chatBtn, pressed && { opacity: 0.85 }]}
                onPress={handleChatWithLandlord}
              >
                <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
                <Text style={styles.contactBtnText}>Message</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 32 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtnText: { marginTop: 8 },
  photoSection: {
    height: 320,
    position: "relative",
  },
  photo: {
    width,
    height: 320,
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  saveBtn: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoIndicator: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 24,
    minHeight: 400,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  priceBlock: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  pricePer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  amenityText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  landlordCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  landlordAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  landlordInitial: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  landlordName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  landlordRole: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
  },
  chatBtn: {
    backgroundColor: Colors.primary,
  },
  contactBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  leftArrow: {
    left: 12,
    marginTop: -22,
  },
  rightArrow: {
    right: 12,
    marginTop: -22,
  },
});
