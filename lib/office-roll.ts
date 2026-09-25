import type { CaseRow, SessionRow } from "@/lib/office-lists";

/** يعيد مفتاح التاريخ بصيغة YYYY-MM-DD. */
export function toDateKey(value: string | null | undefined) {
  return (value ?? "").slice(0, 10);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function shiftDateKey(key: string, days: number) {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatArabicDate(key: string) {
  try {
    return new Date(`${key}T12:00:00`).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return key;
  }
}

export type RollItem = {
  session: SessionRow;
  case: CaseRow | null;
  court: string;
  circuit: string;
  rollNumber: number;
};

export type RollGroup = { court: string; circuit: string; items: RollItem[] };

/**
 * يبني رول اليوم: يجمع جلسات يوم واحد مرتّبة حسب المحكمة ثم الدائرة ثم وقت الجلسة،
 * ويُرقّم كل جلسة ترقيماً متسلسلاً (رقم الرول) ليعرفه العضو داخل القاعة.
 */
export function buildRoll(sessions: SessionRow[], cases: CaseRow[], dateKey: string): RollItem[] {
  const caseMap = new Map(cases.map((c) => [c.id, c]));
  const daySessions = sessions.filter((s) => toDateKey(s.session_date) === dateKey);
  const sorted = daySessions.slice().sort((a, b) => {
    const ca = caseMap.get(a.case_id);
    const cb = caseMap.get(b.case_id);
    const courtA = String(a.court_name || ca?.court_name || "");
    const courtB = String(b.court_name || cb?.court_name || "");
    if (courtA !== courtB) return courtA.localeCompare(courtB, "ar");
    const circA = String(a.circuit || ca?.circuit || "");
    const circB = String(b.circuit || cb?.circuit || "");
    if (circA !== circB) return circA.localeCompare(circB, "ar");
    return String(a.session_date).localeCompare(String(b.session_date));
  });
  return sorted.map((session, index) => {
    const c = caseMap.get(session.case_id) ?? null;
    return {
      session,
      case: c,
      court: session.court_name || c?.court_name || "محكمة غير مسجلة",
      circuit: session.circuit || c?.circuit || "دائرة غير مسجلة",
      rollNumber: index + 1,
    };
  });
}

/** يجمع الرول في مجموعات حسب المحكمة/الدائرة لعرضه في أقسام. */
export function groupRoll(items: RollItem[]): RollGroup[] {
  const groups: RollGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.court === item.court && last.circuit === item.circuit) last.items.push(item);
    else groups.push({ court: item.court, circuit: item.circuit, items: [item] });
  }
  return groups;
}

export function sessionTime(value: string | null | undefined) {
  const raw = String(value ?? "");
  return raw.includes("T") ? raw.slice(11, 16) : "";
}
