import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/office-data";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { setPendingInvite, setPendingOffice } from "@/lib/pending-intent";

export default function LoginScreen() {
  const colors = useColors(); const { session, loading: authLoading } = useSupabaseAuth();
  const [mode, setMode] = useState<"login" | "signup" | "join">("login"); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [officeName, setOfficeName] = useState(""); const [inviteCode, setInviteCode] = useState(""); const [displayName, setDisplayName] = useState(""); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState("");
  const translateAuthError = (message: string) => { const text = message.toLowerCase(); if (text.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة."; if (text.includes("email not confirmed")) return "يجب تأكيد البريد الإلكتروني أولًا من الرسالة المرسلة إليك."; if (text.includes("user already registered")) return "هذا الحساب موجود بالفعل. استخدم كلمة المرور المسجلة."; if (text.includes("rate limit")) return "محاولات كثيرة، انتظر قليلًا ثم حاول مرة أخرى."; if (text.includes("password should be at least")) return "كلمة المرور قصيرة جدًا؛ استخدم 8 أحرف على الأقل."; if (text.includes("invalid phone")) return "رقم الهاتف غير صالح."; if (text.includes("network") || text.includes("fetch")) return "تحقق من اتصالك بالإنترنت."; return "تعذر إتمام العملية. حاول مرة أخرى."; };
  useEffect(() => { if (!authLoading && session) getCurrentMembership().then((m) => router.replace(m ? "/(tabs)" : "/onboarding")).catch(() => router.replace("/onboarding")); }, [authLoading, session]);
  const submit = async () => {
    if (!email.trim() || !password || password.length < 8 || (mode === "signup" && !officeName.trim()) || (mode === "join" && (!inviteCode.trim() || !displayName.trim() || !/^QYD-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(inviteCode.trim())))) {
      return setError(password.length < 8 ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل." : mode === "signup" ? "أدخل البريد وكلمة المرور واسم المكتب." : mode === "join" ? "أدخل بريدًا صحيحًا وكود دعوة بصيغة QYD-XXXX-XXXX والاسم." : "أدخل البريد وكلمة المرور.");
    }
    setSubmitting(true); setError("");
    try {
      if (mode === "login") {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      } else if (mode === "join") {
        const contact = email.trim();
        const isPhone = !contact.includes("@");
        await setPendingInvite(inviteCode.trim().toUpperCase(), displayName.trim());
        const credentials = isPhone ? { phone: contact, password } : { email: contact, password };
        const existing = await supabase.auth.signInWithPassword(credentials);
        if (existing.error) {
          const created = await supabase.auth.signUp(credentials);
          if (created.error) {
            throw new Error(created.error.message.toLowerCase().includes("already registered") ? "هذا الحساب موجود بالفعل، لكن كلمة المرور غير صحيحة أو لم يتم تأكيد الحساب." : created.error.message);
          }
          if (!created.data.session) {
            setError(isPhone ? "تم إنشاء الحساب. أكّد رقم الهاتف، وسيُكمَل الانضمام تلقائيًا عند العودة." : "تم إنشاء الحساب. افتح رسالة البريد وأكّد الحساب، وسيُكمَل الانضمام تلقائيًا عند العودة.");
            return;
          }
        }
        // يستكمل useSupabaseAuth قبول الدعوة تلقائيًا بعد حدث SIGNED_IN.
      } else {
        await setPendingOffice(officeName.trim(), email.trim());
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) throw e;
        if (!data.session) { setError("تم إنشاء الحساب. تحقق من البريد ثم اختر «لدي كود دعوة» وسجل الدخول لإكمال تأسيس المكتب."); setMode("join"); }
        // يستكمل useSupabaseAuth إنشاء المكتب تلقائيًا بعد حدث SIGNED_IN.
      }
    } catch (e) {
      setError(translateAuthError(e instanceof Error ? e.message : "تعذر إتمام العملية."));
    } finally { setSubmitting(false); }
  };

  if (authLoading || session) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  return <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}><StatusBar style="dark" /><View className="flex-1 px-6 justify-center" style={{ direction: "rtl" }}><View className="items-center mb-8"><View className="w-20 h-20 rounded-3xl items-center justify-center mb-5" style={{ backgroundColor: colors.foreground }}><Text className="text-4xl font-bold" style={{ color: colors.primary }}>Q</Text></View><Text className="text-3xl font-bold text-foreground text-center">Qayd Mobile</Text><Text className="text-base text-muted mt-2 text-center">إدارة المكتب القانوني</Text></View><View className="bg-surface rounded-3xl p-5 border border-border"><Text className="text-2xl font-bold text-foreground mb-2">{mode === "login" ? "تسجيل الدخول" : mode === "join" ? "الانضمام إلى مكتب" : "تأسيس مكتب جديد"}</Text>{mode === "signup" && <><Text className="text-sm font-bold text-foreground mb-2 mt-4">اسم المكتب</Text><TextInput value={officeName} onChangeText={setOfficeName} placeholder="مثال: مكتب الأستاذ..." placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "right", backgroundColor: colors.background }} /></>}{mode === "join" && <><Text className="text-sm font-bold text-foreground mb-2 mt-4">كود الدعوة</Text><TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" placeholder="QYD-XXXX-XXXX" placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "left", backgroundColor: colors.background }} /><Text className="text-sm font-bold text-foreground mb-2">الاسم الظاهر داخل المكتب</Text><TextInput value={displayName} onChangeText={setDisplayName} placeholder="اسمك داخل المكتب" placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "right", backgroundColor: colors.background }} /></>}<Text className="text-sm font-bold text-foreground mb-2">{mode === "join" ? "البريد الإلكتروني أو رقم الهاتف" : "البريد الإلكتروني"}</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType={mode === "join" ? "default" : "email-address"} placeholder={mode === "join" ? "name@example.com أو +2010..." : "name@example.com"} placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4" style={{ textAlign: "left", backgroundColor: colors.background }} /><Text className="text-sm font-bold text-foreground mb-2">{mode === "join" ? "أنشئ كلمة مرور للحساب" : "كلمة المرور"}</Text><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder={mode === "join" ? "أنشئ كلمة مرور جديدة" : "••••••••"} placeholderTextColor={colors.muted} className="border border-border rounded-2xl px-4 py-3 text-foreground mb-5" style={{ textAlign: "left", backgroundColor: colors.background }} onSubmitEditing={submit} /><>{!!error && <Text className="text-sm mb-4" style={{ color: colors.error }}>{error}</Text>}</><Pressable onPress={submit} disabled={submitting} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: submitting ? .6 : 1 }}>{submitting ? <ActivityIndicator color={colors.background} /> : <Text className="font-bold text-base" style={{ color: colors.background }}>{mode === "login" ? "دخول إلى المكتب" : mode === "join" ? "دخول وقبول الدعوة" : "إنشاء حساب المالك"}</Text>}</Pressable><Pressable onPress={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="mt-5"><Text className="text-sm font-bold text-center" style={{ color: colors.primary }}>{mode === "login" ? "أول مرة؟ تأسيس مكتب جديد" : "لدي حساب بالفعل — تسجيل الدخول"}</Text></Pressable>{mode === "login" ? <Pressable onPress={() => { setMode("join"); setError(""); }} className="mt-4"><Text className="text-sm font-bold text-center" style={{ color: colors.primary }}>لدي كود دعوة من مالك المكتب</Text></Pressable> : null}</View><Text className="text-xs text-muted text-center mt-6">هذه النسخة مخصصة لفريق المكتب فقط.</Text></View></KeyboardAvoidingView>;
}
