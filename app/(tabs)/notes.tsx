import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getCurrentMembership, type OfficeMembership } from "@/lib/office-data";
import { supabase } from "@/lib/supabase";

type TeamNote = {
  id: number;
  office_id: string;
  content: string;
  case_id: string | null;
  office_file_id: string | null;
  author_user_id: string;
  created_at: string;
  updated_at: string;
};
type NoteCase = { id: string; client_name: string | null; case_number: string | null; case_code: string | null };
type NoteMember = { user_id: string; display_name: string | null; role: OfficeMembership["role"] };

const MAX_NOTE_LENGTH = 4000;

export default function NotesScreen() {
  const colors = useColors();
  const [membership, setMembership] = useState<OfficeMembership | null>(null);
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [cases, setCases] = useState<NoteCase[]>([]);
  const [members, setMembers] = useState<NoteMember[]>([]);
  const [body, setBody] = useState("");
  const [caseId, setCaseId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const caseMap = useMemo(() => new Map(cases.map((item) => [item.id, item])), [cases]);
  const memberMap = useMemo(() => new Map(members.map((item) => [item.user_id, item])), [members]);
  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter((note) => {
      const linkedCase = note.case_id ? caseMap.get(note.case_id) : null;
      const author = memberMap.get(note.author_user_id);
      return [note.content, linkedCase?.client_name, linkedCase?.case_number, linkedCase?.case_code, author?.display_name].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [caseMap, memberMap, notes, search]);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = membership || await getCurrentMembership();
      if (!current) { setMembership(null); setNotes([]); return; }
      setMembership(current);
      const [notesResult, casesResult, membersResult] = await Promise.all([
        supabase.from("notes").select("id,office_id,content,case_id,office_file_id,author_user_id,created_at,updated_at").eq("office_id", current.office_id).order("created_at", { ascending: false }).limit(500),
        supabase.from("cases").select("id,client_name,case_number,case_code").eq("office_id", current.office_id).eq("archived", 0).order("created_at", { ascending: false }).limit(500),
        supabase.from("office_members").select("user_id,display_name,role").eq("office_id", current.office_id).limit(100),
      ]);
      if (notesResult.error) throw notesResult.error;
      if (casesResult.error) throw casesResult.error;
      if (membersResult.error) throw membersResult.error;
      setNotes((notesResult.data || []) as TeamNote[]);
      setCases((casesResult.data || []) as NoteCase[]);
      setMembers((membersResult.data || []) as NoteMember[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل ملاحظات الفريق.");
    } finally { setLoading(false); }
  }, [membership]);

  useEffect(() => { loadNotes().catch(() => undefined); }, [loadNotes]);

  const resetEditor = () => { setBody(""); setCaseId(null); setEditingId(null); };
  const saveNote = async () => {
    const trimmed = body.trim();
    if (!membership) return;
    if (!trimmed || trimmed.length > MAX_NOTE_LENGTH) { setError("اكتب ملاحظة بين 1 و4000 حرف."); return; }
    setSaving(true); setError("");
    try {
      const query = editingId
        ? supabase.from("notes").update({ content: trimmed, case_id: caseId }).eq("id", editingId).eq("office_id", membership.office_id)
        : supabase.from("notes").insert({ office_id: membership.office_id, content: trimmed, case_id: caseId, author_user_id: membership.user_id });
      const { error: saveError } = await query;
      if (saveError) throw saveError;
      resetEditor();
      await loadNotes();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ الملاحظة.");
    } finally { setSaving(false); }
  };

  const beginEdit = (note: TeamNote) => { setEditingId(note.id); setBody(note.content); setCaseId(note.case_id); setError(""); };
  const deleteNote = (note: TeamNote) => {
    Alert.alert("حذف الملاحظة؟", "لا يمكن التراجع عن هذا الإجراء.", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: async () => {
        const { error: deleteError } = await supabase.from("notes").delete().eq("id", note.id).eq("office_id", membership?.office_id || "");
        if (deleteError) setError(deleteError.message); else await loadNotes();
      } },
    ]);
  };

  const renderNote = ({ item }: { item: TeamNote }) => {
    const linkedCase = item.case_id ? caseMap.get(item.case_id) : null;
    const author = memberMap.get(item.author_user_id);
    const canManage = membership?.role === "manager" || membership?.user_id === item.author_user_id;
    const caseLabel = linkedCase ? `${linkedCase.client_name || "قضية"} · ${linkedCase.case_number || linkedCase.case_code || "بدون رقم"}` : "ملاحظة عامة للمكتب";
    const wasEdited = item.updated_at && item.updated_at !== item.created_at;
    return <View className="rounded-2xl p-4 mb-3" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}>
      <View className="flex-row items-start justify-between" style={{ direction: "rtl" }}><View style={{ flex: 1 }}><Text className="text-sm font-bold text-foreground">{caseLabel}</Text><Text className="text-xs text-muted mt-1">{author?.display_name || author?.role || "عضو المكتب"} · {new Date(item.created_at).toLocaleString("ar-EG")}{wasEdited ? " · معدلة" : ""}</Text></View>{canManage ? <View className="flex-row" style={{ gap: 8 }}><Pressable onPress={() => beginEdit(item)}><Text style={{ color: colors.primary, fontWeight: "700" }}>تعديل</Text></Pressable><Pressable onPress={() => deleteNote(item)}><Text style={{ color: colors.error, fontWeight: "700" }}>حذف</Text></Pressable></View> : null}</View>
      <Text className="text-sm text-foreground mt-3" style={{ lineHeight: 24 }}>{item.content}</Text>
    </View>;
  };

  if (loading && !membership) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /><Text className="text-sm text-muted mt-3">جاري تحميل ملاحظات الفريق...</Text></ScreenContainer>;
  return <ScreenContainer className="px-5" safeAreaClassName="bg-background"><View className="mt-5 mb-4" style={{ direction: "rtl" }}><View className="flex-row items-center justify-between"><View><Text className="text-2xl font-bold text-foreground">ملاحظات الفريق</Text><Text className="text-sm text-muted mt-1">مساحة داخلية للمكتب دون بيانات مالية.</Text></View><IconSymbol name="note.text" size={26} color={colors.primary} /></View></View>
    <View className="rounded-2xl p-4 mb-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, direction: "rtl" }}><Text className="text-sm font-bold text-foreground mb-2">{editingId ? "تعديل الملاحظة" : "ملاحظة جديدة"}</Text><TextInput value={body} onChangeText={setBody} multiline maxLength={MAX_NOTE_LENGTH} placeholder="اكتب ملاحظة يراها فريق المكتب..." placeholderTextColor={colors.muted} style={{ minHeight: 92, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.foreground, textAlign: "right", backgroundColor: colors.background }} /><Text className="text-xs text-muted mt-2">ربط اختياري بقضية:</Text><View className="flex-row flex-wrap mt-2" style={{ direction: "rtl" }}><Pressable onPress={() => setCaseId(null)} style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 6, marginBottom: 6, backgroundColor: !caseId ? colors.primary : colors.background }}><Text style={{ color: !caseId ? colors.background : colors.foreground, fontSize: 12, fontWeight: "700" }}>عامة</Text></Pressable>{cases.slice(0, 30).map((item) => <Pressable key={item.id} onPress={() => setCaseId(item.id)} style={{ borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginLeft: 6, marginBottom: 6, backgroundColor: caseId === item.id ? colors.primary : colors.background }}><Text style={{ color: caseId === item.id ? colors.background : colors.foreground, fontSize: 12, fontWeight: "700" }}>{item.client_name || item.case_number || item.case_code || "قضية"}</Text></Pressable>)}</View><View className="flex-row mt-3" style={{ direction: "rtl", gap: 8 }}><Pressable onPress={saveNote} disabled={saving} style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: "center", opacity: saving ? 0.6 : 1 }}><Text style={{ color: colors.background, fontWeight: "700" }}>{saving ? "جارٍ الحفظ..." : editingId ? "حفظ التعديل" : "إضافة الملاحظة"}</Text></Pressable>{editingId ? <Pressable onPress={resetEditor} style={{ paddingHorizontal: 16, borderRadius: 12, paddingVertical: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.foreground, fontWeight: "700" }}>إلغاء</Text></Pressable> : null}</View></View>
    <TextInput value={search} onChangeText={setSearch} placeholder="بحث في الملاحظات أو القضايا" placeholderTextColor={colors.muted} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.foreground, textAlign: "right", backgroundColor: colors.surface, marginBottom: 12 }} />
    {error ? <Text className="text-sm mb-3" style={{ color: colors.error, textAlign: "right" }}>{error}</Text> : null}
    <FlatList data={visibleNotes} keyExtractor={(item) => String(item.id)} renderItem={renderNote} contentContainerStyle={{ paddingBottom: 30 }} ListEmptyComponent={<Text className="text-sm text-muted text-center py-8">لا توجد ملاحظات بعد.</Text>} refreshing={loading} onRefresh={loadNotes} />
  </ScreenContainer>;
}
