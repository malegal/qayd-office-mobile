import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColors } from "@/hooks/use-colors";
import { supabase } from "@/lib/supabase";
import { getCurrentMembership } from "@/lib/office-data";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { setPendingInvite, setPendingOffice } from "@/lib/pending-intent";

const INVITE_RE = /^QYD-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
const OFFICE_NAME = "مكتب جاد الرب للمحاماة";

type Mode = "join" | "login" | "create";

export default function LoginScreen() {
  const colors = useColors();
  const { session, loading: authLoading } = useSupabaseAuth();
  const [mode, setMode] = useState<Mode>("join");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const translateAuthError = (message: string) => {
    const text = message.toLowerCase();
    if (text.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    if (text.includes("email not confirmed")) return "يجب تأكيد البريد الإلكتروني أولًا من الرسالة المرسلة إليك.";
    if (text.includes("user already registered")) return "هذا الحساب موجود بالفعل. استخدم كلمة المرور المسجلة.";
    if (text.includes("rate limit")) return "محاولات كثيرة، انتظر قليلًا ثم حاول مرة أخرى.";
    if (text.includes("password should be at least")) return "كلمة المرور قصيرة جدًا؛ استخدم 8 أحرف على الأقل.";
    if (text.includes("invalid phone")) return "رقم الهاتف غير صالح.";
    if (text.includes("network") || text.includes("fetch")) return "تحقق من اتصالك بالإنترنت.";
    return "تعذر إتمام العملية. حاول مرة أخرى.";
  };

  useEffect(() => {
    if (!authLoading && session) {
      getCurrentMembership()
        .then((m) => router.replace(m ? "/(tabs)" : "/onboarding"))
        .catch(() => router.replace("/onboarding"));
    }
  }, [authLoading, session]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  const submit = async () => {
    setError("");
    setInfo("");

    if (mode === "login") {
      if (!email.trim() || !password) return setError("أدخل البريد وكلمة المرور.");
    } else if (mode === "create") {
      if (!email.trim() || password.length < 8 || !officeName.trim())
        return setError("أدخل اسم المكتب والبريد وكلمة مرور من 8 أحرف على الأقل.");
    } else {
      if (!INVITE_RE.test(inviteCode.trim()))
        return setError("كود الدعوة غير صحيح. الصيغة: QYD-XXXX-XXXX");
      if (!displayName.trim()) return setError("أدخل اسمك داخل المكتب.");
      if (!email.trim()) return setError("أدخل بريدك الإلكتروني أو رقم هاتفك.");
      if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      } else if (mode === "create") {
        await setPendingOffice(officeName.trim(), email.trim());
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) throw e;
        if (!data.session) {
          setInfo("تم إنشاء الحساب. افتح رسالة البريد وأكّد الحساب، وسيُكمل تأسيس المكتب تلقائيًا عند العودة.");
        }
      } else {
        const contact = email.trim();
        const isPhone = !contact.includes("@");
        await setPendingInvite(inviteCode.trim().toUpperCase(), displayName.trim());
        const credentials = isPhone ? { phone: contact, password } : { email: contact, password };
        const existing = await supabase.auth.signInWithPassword(credentials);
        if (existing.error) {
          const created = await supabase.auth.signUp(credentials);
          if (created.error) {
            throw new Error(
              created.error.message.toLowerCase().includes("already registered")
                ? "هذا الحساب موجود بالفعل، لكن كلمة المرور غير صحيحة أو لم يتم تأكيد الحساب."
                : created.error.message,
            );
          }
          if (!created.data.session) {
            setInfo(
              isPhone
                ? "تم إنشاء الحساب. أكّد رقم الهاتف، وسيُكمل الانضمام تلقائيًا عند العودة."
                : "تم إنشاء الحساب. افتح رسالة البريد وأكّد الحساب، وسيُكمل الانضمام تلقائيًا عند العودة.",
            );
            return;
          }
        }
        // يكمل useSupabaseAuth قبول الدعوة تلقائيًا بعد حدث SIGNED_IN.
      }
    } catch (e) {
      setError(translateAuthError(e instanceof Error ? e.message : "تعذر إتمام العملية."));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || session)
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );

  const title = mode === "login" ? "تسجيل الدخول" : mode === "create" ? "تأسيس مكتب جديد" : "الانضمام إلى المكتب";
  const buttonLabel = mode === "login" ? "دخول" : mode === "create" ? "إنشاء حساب المالك" : "دخول إلى المكتب";

  const field = (
    label: string,
    value: string,
    onChange: (t: string) => void,
    placeholder: string,
    opts?: { secure?: boolean; ltr?: boolean; caps?: boolean; keyboard?: "email-address" | "default" },
  ) => (
    <>
      <Text className="text-sm font-bold text-foreground mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={opts?.secure}
        autoCapitalize={opts?.caps ? "characters" : "none"}
        keyboardType={opts?.keyboard ?? "default"}
        className="border border-border rounded-2xl px-4 py-3 text-foreground mb-4"
        style={{ backgroundColor: colors.background, textAlign: opts?.ltr ? "left" : "right" }}
      />
    </>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }}>
        <View style={{ direction: "rtl" }}>
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-3xl items-center justify-center mb-5" style={{ backgroundColor: colors.foreground }}>
              <Text className="text-4xl font-bold" style={{ color: colors.primary }}>Q</Text>
            </View>
            <Text className="text-2xl font-bold text-foreground text-center">{OFFICE_NAME}</Text>
            <Text className="text-sm text-muted mt-2 text-center">تطبيق فريق المكتب</Text>
          </View>

          <View className="bg-surface rounded-3xl p-5 border border-border">
            <Text className="text-2xl font-bold text-foreground mb-4">{title}</Text>

            {mode === "join" && (
              <>
                {field("كود الدعوة", inviteCode, setInviteCode, "QYD-XXXX-XXXX", { ltr: true, caps: true })}
                {field("الاسم داخل المكتب", displayName, setDisplayName, "اسمك داخل المكتب")}
              </>
            )}

            {mode === "create" && field("اسم المكتب", officeName, setOfficeName, "اسم المكتب")}

            {field(
              mode === "join" ? "البريد الإلكتروني أو رقم الهاتف" : "البريد الإلكتروني",
              email,
              setEmail,
              mode === "join" ? "name@example.com أو +2010..." : "name@example.com",
              { ltr: true, keyboard: mode === "join" ? "default" : "email-address" },
            )}

            {field(
              mode === "join" ? "أنشئ كلمة مرور" : "كلمة المرور",
              password,
              setPassword,
              "8 أحرف على الأقل",
              { secure: true, ltr: true },
            )}

            {!!error && <Text className="text-sm mb-4" style={{ color: colors.error }}>{error}</Text>}
            {!!info && <Text className="text-sm mb-4" style={{ color: colors.primary }}>{info}</Text>}

            <Pressable
              onPress={submit}
              disabled={submitting}
              style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? <ActivityIndicator color={colors.background} /> : <Text className="font-bold text-base" style={{ color: colors.background }}>{buttonLabel}</Text>}
            </Pressable>

            {mode === "join" ? (
              <Pressable onPress={() => switchMode("login")} className="mt-5">
                <Text className="text-sm font-bold text-center" style={{ color: colors.primary }}>لدي حساب بالفعل — تسجيل الدخول</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => switchMode("join")} className="mt-5">
                <Text className="text-sm font-bold text-center" style={{ color: colors.primary }}>لدي كود دعوة — الانضمام إلى المكتب</Text>
              </Pressable>
            )}
          </View>

          {mode !== "create" ? (
            <Pressable onPress={() => switchMode("create")} className="mt-5">
              <Text className="text-xs text-muted text-center">مالك المكتب؟ تأسيس مكتب جديد</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
