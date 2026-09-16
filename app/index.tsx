import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

export default function LoginScreen() {
  const colors = useColors();
  const { session, loading: authLoading } = useSupabaseAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && session) router.replace("/(tabs)");
  }, [authLoading, session]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) setError("بيانات الدخول غير صحيحة أو الحساب غير مفعل.");
    setSubmitting(false);
  };

  if (authLoading || session) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <View className="flex-1 px-6 justify-center" style={{ direction: "rtl" }}>
        <View className="items-center mb-10">
          <View className="w-20 h-20 rounded-3xl items-center justify-center mb-5" style={{ backgroundColor: colors.foreground }}>
            <Text className="text-4xl font-bold" style={{ color: colors.primary }}>Q</Text>
          </View>
          <Text className="text-3xl font-bold text-foreground text-center">Qayd Mobile</Text>
          <Text className="text-base text-muted mt-2 text-center">إدارة المكتب القانوني</Text>
        </View>

        <View className="bg-surface rounded-3xl p-5 border border-border" style={{ shadowColor: colors.foreground, shadowOpacity: 0.08, shadowRadius: 18, elevation: 3 }}>
          <Text className="text-2xl font-bold text-foreground mb-2">تسجيل الدخول</Text>
          <Text className="text-sm text-muted mb-6">ادخل بحساب أحد أعضاء المكتب للوصول إلى بيانات العمل.</Text>

          <Text className="text-sm font-bold text-foreground mb-2">البريد الإلكتروني</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@example.com"
            placeholderTextColor={colors.muted}
            className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4"
            style={{ textAlign: "left", backgroundColor: colors.background }}
          />

          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-bold text-foreground">كلمة المرور</Text>
            <Pressable onPress={() => setShowPassword((value) => !value)}>
              <Text className="text-xs font-bold" style={{ color: colors.primary }}>{showPassword ? "إخفاء" : "إظهار"}</Text>
            </Pressable>
          </View>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            className="border border-border rounded-2xl px-4 py-3 text-foreground mb-5"
            style={{ textAlign: "left", backgroundColor: colors.background }}
            onSubmitEditing={handleLogin}
            returnKeyType="done"
          />

          {!!error && <Text className="text-sm mb-4" style={{ color: colors.error }}>{error}</Text>}
          <Pressable
            onPress={handleLogin}
            disabled={submitting}
            style={({ pressed }) => [{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center" }, pressed && { opacity: 0.85 }, submitting && { opacity: 0.6 }]}
          >
            {submitting ? <ActivityIndicator color={colors.background} /> : <Text className="font-bold text-base" style={{ color: colors.background }}>دخول إلى المكتب</Text>}
          </Pressable>
        </View>

        <Text className="text-xs text-muted text-center mt-6">هذه النسخة مخصصة لفريق المكتب فقط. لا تستخدم بيانات العملاء على جهاز مشترك.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
