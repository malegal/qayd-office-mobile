import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * بيانات الاتصال بـ Supabase.
 * ----------------------------------------------------------------------------
 * ملاحظة لأي مطوّر:
 *  - القيمتان تأتيان من متغيّرات البيئة (EXPO_PUBLIC_*) عند البناء.
 *  - يوجد هنا احتياطي (fallback) مكتوب مباشرة حتى يعمل النشر على Vercel
 *    أو أي منصّة أخرى «بضغطة واحدة» دون الحاجة لإعداد متغيّرات بيئة.
 *  - مفتاح anon عام بطبيعته (public) ويُحمى عبر سياسات RLS في قاعدة البيانات،
 *    لذا لا بأس من تضمينه. ⚠️ لا تضع مفتاح service_role هنا أبدًا.
 */
const FALLBACK_SUPABASE_URL = "https://mgvyieyismzzvdejsvcv.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndnlpZXlpc216enZkZWpzdmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDI2NTMsImV4cCI6MjA5OTExODY1M30.xE-K83Ku3ei3GlFkwKivtBzGMDyK60R6MnYr2eEFz-I";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const serverStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => undefined,
  removeItem: async (_key: string) => undefined,
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing");
}

// التطبيق يعمل بنمط "أوفلاين أولاً" ولا يستخدم قنوات Realtime إطلاقاً.
// عند تصدير نسخة الويب (SSR على Node) لا يملك Node 20 كائن WebSocket عالمي،
// لذا نوفّر بديلاً بسيطاً (stub) يمنع فشل البناء دون أي تأثير على المتصفح أو الهاتف.
const globalScope = globalThis as unknown as { WebSocket?: unknown };
if (typeof window === "undefined" && typeof globalScope.WebSocket === "undefined") {
  class NoopWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readyState = 3;
    constructor() {}
    close() {}
    send() {}
    addEventListener() {}
    removeEventListener() {}
  }
  globalScope.WebSocket = NoopWebSocket;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: typeof window === "undefined" ? serverStorage : Platform.OS === "web" ? AsyncStorage : secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
