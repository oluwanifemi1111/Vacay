import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

const AMENITY_OPTIONS = ["parking", "gym", "furnished", "pet-friendly", "laundry", "security", "rooftop", "balcony", "doorman", "garden"];
const TYPE_MAP: Record<string, string> = { studio: "Studio", "1bed": "1 Bedroom", "2bed": "2 Bedrooms", duplex: "Duplex" };

function ApartmentFormModal({ onClose, onSaved, existing }: { onClose: () => void; onSaved: () => void; existing?: any }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { token } = useAuth();
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [price, setPrice] = useState(existing?.price?.toString() || "");
  const [location, setLocation] = useState(existing?.location || "");
  const [bedrooms, setBedrooms] = useState(existing?.bedrooms?.toString() || "0");
  const [aptType, setAptType] = useState(existing?.apartmentType || "studio");
  const [phone, setPhone] = useState(existing?.landlordPhone || "");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(existing?.amenities || []);
  const [photos, setPhotos] = useState<Array<{ uri: string; type?: string }>>(
    (existing?.photos || []).map((p: any) => typeof p === 'string' ? { uri: p, type: 'image' } : p)
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleAmenity = (a: string) => {
    setSelectedAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingPhoto(true);
        const uri = result.assets[0].uri;
        const type = result.assets[0].type || (uri.includes('mp4') || uri.includes('mov') ? 'video' : 'image');
        setPhotos([...photos, { uri, type }]);
        setUploadingPhoto(false);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick media");
    }
  };

  const handleSave = async () => {
    if (!title || !price || !location) {
      Alert.alert("Missing Fields", "Please fill title, price, and location.");
      return;
    }
    setLoading(true);
    try {
      const baseUrl = getApiUrl();
      const url = existing ? `${baseUrl}api/apartments/${existing.id}` : `${baseUrl}api/apartments`;
      const method = existing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title, description,
          price: parseInt(price),
          location,
          bedrooms: parseInt(bedrooms),
          apartmentType: aptType,
          landlordPhone: phone,
          amenities: selectedAmenities,
          photos: photos.map(p => typeof p === 'string' ? p : p.uri),
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save apartment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", zIndex: 100 }]}>
      <View style={[styles.modal, { backgroundColor: colors.card }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {existing ? "Edit Listing" : "New Listing"}
          </Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {[
            { label: "Title", value: title, setter: setTitle, placeholder: "e.g. Modern 1-Bed in Downtown" },
            { label: "Location", value: location, setter: setLocation, placeholder: "e.g. Brooklyn, New York" },
            { label: "Price ($/mo)", value: price, setter: setPrice, placeholder: "2000", kb: "numeric" as const },
            { label: "Bedrooms", value: bedrooms, setter: setBedrooms, placeholder: "0 for studio", kb: "numeric" as const },
            { label: "Phone", value: phone, setter: setPhone, placeholder: "+1 (555) 000-0000", kb: "phone-pad" as const },
          ].map(({ label, value, setter, placeholder, kb }) => (
            <View key={label} style={styles.formField}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>{label}</Text>
              <View style={[styles.formInput, { backgroundColor: isDark ? colors.background : "#F6F8FC", borderColor: colors.border }]}>
                <TextInput
                  style={[styles.formInputText, { color: colors.text }]}
                  placeholder={placeholder}
                  placeholderTextColor="#9BA8BE"
                  value={value}
                  onChangeText={setter}
                  keyboardType={kb}
                />
              </View>
            </View>
          ))}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Description</Text>
            <View style={[styles.formInput, { backgroundColor: isDark ? colors.background : "#F6F8FC", borderColor: colors.border, height: 80, alignItems: "flex-start", paddingVertical: 10 }]}>
              <TextInput
                style={[styles.formInputText, { color: colors.text, textAlignVertical: "top" }]}
                placeholder="Describe the apartment..."
                placeholderTextColor="#9BA8BE"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Type</Text>
            <View style={styles.typeRow}>
              {Object.entries(TYPE_MAP).map(([val, label]) => (
                <Pressable
                  key={val}
                  style={[styles.typeChip, { borderColor: colors.border, backgroundColor: isDark ? colors.background : "#F6F8FC" }, aptType === val && styles.typeChipActive]}
                  onPress={() => setAptType(val)}
                >
                  <Text style={[styles.typeChipText, { color: colors.textSecondary }, aptType === val && { color: "#FFFFFF" }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Amenities</Text>
            <View style={styles.amenityGrid}>
              {AMENITY_OPTIONS.map((a) => (
                <Pressable
                  key={a}
                  style={[styles.amenityChip, { borderColor: colors.border, backgroundColor: isDark ? colors.background : "#F6F8FC" }, selectedAmenities.includes(a) && styles.amenityChipActive]}
                  onPress={() => toggleAmenity(a)}
                >
                  <Text style={[styles.amenityChipText, { color: colors.textSecondary }, selectedAmenities.includes(a) && { color: Colors.primary }]}>{a}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Photos & Videos section */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Photos & Videos</Text>
            <View style={styles.photoGrid}>
              {photos.map((media, idx) => {
                const isVideo = media.type === 'video' || media.uri?.includes('mp4') || media.uri?.includes('mov');
                return (
                  <View key={idx} style={[styles.photoThumbnail, { backgroundColor: isDark ? colors.background : "#F6F8FC" }]}>
                    <Image source={{ uri: media.uri }} style={styles.photoThumbnail} />
                    {isVideo && (
                      <View style={styles.videoOverlay}>
                        <Ionicons name="play" size={24} color="#FFFFFF" />
                      </View>
                    )}
                    <Pressable
                      style={styles.removePhotoBtn}
                      onPress={() => setPhotos(photos.filter((_, i) => i !== idx))}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                );
              })}
              <Pressable
                style={[styles.addPhotoBtn, { backgroundColor: isDark ? colors.background : "#F6F8FC", borderColor: colors.border }]}
                onPress={handleAddPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={24} color={Colors.primary} />
                    <Text style={[styles.addPhotoBtnText, { color: Colors.primary }]}>Add Photo</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Listing</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { user, logout, token } = useAuth();
  const queryClient = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const [showForm, setShowForm] = useState(false);
  const [editApt, setEditApt] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarKey = user ? `vacay_avatar_${user.id}` : null;

  useEffect(() => {
    if (avatarKey) {
      AsyncStorage.getItem(avatarKey).then((uri) => {
        if (uri) setAvatarUri(uri);
      });
    }
  }, [avatarKey]);

  const handlePickAvatar = async () => {
    if (!avatarKey) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos to upload a profile picture.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        await AsyncStorage.setItem(avatarKey, uri);
        setAvatarUri(uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "Could not load image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const { data: myApartments = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/my-apartments"],
    enabled: !!token && user?.role === "landlord",
  });

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Listing", "Are you sure you want to remove this listing?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const baseUrl = getApiUrl();
          await fetch(`${baseUrl}api/apartments/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          queryClient.invalidateQueries({ queryKey: ["/api/my-apartments"] });
          queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const isLandlord = user?.role === "landlord";

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 90 },
        ]}
      >
        <LinearGradient
          colors={isDark ? ["#0A1628", "#0F2040"] : ["#0F2F5A", "#1A4A8A"]}
          style={[styles.header, { paddingTop: topPadding + 16 }]}
        >
          <Pressable style={styles.avatarWrapper} onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarLarge} />
            ) : (
              <View style={[styles.avatarLarge, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{(user?.username || "U")[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              )}
            </View>
          </Pressable>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: isLandlord ? Colors.accent : Colors.teal }]}>
            <Ionicons name={isLandlord ? "business" : "person"} size={12} color="#FFFFFF" />
            <Text style={styles.roleBadgeText}>{isLandlord ? "Landlord" : "Renter"}</Text>
          </View>
        </LinearGradient>

        {isLandlord && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Listings</Text>
              <Pressable
                style={styles.addBtn}
                onPress={() => { setEditApt(null); setShowForm(true); }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>

            {myApartments.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="home-outline" size={32} color={colors.border} />
                <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>No listings yet</Text>
                <Text style={[styles.emptyCardSub, { color: colors.textSecondary }]}>Tap Add to create your first listing</Text>
              </View>
            ) : (
              myApartments.map((apt) => (
                <Animated.View
                  key={apt.id}
                  entering={FadeIn.duration(200)}
                  style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.listingCardContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={1}>{apt.title}</Text>
                      <Text style={[styles.listingMeta, { color: colors.textSecondary }]}>
                        {apt.location} · ${apt.price?.toLocaleString()}/mo
                      </Text>
                    </View>
                    <View style={styles.listingActions}>
                      <Pressable
                        style={[styles.listingAction, { backgroundColor: isDark ? "#1E3560" : "#EEF2FF" }]}
                        onPress={() => { setEditApt(apt); setShowForm(true); }}
                      >
                        <Ionicons name="pencil" size={15} color={Colors.primary} />
                      </Pressable>
                      <Pressable
                        style={[styles.listingAction, { backgroundColor: isDark ? "#3A1A1A" : "#FEE2E2" }]}
                        onPress={() => handleDelete(apt.id)}
                      >
                        <Ionicons name="trash-outline" size={15} color={Colors.accent} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.listingStatusRow}>
                    <View style={[styles.statusDot, { backgroundColor: apt.isActive ? "#22C55E" : "#9BA8BE" }]} />
                    <Text style={[styles.statusText, { color: colors.textSecondary }]}>
                      {apt.isActive ? "Active" : "Inactive"}
                    </Text>
                    <Text style={[styles.listingType, { color: colors.textSecondary }]}>
                      {TYPE_MAP[apt.apartmentType] || apt.apartmentType} · {apt.bedrooms} bed
                    </Text>
                  </View>
                </Animated.View>
              ))
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? "#1E3560" : "#EEF2FF" }]}>
                  <Ionicons name="person-outline" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Username</Text>
                  <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{user?.username}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            <View style={styles.settingsRow}>
              <View style={styles.settingsLeft}>
                <View style={[styles.settingsIcon, { backgroundColor: isDark ? "#1E3560" : "#EEF2FF" }]}>
                  <Ionicons name="mail-outline" size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={[styles.settingsLabel, { color: colors.text }]}>Email</Text>
                  <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>{user?.email}</Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              Alert.alert(
                "Delete Account",
                "Are you sure? This will permanently delete your account and all your data. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      try {
                        const baseUrl = getApiUrl();
                        const res = await fetch(`${baseUrl}api/auth/me`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          await logout();
                          router.replace("/(auth)/login");
                        }
                      } catch (err) {
                        Alert.alert("Error", "Failed to delete account.");
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.accent} />
            <Text style={[styles.deleteBtnText, { color: Colors.accent }]}>Delete Account</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.logoutBtn, { borderColor: Colors.accent, opacity: pressed ? 0.75 : 1 }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.accent} />
            <Text style={[styles.logoutBtnText, { color: Colors.accent }]}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {showForm && (
        <ApartmentFormModal
          onClose={() => { setShowForm(false); setEditApt(null); }}
          onSaved={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ["/api/apartments"] });
          }}
          existing={editApt}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: "center",
    gap: 6,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarInitial: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  username: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  email: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyCardText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  emptyCardSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  listingCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  listingCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listingTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  listingMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  listingActions: {
    flexDirection: "row",
    gap: 8,
  },
  listingAction: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  listingStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  listingType: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  settingsValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 24,
  },
  deleteBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 44,
  },
  formInputText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  amenityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  amenityChipActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EEF2FF",
  },
  amenityChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoThumbnail: {
    width: "30%",
    height: 100,
    borderRadius: 10,
    position: "relative",
  },
  removePhotoBtn: {
    position: "absolute",
    top: -8,
    right: -8,
    zIndex: 10,
  },
  addPhotoBtn: {
    width: "30%",
    height: 100,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addPhotoBtnText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
