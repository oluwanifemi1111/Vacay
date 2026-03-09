import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { ApartmentCard } from "@/components/ApartmentCard";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: savedApartments = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/saved"],
    enabled: !!token,
  });

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSavedIds(new Set((savedApartments as any[]).map((a) => a.id)));
  }, [savedApartments]);

  const handleSaveToggle = async (id: string) => {
    const baseUrl = getApiUrl();
    const newSet = new Set(savedIds);
    newSet.delete(id);
    setSavedIds(newSet);
    await fetch(`${baseUrl}api/saved/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isDark ? ["#0A1628", "#0F2040"] : ["#0F2F5A", "#1A4A8A"]}
        style={[styles.header, { paddingTop: topPadding + 16 }]}
      >
        <Text style={styles.headerTitle}>Saved Homes</Text>
        <Text style={styles.headerSubtitle}>
          {savedApartments.length} {savedApartments.length === 1 ? "apartment" : "apartments"} saved
        </Text>
      </LinearGradient>

      <FlatList
        data={savedApartments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ApartmentCard
            apartment={item}
            isSaved={savedIds.has(item.id)}
            onSaveToggle={handleSaveToggle}
            style={styles.cardWrapper}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? "#1E3560" : "#EEF2FF" }]}>
              <Ionicons name="heart-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved apartments</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap the heart icon on any listing to save it here
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          Platform.OS === "web" && { paddingBottom: 34 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
