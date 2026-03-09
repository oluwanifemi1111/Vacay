import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Platform,
  RefreshControl,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { ApartmentCard } from "@/components/ApartmentCard";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

const APARTMENT_TYPES = ["Any", "Studio", "1 Bed", "2 Bed", "Duplex"];
const TYPE_VALUES: Record<string, string> = {
  Any: "",
  Studio: "studio",
  "1 Bed": "1bed",
  "2 Bed": "2bed",
  Duplex: "duplex",
};

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [selectedType, setSelectedType] = useState("Any");
  const [preferences, setPreferences] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [explanation, setExplanation] = useState("");
  const [matching, setMatching] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: apartments = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/apartments"],
  });

  const { data: savedApartments = [] } = useQuery<any[]>({
    queryKey: ["/api/saved"],
    enabled: !!token,
  });

  useEffect(() => {
    if (!savedApartments || savedApartments.length === 0) {
      setSavedIds(new Set());
    } else {
      const ids = new Set<string>(
        (savedApartments as any[]).map((a: any) => String(a.id || a.apartmentId))
      );
      setSavedIds(ids);
    }
  }, [savedApartments.length]);

  const baseList = searchResults ?? apartments;

  const displayList = useMemo(() => {
    let list = baseList;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (a: any) =>
          a.title?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [baseList, searchText]);

  const handleSearch = () => {
    // Simple text search - just filter the list, don't call AI endpoint
    // The displayList useMemo already handles this filtering
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveToggle = useCallback(async (id: string) => {
    if (!token) return;
    const baseUrl = getApiUrl();
    const isSaved = savedIds.has(id);
    const newSet = new Set(savedIds);
    if (isSaved) {
      newSet.delete(id);
      setSavedIds(newSet);
      await fetch(`${baseUrl}api/saved/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      newSet.add(id);
      setSavedIds(newSet);
      await fetch(`${baseUrl}api/saved/${id}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
  }, [token, savedIds, queryClient]);

  const handleMatch = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMatching(true);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/apartments/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          location,
          budget: budget ? parseInt(budget) : null,
          bedrooms: bedrooms ? parseInt(bedrooms) : null,
          apartmentType: TYPE_VALUES[selectedType] || null,
          preferences,
        }),
      });
      const data = await res.json();
      setSearchResults(data.apartments || []);
      setExplanation(data.explanation || "");
      setShowFilterModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setMatching(false);
    }
  }, [location, budget, bedrooms, selectedType, preferences, token]);

  const hasActiveFilters = location || budget || bedrooms || selectedType !== "Any" || preferences;

  const renderHeader = () => (
    <View>
      <LinearGradient
        colors={isDark ? ["#0A1628", "#0F2040"] : ["#0F2F5A", "#1A4A8A"]}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerGreeting}>Hello, {user?.username || "there"}</Text>
            <Text style={styles.headerTitle}>Find Your Dream Home</Text>
          </View>
          <Pressable
            style={[styles.filterBtn, !!hasActiveFilters && styles.filterBtnActive]}
            onPress={() => {
              setShowFilterModal(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons name="options-outline" size={20} color="#FFFFFF" />
            {!!hasActiveFilters && <View style={styles.filterDot} />}
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: "#FFFFFF" }]}>
          <Pressable onPress={handleSearch}>
            <Ionicons name="search-outline" size={18} color="#9BA8BE" />
          </Pressable>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location, title..."
            placeholderTextColor="#9BA8BE"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchText.length > 0 && Platform.OS !== "ios" && (
            <Pressable onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#9BA8BE" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {explanation ? (
        <View style={[styles.explanationCard, { backgroundColor: isDark ? "#0F2040" : "#EEF2FF", borderColor: isDark ? "#1E3560" : "#C7D2FE" }]}>
          <View style={styles.explanationHeader}>
            <Ionicons name="sparkles" size={15} color={Colors.primary} />
            <Text style={[styles.explanationLabel, { color: Colors.primary }]}>AI Match</Text>
            <Pressable
              style={{ marginLeft: "auto" }}
              onPress={() => { setSearchResults(null); setExplanation(""); }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "Inter_500Medium" }}>Clear</Text>
            </Pressable>
          </View>
          <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{explanation}</Text>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {searchResults !== null
            ? `${displayList.length} AI Matches`
            : searchText
            ? `${displayList.length} Results`
            : `${apartments.length} Available`}
        </Text>
        {(searchResults !== null || searchText) && (
          <Pressable onPress={() => { setSearchResults(null); setExplanation(""); setSearchText(""); }}>
            <Text style={{ color: Colors.primary, fontSize: 13, fontFamily: "Inter_500Medium" }}>Show All</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading apartments...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={displayList}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ApartmentCard
            apartment={item}
            isSaved={savedIds.has(String(item.id))}
            onSaveToggle={handleSaveToggle}
            style={styles.cardWrapper}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="home-outline" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No apartments found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchText ? `No results for "${searchText}"` : "Try adjusting your search filters"}
            </Text>
          </View>
        }
        contentContainerStyle={[styles.listContent, Platform.OS === "web" && { paddingBottom: 34 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable
            style={[styles.filterModal, { backgroundColor: colors.card }]}
            onPress={() => {}}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Filter & AI Search</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Location</Text>
                  <View style={[styles.formInput, { backgroundColor: isDark ? colors.background : "#F6F8FC", borderColor: colors.border }]}>
                    <Ionicons name="location-outline" size={14} color="#9BA8BE" />
                    <TextInput
                      style={[styles.formInputText, { color: colors.text }]}
                      placeholder="City or neighborhood"
                      placeholderTextColor="#9BA8BE"
                      value={location}
                      onChangeText={setLocation}
                    />
                  </View>
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Max Budget</Text>
                  <View style={[styles.formInput, { backgroundColor: isDark ? colors.background : "#F6F8FC", borderColor: colors.border }]}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={[styles.formInputText, { color: colors.text }]}
                      placeholder="5000"
                      placeholderTextColor="#9BA8BE"
                      value={budget}
                      onChangeText={setBudget}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={[styles.formField, { marginBottom: 16 }]}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Bedrooms</Text>
                <View style={[styles.formInput, { backgroundColor: isDark ? colors.background : "#F6F8FC", borderColor: colors.border }]}>
                  <Ionicons name="bed-outline" size={14} color="#9BA8BE" />
                  <TextInput
                    style={[styles.formInputText, { color: colors.text }]}
                    placeholder="Any"
                    placeholderTextColor="#9BA8BE"
                    value={bedrooms}
                    onChangeText={setBedrooms}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
                {APARTMENT_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.typeChip,
                      { borderColor: colors.border, backgroundColor: isDark ? colors.background : "#F6F8FC" },
                      selectedType === t && styles.typeChipActive,
                    ]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={[styles.typeChipText, { color: colors.textSecondary }, selectedType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.formLabel, { color: colors.textSecondary, marginTop: 16 }]}>AI Preferences</Text>
              <View style={[styles.formInput, styles.preferencesInput, { backgroundColor: isDark ? colors.background : "#F6F8FC", borderColor: colors.border }]}>
                <TextInput
                  style={[styles.formInputText, { color: colors.text, textAlignVertical: "top" }]}
                  placeholder="Parking, pet-friendly, furnished, near transit..."
                  placeholderTextColor="#9BA8BE"
                  value={preferences}
                  onChangeText={setPreferences}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.matchBtn, pressed && { opacity: 0.85 }]}
                onPress={handleMatch}
                disabled={matching}
              >
                {matching ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    <Text style={styles.matchBtnText}>Find Matches with AI</Text>
                  </>
                )}
              </Pressable>

              {hasActiveFilters && (
                <Pressable
                  style={[styles.clearBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setLocation(""); setBudget(""); setBedrooms("");
                    setSelectedType("Any"); setPreferences("");
                    setSearchResults(null); setExplanation("");
                    setShowFilterModal(false);
                  }}
                >
                  <Text style={[styles.clearBtnText, { color: colors.textSecondary }]}>Clear All Filters</Text>
                </Pressable>
              )}
              <View style={{ height: Platform.OS === "web" ? 34 : insets.bottom + 16 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  headerGreeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  filterBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#0F1F3D",
    height: "100%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  formField: {},
  formLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formInput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  currencySymbol: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#9BA8BE",
  },
  preferencesInput: {
    height: 72,
    alignItems: "flex-start",
    paddingVertical: 10,
    marginBottom: 4,
  },
  typeRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  matchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  matchBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  clearBtn: {
    borderRadius: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginTop: 8,
  },
  clearBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  explanationCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  explanationLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  listContent: {
    paddingBottom: 100,
  },
  cardWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
});
