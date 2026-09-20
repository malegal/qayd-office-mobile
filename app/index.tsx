import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/office-data";
import { acceptEmailInvite, createOffice } from "@/lib/office-onboarding";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";

function extractInviteToken(value: string) {
  const input = value.trim();
  if (!input) return "";
  try {
    const parsed = new URL(input);
    return parsed.searchParams.get("token")?.trim() || input;
  } catch {
    return input;
  }
}

export default function LoginScreen() {
  const colors = useColors();
  const { session, loading: authLoading } = useSupabaseAuth();
  const [mode, setMode] = useState<"login" | "signup" | "join">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [inviteValue, setInviteValue] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) { setInviteValue(url); setMode("join"); }
    }).catch(() => undefined);
    const subscription = Linking.addEventListener("url", ({ url }) => { setInviteValue(url); setMode("join"); });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!authLoading && session) {
      getCurrentMembership().then((m) => router.replace(m ? "/(tabs)" : "/onboarding")).catch(() => router.replace("/onboarding"));
    }
  }, [authLoading, session]);

  const translateAuthError = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    if (lower.includes("email not confirmed")) return "يجب تأكيد البريد الإلكتروني أولًا من الرسالة المرسلة إليك.";
    if (lower.includes("user already registered")) return "هذا الحساب موجود بالفعل. استخدم كلمة المرور المسجلة ثم اضغط قبول الدعوة.";
    return message;
  };

  const submit = async () => {
    const token = extractInviteToken(inviteValue);
    if (!email.trim() || !password || (mode === "signup" && !officeName.trim()) || (mode === "join" && (!token || !displayName.trim()))) {
      return setError(mode === "signup" ? "أدخل البريد وكلمة المرور واسم المكتب." : mode === "join" ? "أدخل رابط الدعوة واسمك والبريد وكلمة المرور." : "أدخل البريد وكلمة المرور.");
    }
    setSubmitting(true); setError("");
    try {
      if (mode === "login") {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (loginError) throw loginError;
      } else if (mode === "join") {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (loginError) {
          const created = await supabase.auth.signUp({ email: email.trim(), password });
          if (created.error) throw created.error;
          if (!created.data.session) {
            setError("تم إنشاء الحساب. افتح رسالة تأكيد البريد، ثم عد إلى التطبيق واضغط قبول الدعوة مرة أخرى.");
            return;
          }
        }
        await acceptEmailInvite(token, displayName);
      } else {
        const { data, error: signupError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signupError) throw signupError;
        if (!data.session) { setError("تم إنشاء الحساب. تحقق من البريد ثم سجل الدخول."); setMode("login"); }
        else await createOffice(officeName.trim(), email.trim());
      }
    } catch (e) {
      setError(translateAuthError(e instanceof Error ? e.message : "تعذر إتمام العملية."));
    } finally { setSubmitting(false); }
  };

  if (authLoading || session) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}><StatusBar style="dark" /><View className="flex-1 px-6 justify-center" style={{ direction: "rtl" }}><View className="items-center mb-8"><View className="w-20 h-20 rounded-3xl items-center justify-center mb-5" style={{ backgroundColor: colors.foreground }}><Text className="text-4xl font-bold" style={{ color: colors.primary }}>Q</Text></View><Text className="text-3xl font-bold text-foreground text-center">Qayd Mobile</Text><Text className="text-base text-muted mt-2 text-center">إدارة المكتب القانوني</Text></View><View className="bg-surface rounded-3xl p-5 border border-border"><Text className="text-2xl font-bold text-foreground mb-2">{mode === "login" ? "تسجيل الدخول" : mode === "join" ? "الانضمام إلى مكتب" : "تأسيس مكتب جديد"}</Text>{mode === "signup" && <><Text className="text-sm font-bold text-foreground mb-2 mt-4">اسم المكتب</Text><TextInput value={officeName} onChangeText={setOfficeName} placeholder="مثال: مكتب الأستاذ..." placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "right", backgroundColor: colors.background }} /></>}{mode === "join" && <><Text className="text-sm font-bold text-foreground mb-2 mt-4">رابط الدعوة</Text><TextInput value={inviteValue} onChangeText={setInviteValue} autoCapitalize="none" placeholder="ألصق رابط الدعوة هنا" placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "left", backgroundColor: colors.background }} /><Text className="text-sm font-bold text-foreground mb-2">الاسم داخل المكتب</Text><TextInput value={displayName} onChangeText={setDisplayName} placeholder="اسمك داخل المكتب" placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "right", backgroundColor: colors.background }} /></>}<Text className="text-sm font-bold text-foreground mb-2">البريد الإلكتروني</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="name@example.com" placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "left", backgroundColor: colors.background }} /><Text className="text-sm font-bold text-foreground mb-2">{mode === "join" ? "كلمة المرور الجديدة" : "كلمة المرور"}</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-5" style={{ textAlign: "left", backgroundColor: colors.background }} onSubmitEditing={submit} />{!!error && <Text className="text-sm mb-4" style={{ color: colors.error }}>{error}</Text>}<Pressable onPress={submit} disabled={submitting} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: submitting ? .6 : 1 }}>{submitting ? <ActivityIndicator color={colors.background} /> : <Text className="font-bold text-base" style={{ color: colors.background }}>{mode === "login" ? "دخول إلى المكتب" : mode === "join" ? "قبول الدعوة والدخول" : "إنشاء حساب المالك"}</Text>}</Pressable><Pressable onPress={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="mt-5"><Text className="text-sm font-bold text-center" style={{ color: colors.primary }}>{mode === "login" ? "أول مرة؟ تأسيس مكتب جديد" : "لدي حساب بالفعل — تسجيل الدخول"}</Text></Pressable>{mode === "login" ? <Pressable onPress={() => { setMode("join"); setError(""); }} className="mt-4"><Text className="text-sm font-bold text-center" style={{ color: colors.primary }}>لدي رابط دعوة من مالك المكتب</Text></Pressable> : null}</View><Text className="text-xs text-muted text-center mt-6">هذه النسخة مخصصة لفريق المكتب فقط.</Text></View></KeyboardAvoidingView>;
}
