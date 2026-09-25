/**
 * ============================================================================
 *  شاشة الدخول الموحّدة — «مكتب جاد الرب للمحاماة»
 * ============================================================================
 *
 *  هذه هي الشاشة الوحيدة للدخول في التطبيق. لا توجد شاشة ثانية.
 *
 *  الفكرة (لأي مطوّر جديد):
 *  ------------------------
 *  التطبيق مخصّص لفريق المكتب فقط، وأغلب المستخدمين ينضمّون عبر «كود دعوة»
 *  ينشئه المالك. لذلك الوضع الافتراضي هو «الانضمام إلى المكتب»، وفيه أربعة حقول:
 *    1) كود الدعوة   (QYD-XXXX-XXXX)
 *    2) الاسم داخل المكتب
 *    3) البريد الإلكتروني أو رقم الهاتف
 *    4) كلمة المرور (8 أحرف على الأقل)
 *
 *  تدفّق العمل:
 *  -----------
 *  1. المستخدم يُدخل البيانات ويضغط «دخول إلى المكتب».
 *  2. نحفظ «نيّة الانضمام» (الكود + الاسم) في التخزين المحلي عبر setPendingInvite،
 *     لأننا قد نحتاج تأكيد البريد قبل إتمام الانضمام.
 *  3. نحاول تسجيل الدخول (signInWithPassword). إن لم يكن الحساب موجودًا نُنشئه (signUp).
 *     - إن تطلّب Supabase تأكيد البريد، نعرض رسالة وننتظر عودة المستخدم.
 *  4. بمجرّد وجود جلسة (session)، نستدعي resolveMembership():
 *       - إن وُجدت عضوية → ننتقل إلى التبويبات /(tabs).
 *       - إن لم توجد، نحاول قبول الدعوة المعلّقة (acceptInvite) أو تأسيس المكتب المعلّق.
 *       - إن فشل كل ذلك، نعرض لوحة «لا توجد عضوية» مع إعادة المحاولة وتسجيل الخروج.
 *
 *  ملاحظات مهمة:
 *  -------------
 *  - لا ننتقل أبدًا إلى شاشة /onboarding؛ فهي الآن مجرّد تحويل إلى هذه الشاشة.
 *  - «تأسيس مكتب جديد» للمالك فقط، ويظهر كرابط صغير أسفل النموذج.
 *  - كل النصوص عربية واتجاه الصفحة RTL.
 * ============================================================================
 */

import { useCallback, useEffect, useState } from "react";
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
import { acceptInvite, createOffice } from "@/lib/office-onboarding";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import {
  clearPendingInvite,
  clearPendingOffice,
  getPendingInvite,
  getPendingOffice,
  setPendingInvite,
  setPendingOffice,
} from "@/lib/pending-intent";

/** صيغة كود الدعوة المقبولة: QYD-XXXX-XXXX (حروف/أرقام). */
const INVITE_RE = /^QYD-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

/** اسم المكتب كما يظهر في الواجهة. */
const OFFICE_NAME = "مكتب جاد الرب للمحاماة";

/** أوضاع الشاشة: الانضمام (افتراضي) / الدخول / تأسيس مكتب. */
type Mode = "join" | "login" | "create";

export default function LoginScreen() {
  const colors = useColors();
  const { session, loading: authLoading } = useSupabaseAuth();

  // حقول النموذج
  const [mode, setMode] = useState<Mode>("join");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [displayName, setDisplayName] = useState("");

  // حالة الواجهة
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [noMembership, setNoMembership] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  /**
   * ترجمة رسائل أخطاء Supabase الإنجليزية إلى رسائل عربية واضحة.
   * تُعيد "" إذا لم تُطابق أي نمط معروف، حتى نتمكّن من عرض الرسالة الأصلية
   * بدلًا من إخفائها خلف «خطأ غير معروف».
   */
  const translateAuthError = (message: string): string => {
    const text = (message || "").toLowerCase();
    if (text.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    if (text.includes("email not confirmed"))
      return "لم يتم تأكيد البريد الإلكتروني بعد. يُفضّل أن يُعطّل مالك المكتب خيار «تأكيد البريد» من إعدادات المكتب.";
    if (text.includes("user already registered") || text.includes("already been registered"))
      return "هذا الحساب موجود بالفعل. استخدم كلمة المرور المسجّلة، أو جرّب «تسجيل الدخول».";
    if (text.includes("rate limit") || text.includes("too many requests"))
      return "محاولات كثيرة، انتظر قليلًا ثم حاول مرة أخرى.";
    if (text.includes("password should be at least")) return "كلمة المرور قصيرة جدًا؛ استخدم 8 أحرف على الأقل.";
    if (text.includes("invalid phone")) return "رقم الهاتف غير صالح.";
    if (text.includes("not authenticated")) return "انتهت الجلسة. أعد تسجيل الدخول.";
    if (text.includes("invite") && (text.includes("invalid") || text.includes("not found") || text.includes("expired") || text.includes("used")))
      return "كود الدعوة غير صالح أو منتهي أو مُستخدَم من قبل.";
    if (text.includes("network") || text.includes("fetch")) return "تحقّق من اتصالك بالإنترنت.";
    return "";
  };

  /**
   * استخراج رسالة خطأ مفهومة من أي خطأ (AuthError أو PostgrestError أو Error عادي).
   * مهم: أخطاء Supabase (PostgrestError) ليست دائمًا من نوع Error، لذا نقرأ الحقول
   * مباشرة ونعرض رسالة الخادم الأصلية إن لم نجد ترجمة مناسبة (بدل «خطأ غير معروف»).
   */
  const describeError = (e: unknown): string => {
    if (e && typeof e === "object") {
      const anyE = e as { message?: string; error_description?: string; details?: string; hint?: string };
      const raw = anyE.message || anyE.error_description || anyE.details || anyE.hint || "";
      const mapped = translateAuthError(raw);
      if (mapped) return mapped;
      if (raw) return raw;
    }
    if (e instanceof Error) {
      const mapped = translateAuthError(e.message);
      return mapped || e.message;
    }
    return "تعذّر إتمام العملية. حاول مرة أخرى.";
  };

  /**
   * بعد وجود جلسة: نتأكد من العضوية.
   * - إن وُجدت → ننتقل للتبويبات.
   * - إن لم توجد → نحاول إكمال «النيّة المعلّقة» (قبول دعوة أو تأسيس مكتب).
   * - إن فشل → نعرض لوحة «لا توجد عضوية».
   * @returns true إذا أصبح للمستخدم عضوية (تم التوجيه)، وإلا false.
   */
  const resolveMembership = useCallback(async (): Promise<boolean> => {
    // 1) فحص العضوية مباشرة.
    let membership = await getCurrentMembership().catch(() => null);
    if (membership) {
      router.replace("/(tabs)");
      return true;
    }

    // 2) مهلة قصيرة: قد يكون الخطّاف useSupabaseAuth ما زال يقبل الدعوة في الخلفية.
    await new Promise((r) => setTimeout(r, 700));
    membership = await getCurrentMembership().catch(() => null);
    if (membership) {
      router.replace("/(tabs)");
      return true;
    }

    // 3) محاولة قبول الدعوة المعلّقة بأنفسنا (مع إظهار الخطأ إن فشل).
    const pendingInvite = await getPendingInvite();
    if (pendingInvite) {
      try {
        await acceptInvite(pendingInvite.code, pendingInvite.displayName);
        await clearPendingInvite();
        router.replace("/(tabs)");
        return true;
      } catch (e) {
        setError("تعذّر قبول الدعوة: " + describeError(e));
      }
    }

    // 4) محاولة تأسيس المكتب المعلّق (لو كان المستخدم مالكًا جديدًا).
    const pendingOffice = await getPendingOffice();
    if (pendingOffice) {
      try {
        await createOffice(pendingOffice.name, pendingOffice.email);
        await clearPendingOffice();
        router.replace("/(tabs)");
        return true;
      } catch (e) {
        setError("تعذّر تأسيس المكتب: " + describeError(e));
      }
    }

    return false;
  }, []);

  // عند وجود جلسة: نحاول حلّ العضوية ثم نتوجّه.
  useEffect(() => {
    if (authLoading || !session) return;
    let active = true;
    setResolving(true);
    resolveMembership()
      .then((ok) => {
        if (!active) return;
        if (!ok) setNoMembership(true);
      })
      .finally(() => {
        if (active) setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, session, resolveMembership]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  /** معالجة ضغط الزر الرئيسي حسب الوضع الحالي. */
  const submit = async () => {
    setError("");
    setInfo("");

    // التحقق من صحة المدخلات قبل الإرسال.
    if (mode === "login") {
      if (!email.trim() || !password) return setError("أدخل البريد وكلمة المرور.");
    } else if (mode === "create") {
      if (!email.trim() || password.length < 8 || !officeName.trim())
        return setError("أدخل اسم المكتب والبريد وكلمة مرور من 8 أحرف على الأقل.");
    } else {
      if (!INVITE_RE.test(inviteCode.trim())) return setError("كود الدعوة غير صحيح. الصيغة: QYD-XXXX-XXXX");
      if (!displayName.trim()) return setError("أدخل اسمك داخل المكتب.");
      if (!email.trim()) return setError("أدخل بريدك الإلكتروني أو رقم هاتفك.");
      if (password.length < 8) return setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        // دخول مباشر لحساب موجود.
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (e) throw e;
      } else if (mode === "create") {
        // تأسيس مكتب جديد (للمالك): نحفظ النيّة ثم ننشئ الحساب.
        await setPendingOffice(officeName.trim(), email.trim());
        const { data, error: e } = await supabase.auth.signUp({ email: email.trim(), password });
        if (e) throw e;
        if (!data.session) {
          setInfo(
            "تم إنشاء الحساب، لكن المكتب يتطلّب تأكيد البريد الإلكتروني قبل الدخول ولم تصل رسالة التأكيد. " +
              "اطلب من مالك المكتب تعطيل «تأكيد البريد» من إعدادات Supabase (Authentication ← Providers ← Email ← Confirm email = OFF)، ثم سجّل الدخول مباشرة.",
          );
        }
      } else {
        // الانضمام عبر كود الدعوة: نحفظ النيّة، ثم ندخل أو ننشئ الحساب.
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
              "تم إنشاء حسابك، لكن الدخول يتطلّب تأكيد البريد الإلكتروني ولم تصل رسالة التأكيد. " +
                "اطلب من مالك المكتب تعطيل «تأكيد البريد» من إعدادات Supabase (Authentication ← Providers ← Email ← Confirm email = OFF)، ثم سجّل الدخول مباشرة بكلمة المرور.",
            );
            return;
          }
        }
        // بعد نجاح الدخول/الإنشاء، سيتولّى resolveMembership قبول الدعوة تلقائيًا.
      }
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSubmitting(false);
    }
  };

  /** تسجيل الخروج والعودة لنموذج الدخول. */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setNoMembership(false);
    setResolving(false);
    setError("");
    setInfo("");
  };

  // ---------------------------------------------------------------------------
  // العرض
  // ---------------------------------------------------------------------------

  // شاشة تحميل أثناء فحص الجلسة أو أثناء حلّ العضوية.
  if (authLoading || resolving) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // لوحة «لا توجد عضوية»: تظهر فقط إذا كان هناك جلسة لكن بلا عضوية في المكتب.
  if (session && noMembership) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
        <View style={{ direction: "rtl", width: "100%", maxWidth: 420 }}>
          <Text className="text-2xl font-bold text-foreground text-center mb-3">لا توجد عضوية في المكتب</Text>
          <Text className="text-sm text-muted text-center mb-5">
            الحساب مسجّل، لكنه غير مرتبط بالمكتب بعد. تأكد من كود الدعوة، أو تواصل مع مالك المكتب.
          </Text>
          {!!error && <Text className="text-sm mb-4 text-center" style={{ color: colors.error }}>{error}</Text>}
          <Pressable
            onPress={() => {
              setError("");
              setResolving(true);
              resolveMembership().finally(() => setResolving(false));
            }}
            style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginBottom: 12 }}
          >
            <Text className="font-bold text-base" style={{ color: colors.background }}>إعادة المحاولة</Text>
          </Pressable>
          <Pressable onPress={handleSignOut} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text className="text-sm font-bold" style={{ color: colors.primary }}>تسجيل الخروج والمحاولة بكود دعوة</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const title = mode === "login" ? "تسجيل الدخول" : mode === "create" ? "تأسيس مكتب جديد" : "الانضمام إلى المكتب";
  const buttonLabel = mode === "login" ? "دخول" : mode === "create" ? "إنشاء حساب المالك" : "دخول إلى المكتب";

  /** مكوّن مساعد لرسم حقل نصّي موحّد الشكل. */
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
          {/* الشعار واسم المكتب */}
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-3xl items-center justify-center mb-5" style={{ backgroundColor: colors.foreground }}>
              <Text className="text-4xl font-bold" style={{ color: colors.primary }}>Q</Text>
            </View>
            <Text className="text-2xl font-bold text-foreground text-center">{OFFICE_NAME}</Text>
            <Text className="text-sm text-muted mt-2 text-center">تطبيق فريق المكتب</Text>
          </View>

          <View className="bg-surface rounded-3xl p-5 border border-border">
            <Text className="text-2xl font-bold text-foreground mb-4">{title}</Text>

            {/* حقول الانضمام: كود الدعوة + الاسم */}
            {mode === "join" && (
              <>
                {field("كود الدعوة", inviteCode, setInviteCode, "QYD-XXXX-XXXX", { ltr: true, caps: true })}
                {field("الاسم داخل المكتب", displayName, setDisplayName, "اسمك داخل المكتب")}
              </>
            )}

            {/* اسم المكتب (وضع التأسيس فقط) */}
            {mode === "create" && field("اسم المكتب", officeName, setOfficeName, "اسم المكتب")}

            {/* البريد أو الهاتف */}
            {field(
              mode === "join" ? "البريد الإلكتروني أو رقم الهاتف" : "البريد الإلكتروني",
              email,
              setEmail,
              mode === "join" ? "name@example.com أو +2010..." : "name@example.com",
              { ltr: true, keyboard: mode === "join" ? "default" : "email-address" },
            )}

            {/* كلمة المرور */}
            {field(
              mode === "join" ? "أنشئ كلمة مرور" : "كلمة المرور",
              password,
              setPassword,
              "8 أحرف على الأقل",
              { secure: true, ltr: true },
            )}

            {!!error && <Text className="text-sm mb-4" style={{ color: colors.error }}>{error}</Text>}
            {!!info && (
              <>
                <Text className="text-sm mb-2" style={{ color: colors.primary }}>{info}</Text>
                {mode !== "login" && email.trim().includes("@") ? (
                  <Pressable
                    onPress={async () => {
                      setError("");
                      const { error: resendError } = await supabase.auth.resend({ type: "signup", email: email.trim() });
                      if (resendError) setError(describeError(resendError));
                      else setInfo("تم إرسال رسالة تأكيد جديدة (إن كان الحساب بحاجة إلى تأكيد).");
                    }}
                    className="mb-4"
                  >
                    <Text className="text-sm font-bold" style={{ color: colors.primary }}>إعادة إرسال رسالة التأكيد</Text>
                  </Pressable>
                ) : null}
              </>
            )}

            <Pressable
              onPress={submit}
              disabled={submitting}
              style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? <ActivityIndicator color={colors.background} /> : <Text className="font-bold text-base" style={{ color: colors.background }}>{buttonLabel}</Text>}
            </Pressable>

            {/* رابط التبديل بين الانضمام والدخول */}
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

          {/* رابط المالك لتأسيس مكتب جديد */}
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
