import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, router } from "expo-router";
import { fetch } from "expo/fetch";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { getApiUrl } from "@/lib/query-client";

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: number;
  mediaUri?: string;
  mediaType?: 'image' | 'video';
}

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const { token } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, [userId]);

  const loadMessages = async () => {
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}api/messages/${userId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const isVideo = result.assets[0].type === 'video' || result.assets[0].uri.includes('mp4') || result.assets[0].uri.includes('mov');
        setSelectedMedia({ uri: result.assets[0].uri, type: isVideo ? 'video' : 'image' });
      }
    } catch (err) {
      console.error("Failed to pick media", err);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedMedia) return;
    
    setSending(true);
    const baseUrl = getApiUrl();
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: "current-user",
      content: messageText,
      timestamp: Date.now(),
      mediaUri: selectedMedia?.uri,
      mediaType: selectedMedia?.type,
    };
    
    setMessages([...messages, newMessage]);
    setMessageText("");
    setSelectedMedia(null);
    
    try {
      await fetch(`${baseUrl}api/messages/${userId}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          content: messageText,
          mediaUri: selectedMedia?.uri,
          mediaType: selectedMedia?.type,
        }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Message</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubbleRow, item.senderId === "current-user" && styles.userRow]}>
            <View
              style={[
                styles.bubble,
                item.senderId === "current-user"
                  ? styles.userBubble
                  : [styles.assistantBubble, { backgroundColor: isDark ? "#1E3560" : "#F6F8FC" }],
              ]}
            >
              {item.mediaUri && (
                <View style={styles.mediaContainer}>
                  <Image source={{ uri: item.mediaUri }} style={styles.mediaPreview} />
                  {item.mediaType === 'video' && (
                    <View style={styles.videoPlayOverlay}>
                      <Ionicons name="play" size={32} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              )}
              {item.content && (
                <Text
                  style={[
                    styles.bubbleText,
                    item.senderId === "current-user" ? styles.userBubbleText : { color: colors.text },
                  ]}
                >
                  {item.content}
                </Text>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        {selectedMedia && (
          <View style={[styles.mediaPreviewContainer, { backgroundColor: isDark ? "#1E3560" : "#F6F8FC" }]}>
            <View style={styles.selectedMediaPreview}>
              <Image source={{ uri: selectedMedia.uri }} style={styles.previewThumbnail} />
              {selectedMedia.type === 'video' && (
                <View style={styles.videoPlayOverlay}>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
              )}
            </View>
            <Pressable onPress={() => setSelectedMedia(null)}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
        <View style={[styles.inputRow, { backgroundColor: isDark ? "#0F2040" : "#F6F8FC", borderColor: colors.border }]}>
          <Pressable
            onPress={handleAddMedia}
            disabled={sending}
            style={({ pressed }) => [styles.mediaBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons 
              name="image-outline" 
              size={20} 
              color={!sending ? Colors.primary : "#9BA8BE"} 
            />
          </Pressable>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor="#9BA8BE"
            value={messageText}
            onChangeText={setMessageText}
            editable={!sending}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!messageText.trim() && !selectedMedia || sending}
            style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={(messageText.trim() || selectedMedia) && !sending ? Colors.primary : "#9BA8BE"} 
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  messageList: { paddingHorizontal: 16, paddingVertical: 16 },
  messageBubbleRow: { flexDirection: "row", marginBottom: 12, justifyContent: "flex-start" },
  userRow: { justifyContent: "flex-end" },
  bubble: { maxWidth: "80%", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  userBubble: { backgroundColor: Colors.primary },
  assistantBubble: {},
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  userBubbleText: { color: "#FFFFFF" },
  inputContainer: { paddingHorizontal: 16, paddingTop: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, gap: 8 },
  input: { flex: 1, height: 40, fontFamily: "Inter_400Regular", fontSize: 14 },
  sendBtn: { padding: 4 },
  mediaBtn: { padding: 8 },
  mediaContainer: { marginBottom: 8, borderRadius: 10, overflow: "hidden" },
  mediaPreview: { width: "100%", height: 200, borderRadius: 10 },
  videoPlayOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  mediaPreviewContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  selectedMediaPreview: { flex: 1, height: 60, borderRadius: 8, overflow: "hidden", position: "relative" },
  previewThumbnail: { width: "100%", height: "100%", borderRadius: 8 },
});
