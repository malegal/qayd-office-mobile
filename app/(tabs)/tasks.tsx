import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Field, DateField } from "@/components/form-fields";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { getTasks, type TaskRow } from "@/lib/office-lists";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { queueTask } from "@/lib/office-actions";

export default function TasksScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const offline = useOfflineSync(membership?.office_id);

  const load = useCallback(async (officeId: string) => {
    setError("");
    try {
      setTasks(await getTasks(officeId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل المهام.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentMembership()
      .then((m) => { setMembership(m); if (m) load(m.office_id); else setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : "تعذر معرفة المكتب."); setLoading(false); });
  }, [load]);

  if (loading) {
    return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جارٍ تحميل المهام...</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer className="px-5" safeAreaClassName="bg-background">
      <View className="flex-row items-center justify-between mt-5 mb-4" style={{ direction: "rtl" }}>
        <View>
          <Text className="text-2xl font-bold text-foreground">المهام</Text>
          <Text className="text-sm text-muted mt-1">إجراءات ومهام المتابعة اليومية.</Text>
        </View>
        <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [{ backgroundColor: colors.primary, borderRadius: 14, padding: 12, opacity: pressed ? 0.8 : 1 }]}>
          <IconSymbol name="plus" size={22} color={colors.background} />
        </Pressable>
      </View>

      <View className="rounded-2xl px-4 py-3 mb-4 flex-row items-center justify-between" style={{ backgroundColor: offline.isOnline ? `${colors.success}18` : `${colors.warning}22`, direction: "rtl" }}>
        <Text className="text-xs font-bold" style={{ color: offline.isOnline ? colors.success : colors.warning }}>{offline.isOnline ? "متصل" : "غير متصل"}</Text>
        <Text className="text-xs text-muted">{tasks.length} مهمة مفتوحة</Text>
      </View>

      {error ? <Text className="text-xs mb-3" style={{ color: colors.error, textAlign: "right" }}>{error}</Text> : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        {tasks.length ? tasks.map((task) => (
          <View key={task.id} className="rounded-2xl p-4 mb-3 flex-row items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}>
            <View className="w-9 h-9 rounded-xl items-center justify-center ml-3" style={{ backgroundColor: `${colors.primary}20` }}><IconSymbol name="checklist" size={18} color={colors.primary} /></View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-foreground">{task.description}</Text>
              <Text className="text-xs text-muted mt-1">الاستحقاق: {task.date}</Text>
            </View>
          </View>
        )) : <View className="rounded-3xl p-8 items-center" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}><IconSymbol name="checklist" size={36} color={colors.primary} /><Text className="text-sm text-muted mt-3">لا توجد مهام مفتوحة.</Text></View>}
      </ScrollView>

      {membership ? <TaskModal visible={open} onClose={() => setOpen(false)} officeId={membership.office_id} onSaved={() => { setOpen(false); load(membership.office_id); }} /> : null}
    </ScreenContainer>
  );
}

function TaskModal({ visible, onClose, officeId, onSaved }: { visible: boolean; onClose: () => void; officeId: string; onSaved: () => void }) {
  const colors = useColors();
  const offline = useOfflineSync(officeId);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setDescription(""); setDate(new Date().toISOString().slice(0, 10)); setError(""); }
  }, [visible]);

  const submit = async () => {
    if (!description.trim()) return setError("أدخل وصف المهمة.");
    setSaving(true);
    setError("");
    try {
      await queueTask(officeId, { description: description.trim(), date });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ المهمة.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#0009", justifyContent: "flex-end" }}>
        <View style={{ maxHeight: "92%", backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, direction: "rtl" }}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-foreground">مهمة جديدة</Text>
            <Pressable onPress={onClose} style={{ padding: 6 }}><IconSymbol name="xmark" size={22} color={colors.muted} /></Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
            <Field label="وصف المهمة *" value={description} onChangeText={setDescription} placeholder="مثال: تسليم ورقة للمحضرين" multiline />
            <DateField label="تاريخ الاستحقاق" value={date} onChange={setDate} />
            {error ? <Text className="text-sm mb-3" style={{ color: colors.error }}>{error}</Text> : null}
          </ScrollView>
          <Pressable onPress={submit} disabled={saving} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: saving ? 0.6 : 1 }}>
            {saving ? <ActivityIndicator color={colors.background} /> : <Text className="text-base font-bold" style={{ color: colors.background }}>حفظ المهمة</Text>}
          </Pressable>
          <Text className="text-xs text-muted mt-2 text-center">{offline.isOnline ? "ستُرسل المهمة لمركز اعتماد المالك." : "ستُحفظ محليًا وتُرسل عند عودة الاتصال."}</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
