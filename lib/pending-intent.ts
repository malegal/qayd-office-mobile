import AsyncStorage from "@react-native-async-storage/async-storage";

type PendingInvite = { code: string; displayName: string };
type PendingOffice = { name: string; email: string };

const PENDING_INVITE_KEY = "qayd.pending-invite";
const PENDING_OFFICE_KEY = "qayd.pending-office";

/** يحفظ نية الانضمام حتى تُستكمل بعد تأكيد البريد. */
export async function setPendingInvite(code: string, displayName: string) {
  await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify({ code, displayName } satisfies PendingInvite));
}

/** يستعيد نية الانضمام المحفوظة أو يعيد null عند عدم وجودها. */
export async function getPendingInvite(): Promise<PendingInvite | null> {
  const value = await AsyncStorage.getItem(PENDING_INVITE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as PendingInvite;
  } catch {
    await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    return null;
  }
}

/** يحفظ نية إنشاء المكتب حتى تُنفّذ بعد تأكيد بريد المالك. */
export async function setPendingOffice(name: string, email: string) {
  await AsyncStorage.setItem(PENDING_OFFICE_KEY, JSON.stringify({ name, email } satisfies PendingOffice));
}

/** يستعيد نية إنشاء المكتب المحفوظة أو يعيد null عند عدم وجودها. */
export async function getPendingOffice(): Promise<PendingOffice | null> {
  const value = await AsyncStorage.getItem(PENDING_OFFICE_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as PendingOffice;
  } catch {
    await AsyncStorage.removeItem(PENDING_OFFICE_KEY);
    return null;
  }
}

/** يمسح نية الدعوة فقط بعد نجاح قبولها. */
export async function clearPendingInvite() {
  await AsyncStorage.removeItem(PENDING_INVITE_KEY);
}

/** يمسح نية المكتب فقط بعد نجاح إنشائه. */
export async function clearPendingOffice() {
  await AsyncStorage.removeItem(PENDING_OFFICE_KEY);
}

/** يمسح جميع النوايا المعلقة عند الحاجة. */
export async function clearPendingIntent() {
  await Promise.all([clearPendingInvite(), clearPendingOffice()]);
}
