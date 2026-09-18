import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { getCurrentMembership, getCurrentMembershipFresh } from "@/lib/office-data";
import { createInvite, createRecoveryCodes, listOfficeMembers, revokeMember, setMemberRole, type InviteRole } from "@/lib/office-onboarding";
import { listMemberDevices, renameMember, type MemberDevice } from "@/lib/member-control";

type Member = { user_id: string; display_name: string | null; role: string; created_at: string };

export default function TeamScreen() {
  const colors = useColors();
  const [officeId, setOfficeId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [devices, setDevices] = useState<Record<string, MemberDevice[]>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [contact, setContact] = useState("");
  const [role, setRole] = useState<InviteRole>("lawyer");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const membership = await getCurrentMembership();
    if (!membership || membership.role !== "manager") { router.replace("/(tabs)"); return; }
    setOfficeId(membership.office_id);
    const rows = await listOfficeMembers(membership.office_id) as Member[];
    setMembers(rows);
    const deviceRows = await Promise.all(rows.filter((m) => m.role !== "manager").map(async (m) => [m.user_id, await listMemberDevices(membership.office_id, m.user_id)] as const));
    setDevices(Object.fromEntries(deviceRows));
    setNames(Object.fromEntries(rows.map((m) => [m.user_id, m.display_name || ""])));
  };
  useEffect(() => { load().catch(() => setError("تعذر تحميل أعضاء المكتب.")); }, []);

  const invite = async () => {
    const normalizedContact = contact.trim();
    if (!normalizedContact) { setError("أدخل البريد الإلكتروني أو رقم الهاتف أولًا."); return; }
    setBusy(true); setError("");
    try {
      const freshMembership = await getCurrentMembershipFresh();
      if (!freshMembership || freshMembership.role !== "manager") throw new Error("يجب أن تكون مالك المكتب لإنشاء دعوة.");
      const result = await createInvite(freshMembership.office_id, normalizedContact, role);
      setOfficeId(freshMembership.office_id); setCode(result.code); setContact("");
    } catch (e) {
      const message = e instanceof Error ? e.message : "تعذر إنشاء الدعوة.";
      setError(message.includes("owner only") ? "الحساب الحالي ليس مالك المكتب في قاعدة البيانات." : message.includes("not authenticated") ? "انتهت جلسة الدخول؛ سجّل الدخول مرة أخرى." : `تعذر إنشاء الدعوة: ${message}`);
    }
    finally { setBusy(false); }
  };
  const saveName = async (userId: string) => {
    try { await renameMember(officeId, userId, names[userId] || ""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر حفظ اسم العضو."); }
  };
  const removeMember = async (userId: string) => {
    setBusy(true); setError("");
    try { await revokeMember(officeId, userId); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر إزالة العضو."); }
    finally { setBusy(false); }
  };

  if (!officeId && !error) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><ActivityIndicator color={colors.primary} /></View>;
  return <ScrollView contentContainerStyle={{ padding: 20, backgroundColor: colors.background }}><View style={{ direction: "rtl" }}>
    <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary, fontWeight: "700" }}>رجوع</Text></Pressable>
    <Text className="text-2xl font-bold text-foreground mt-5">إدارة فريق المكتب</Text>
    <Text className="text-sm text-muted mt-2 mb-5">يمكنك تسمية الأعضاء ومراجعة أجهزتهم وإزالة وصولهم عند مغادرة العمل.</Text>
    <View className="rounded-2xl p-4 mb-5" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <Text className="text-base font-bold text-foreground mb-3">دعوة عضو</Text>
      <TextInput value={contact} onChangeText={setContact} placeholder="البريد أو الهاتف" placeholderTextColor={colors.muted} className="border border-border rounded-xl px-3 py-3 text-foreground mb-3" style={{ backgroundColor: colors.background, textAlign: "left" }} />
      <View className="flex-row mb-3">{([['lawyer', 'محامي'], ['staff', 'سكرتيرة'], ['accountant', 'محاسب']] as const).map(([r, label]) => <Pressable key={r} onPress={() => setRole(r)} style={{ flex: 1, padding: 10, marginLeft: 6, borderRadius: 10, backgroundColor: role === r ? colors.primary : colors.background }}><Text style={{ textAlign: "center", color: role === r ? colors.background : colors.foreground, fontWeight: "700" }}>{label}</Text></Pressable>)}</View>
      <Pressable onPress={invite} disabled={busy} style={{ backgroundColor: colors.primary, borderRadius: 12, padding: 13, alignItems: "center" }}><Text style={{ color: colors.background, fontWeight: "700" }}>إنشاء كود الدعوة</Text></Pressable>{code ? <Text className="text-xl font-bold mt-4" style={{ color: colors.primary, textAlign: "center" }}>{code}</Text> : null}
    </View>
    <View className="rounded-2xl p-4 mb-5" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
      <Text className="text-base font-bold text-foreground mb-2">أعضاء المكتب والأجهزة</Text>
      {members.map((member) => <View key={member.user_id} className="py-3 border-b border-border">
        <TextInput value={names[member.user_id] || ""} onChangeText={(value) => setNames((current) => ({ ...current, [member.user_id]: value }))} placeholder={member.user_id} placeholderTextColor={colors.muted} className="border border-border rounded-xl px-3 py-2 text-foreground" style={{ backgroundColor: colors.background, textAlign: "right" }} />
        <Text className="text-xs text-muted mt-1">الدور: {member.role}</Text>
        {member.role !== "manager" ? <><Pressable onPress={() => saveName(member.user_id)}><Text className="text-xs mt-2" style={{ color: colors.primary }}>حفظ اسم العضو</Text></Pressable>{(devices[member.user_id] || []).map((device) => <View key={device.device_id} className="rounded-xl p-3 mt-2" style={{ backgroundColor: colors.background }}><Text className="text-xs font-bold text-foreground">الجهاز: {device.device_name || device.platform}</Text><Text className="text-xs text-muted mt-1">{device.platform} · إصدار التطبيق {device.app_version || "غير معروف"}</Text><Text className="text-xs text-muted mt-1">آخر ظهور: {new Date(device.last_seen_at).toLocaleString("ar-EG")}</Text></View>)}<Pressable onPress={() => removeMember(member.user_id)} disabled={busy}><Text className="text-xs mt-2" style={{ color: colors.error }}>إزالة العضو ومسح بياناته المحلية عند اتصاله</Text></Pressable></> : <Text className="text-xs text-muted mt-2">مالك المكتب</Text>}
      </View>)}
    </View>
    <Pressable onPress={async () => { try { setRecovery(await createRecoveryCodes(officeId)); } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء رموز الاسترداد."); } }} className="rounded-xl p-4" style={{ backgroundColor: colors.foreground }}><Text style={{ color: colors.primary, fontWeight: "700", textAlign: "center" }}>إنشاء رموز استرداد جديدة للمالك</Text></Pressable>
    {recovery.length ? <Text className="text-sm text-foreground mt-3" style={{ textAlign: "center" }}>{recovery.join("\n")}</Text> : null}{error ? <Text className="text-sm mt-4" style={{ color: colors.error }}>{error}</Text> : null}
  </View></ScrollView>;
}
