import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/auth";

type RegistrationStep = "info" | "otp";

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { register, registerInit } = useAuth();
  const [step, setStep] = useState<RegistrationStep>("info");
  
  // Step 1: Account info
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "landlord">("user");
  
  // Step 2: OTP
  const [otp, setOtp] = useState("");
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const phoneRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const otpRef = useRef<TextInput>(null);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (step !== "otp") return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((otpExpiry - now) / 1000));
      setOtpTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [step, otpExpiry]);

  const handleRequestOTP = async () => {
    if (!email.trim() || !username.trim() || !phone.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await registerInit(
        email.trim().toLowerCase(),
        username.trim(),
        phone.trim(),
        password,
        role
      );
      setOtp("");
      setOtpExpiry(Date.now() + 600000); // 10 minutes
      setStep("otp");
    } catch (err: any) {
      Alert.alert("Registration Failed", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert("Missing OTP", "Please enter the verification code.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await register(
        email.trim().toLowerCase(),
        username.trim(),
        phone.trim(),
        password,
        otp.trim(),
        role
      );
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Verification Failed", err.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <LinearGradient
          colors={["#0F2F5A", "#1A4A8A", "#0F2F5A"]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable style={styles.backBtn} onPress={() => setStep("info")}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark-outline" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>Verify Phone</Text>
            <Text style={styles.tagline}>Enter the code we sent</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verification Code</Text>
            <Text style={styles.cardSubtitle}>
              We sent a 6-digit code to {phone}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="key-outline" size={18} color="#9BA8BE" style={styles.inputIcon} />
                <TextInput
                  ref={otpRef}
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor="#9BA8BE"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOTP}
                />
              </View>
            </View>

            {otpTimeLeft > 0 && (
              <Text style={styles.timerText}>
                Code expires in {Math.floor(otpTimeLeft / 60)}:{String(otpTimeLeft % 60).padStart(2, '0')}
              </Text>
            )}

            <Pressable
              style={({ pressed }) => [styles.registerBtn, pressed && { opacity: 0.85 }]}
              onPress={handleVerifyOTP}
              disabled={loading || !otp}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerBtnText}>Verify & Complete</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.loginLink}
              onPress={() => setStep("info")}
              disabled={loading}
            >
              <Text style={styles.loginLinkText}>
                Back to{" "}
                <Text style={styles.loginLinkBold}>Account Details</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#0F2F5A", "#1A4A8A", "#0F2F5A"]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="home" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>Vacay</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Join Vacay</Text>
          <Text style={styles.cardSubtitle}>Find your perfect home today</Text>

          {/* Role selector */}
          <View style={styles.roleSelector}>
            <Pressable
              style={[styles.roleBtn, role === "user" && styles.roleBtnActive]}
              onPress={() => setRole("user")}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={role === "user" ? "#FFFFFF" : "#5A6A8A"}
              />
              <Text style={[styles.roleBtnText, role === "user" && styles.roleBtnTextActive]}>
                Renter
              </Text>
            </Pressable>
            <Pressable
              style={[styles.roleBtn, role === "landlord" && styles.roleBtnActive]}
              onPress={() => setRole("landlord")}
            >
              <Ionicons
                name="business-outline"
                size={16}
                color={role === "landlord" ? "#FFFFFF" : "#5A6A8A"}
              />
              <Text style={[styles.roleBtnText, role === "landlord" && styles.roleBtnTextActive]}>
                Landlord
              </Text>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={18} color="#9BA8BE" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9BA8BE"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => usernameRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color="#9BA8BE" style={styles.inputIcon} />
              <TextInput
                ref={usernameRef}
                style={styles.input}
                placeholder="yourname"
                placeholderTextColor="#9BA8BE"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={18} color="#9BA8BE" style={styles.inputIcon} />
              <TextInput
                ref={phoneRef}
                style={styles.input}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#9BA8BE"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color="#9BA8BE" style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { flex: 1 }]}
                placeholder="Min. 6 characters"
                placeholderTextColor="#9BA8BE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleRequestOTP}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#9BA8BE"
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.registerBtn, pressed && { opacity: 0.85 }]}
            onPress={handleRequestOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerBtnText}>Send Verification Code</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.loginLink}
            onPress={() => router.back()}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{" "}
              <Text style={styles.loginLinkBold}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  appName: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#0F1F3D",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#5A6A8A",
    marginBottom: 20,
  },
  roleSelector: {
    flexDirection: "row",
    backgroundColor: "#F6F8FC",
    borderRadius: 12,
    padding: 4,
    marginBottom: 22,
    gap: 4,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 9,
    gap: 6,
  },
  roleBtnActive: {
    backgroundColor: "#1A4A8A",
    shadowColor: "#1A4A8A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  roleBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#5A6A8A",
  },
  roleBtnTextActive: {
    color: "#FFFFFF",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#0F1F3D",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F8FC",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E4E9F0",
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#0F1F3D",
  },
  eyeBtn: {
    padding: 4,
  },
  registerBtn: {
    backgroundColor: "#1A4A8A",
    borderRadius: 12,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  registerBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  loginLink: {
    alignItems: "center",
    marginTop: 18,
  },
  loginLinkText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#5A6A8A",
  },
  loginLinkBold: {
    fontFamily: "Inter_600SemiBold",
    color: "#1A4A8A",
  },
  timerText: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#FF6B6B",
    marginBottom: 12,
  },
});
