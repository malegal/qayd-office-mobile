import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

export function Field({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "numeric"; multiline?: boolean }) {
  const colors = useColors();
  return (
    <View className="mb-4">
      <Text className="text-sm font-bold text-foreground mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className="rounded-2xl px-4 py-3 text-foreground border border-border"
        style={{ backgroundColor: colors.surface, textAlign: "right", minHeight: multiline ? 84 : undefined, textAlignVertical: multiline ? "top" : "center" }}
      />
    </View>
  );
}

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const initial = new Date(`${value || new Date().toISOString().slice(0, 10)}T12:00:00`);
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const choose = (day: number) => {
    const next = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onChange(next);
    setOpen(false);
  };
  return (
    <View className="mb-4">
      <Text className="text-sm font-bold text-foreground mb-2">{label}</Text>
      <Pressable onPress={() => setOpen(true)} className="rounded-2xl px-4 py-3 border border-border flex-row items-center justify-between" style={{ backgroundColor: colors.surface, direction: "rtl" }}>
        <Text className="text-base text-foreground">{value || "اختر التاريخ"}</Text>
        <IconSymbol name="calendar.badge.clock" size={21} color={colors.primary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 20 }}>
          <View className="rounded-3xl p-5" style={{ backgroundColor: colors.surface, direction: "rtl" }}>
            <View className="flex-row items-center justify-between mb-5">
              <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><Text style={{ color: colors.primary, fontSize: 25 }}>‹</Text></Pressable>
              <Text className="text-lg font-bold text-foreground">{MONTHS[month.getMonth()]} {month.getFullYear()}</Text>
              <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><Text style={{ color: colors.primary, fontSize: 25 }}>›</Text></Pressable>
            </View>
            <View className="flex-row flex-wrap" style={{ direction: "rtl" }}>
              {Array.from({ length: firstDay }).map((_, index) => <View key={`empty-${index}`} style={{ width: "14.28%", height: 42 }} />)}
              {Array.from({ length: days }).map((_, index) => (
                <Pressable key={index + 1} onPress={() => choose(index + 1)} style={{ width: "14.28%", height: 42, alignItems: "center", justifyContent: "center" }}>
                  <Text className="text-base text-foreground">{index + 1}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setOpen(false)} className="mt-4 rounded-xl py-3" style={{ backgroundColor: colors.background, alignItems: "center" }}>
              <Text className="font-bold" style={{ color: colors.primary }}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function SelectField({ label, value, options, onChange, placeholder = "اختر" }: { label: string; value: string; options: string[]; onChange: (value: string) => void; placeholder?: string }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View className="mb-4">
      <Text className="text-sm font-bold text-foreground mb-2">{label}</Text>
      <Pressable onPress={() => setOpen(true)} className="rounded-2xl px-4 py-3 border border-border flex-row items-center justify-between" style={{ backgroundColor: colors.surface, direction: "rtl" }}>
        <Text className="text-base text-foreground">{value || placeholder}</Text>
        <IconSymbol name="chevron.down" size={20} color={colors.primary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", padding: 24 }}>
          <View className="rounded-3xl p-5" style={{ backgroundColor: colors.surface, direction: "rtl" }}>
            <Text className="text-lg font-bold text-foreground mb-4">{label}</Text>
            {options.map((option) => (
              <Pressable key={option} onPress={() => { onChange(option); setOpen(false); }} className="rounded-xl p-4 mb-2" style={{ backgroundColor: value === option ? `${colors.primary}20` : colors.background, borderWidth: 1, borderColor: value === option ? colors.primary : colors.border }}>
                <Text className="text-base text-foreground">{option}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setOpen(false)} className="mt-2 rounded-xl py-3" style={{ backgroundColor: colors.background, alignItems: "center" }}>
              <Text className="font-bold" style={{ color: colors.primary }}>إلغاء</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
