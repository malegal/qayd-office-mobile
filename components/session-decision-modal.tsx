import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Field, DateField, SelectField } from "@/components/form-fields";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { queueSessionDecision } from "@/lib/office-actions";
import { shiftDateKey, todayKey, type RollItem } from "@/lib/office-roll";

const STATUSES = ["مؤجلة", "حكم", "حجز للحكم", "مشطوبة", "موقوفة", "شطب جزئي"];

/**
 * مودال «إثبات القرار والترحيل»:
 * يسجّل قرار الجلسة الحالية ويُنشئ الجلسة القادمة في خطوة واحدة،
 * مع إمكانية إرفاق صورة الرول. كل ما يُسجَّل يذهب إلى مركز اعتماد المالك.
 */
export function SessionDecisionModal({
  visible,
  onClose,
  officeId,
  item,
  onSubmitted,
}: {
  visible: boolean;
  onClose: () => void;
  officeId: string;
  item: RollItem | null;
  onSubmitted?: () => void;
}) {
  const colors = useColors();
  const offline = useOfflineSync(officeId);
  const [decision, setDecision] = useState("");
  const [caseStatus, setCaseStatus] = useState("مؤجلة");
  const [nextDate, setNextDate] = useState("");
  const [requiredAction, setRequiredAction] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    if (visible && item) {
      setDecision("");
      setCaseStatus("مؤجلة");
      setNextDate(shiftDateKey(todayKey(), 30));
      setRequiredAction("");
      setNotes("");
      setPhoto(null);
      setError("");
      setDone("");
    }
  }, [visible, item]);

  const pickPhoto = async () => {
    setError("");
    setPhotoBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      let result;
      if (perm.granted) {
        result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.5 });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
      }
      if (!result.canceled && result.assets?.[0]?.base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.5 });
        if (!result.canceled && result.assets?.[0]?.base64) setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } catch {
        setError("تعذر فتح الكاميرا أو الصور على هذا الجهاز.");
      }
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async () => {
    if (!item) return;
    if (!decision.trim()) return setError("أدخل قرار الجلسة أولًا.");
    if (!nextDate) return setError("اختر تاريخ الجلسة القادمة.");
    setSaving(true);
    setError("");
    setDone("");
    try {
      await queueSessionDecision(officeId, {
        sessionId: item.session.id,
        caseId: item.session.case_id,
        decision: decision.trim(),
        caseStatus,
        nextDate,
        requiredAction: requiredAction.trim(),
        courtName: item.court,
        circuit: item.circuit,
        notes: notes.trim(),
        attachment: photo,
      });
      setDone(
        offline.isOnline
          ? "تم إرسال القرار والترحيل لمركز اعتماد المالك."
          : "تم الحفظ محليًا؛ ستُرسل العملية عند عودة الاتصال.",
      );
      onSubmitted?.();
      setTimeout(() => onClose(), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر حفظ القرار والترحيل.");
    } finally {
      setSaving(false);
    }
  };

  const c = item?.case;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#0009", justifyContent: "flex-end" }}>
        <View style={{ maxHeight: "94%", backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, direction: "rtl" }}>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold text-foreground">إثبات القرار والترحيل</Text>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <IconSymbol name="xmark" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {item ? (
            <View className="rounded-2xl p-3 mb-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-sm font-bold text-foreground">رقم الرول: {item.rollNumber} · {c?.client_name || "بدون اسم"}</Text>
              <Text className="text-xs text-muted mt-1">القضية: {c?.case_number || c?.case_code || "غير مسجل"}{c?.case_year ? ` / ${c.case_year}` : ""}</Text>
              <Text className="text-xs text-muted mt-1">{item.court} · {item.circuit} · {item.session.session_date}</Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
            <Field label="قرار الجلسة *" value={decision} onChangeText={setDecision} placeholder="مثال: حجز للحكم / تأجيل لجلسة / شطب" multiline />
            <SelectField label="حالة الجلسة" value={caseStatus} options={STATUSES} onChange={setCaseStatus} />
            <DateField label="تاريخ الجلسة القادمة *" value={nextDate} onChange={setNextDate} />
            <Field label="المطلوب في الجلسة القادمة" value={requiredAction} onChangeText={setRequiredAction} placeholder="مثال: تقديم مذكرة / إحضار أصل العقد" />
            <Field label="ملاحظات" value={notes} onChangeText={setNotes} placeholder="ملاحظة مختصرة (اختياري)" />

            <View className="mb-4">
              <Text className="text-sm font-bold text-foreground mb-2">صورة الرول (اختياري)</Text>
              {photo ? (
                <View className="rounded-2xl overflow-hidden" style={{ borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: photo }} style={{ width: "100%", height: 180 }} resizeMode="cover" />
                  <Pressable onPress={() => setPhoto(null)} className="py-2 items-center" style={{ backgroundColor: colors.surface }}>
                    <Text className="text-xs font-bold" style={{ color: colors.error }}>إزالة الصورة</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={pickPhoto} disabled={photoBusy} className="rounded-2xl py-4 items-center flex-row justify-center" style={{ backgroundColor: colors.background, borderWidth: 1, borderStyle: "dashed", borderColor: colors.primary }}>
                  {photoBusy ? <ActivityIndicator color={colors.primary} /> : <><IconSymbol name="camera.fill" size={20} color={colors.primary} /><Text className="text-sm font-bold mr-2" style={{ color: colors.primary }}>التقاط صورة الرول</Text></>}
                </Pressable>
              )}
            </View>

            {error ? <Text className="text-sm mb-3" style={{ color: colors.error }}>{error}</Text> : null}
            {done ? <Text className="text-sm mb-3" style={{ color: colors.success }}>{done}</Text> : null}
          </ScrollView>

          <Pressable onPress={submit} disabled={saving} style={{ backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 15, alignItems: "center", opacity: saving ? 0.6 : 1 }}>
            {saving ? <ActivityIndicator color={colors.background} /> : <Text className="text-base font-bold" style={{ color: colors.background }}>تأكيد القرار والترحيل</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
