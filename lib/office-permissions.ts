export type OfficeRole = "manager" | "lawyer" | "staff" | "accountant" | "member";
export type OfficePermission =
  | "view_all"
  | "view_cases_sessions_names"
  | "add_case"
  | "add_professional_file"
  | "add_session"
  | "add_task"
  | "add_procedure"
  | "add_expense"
  | "add_fee"
  | "add_payment"
  | "edit"
  | "delete"
  | "manage_team";

const permissions: Record<OfficeRole, readonly OfficePermission[]> = {
  manager: ["view_all", "add_case", "add_professional_file", "add_session", "add_task", "add_procedure", "add_expense", "add_fee", "add_payment", "edit", "delete", "manage_team"],
  accountant: ["view_all", "add_professional_file", "add_case", "add_expense", "add_fee", "add_payment"],
  lawyer: ["view_cases_sessions_names", "add_case", "add_professional_file", "add_session", "add_task", "add_procedure", "add_expense", "add_fee"],
  staff: ["view_cases_sessions_names", "add_case", "add_professional_file", "add_session", "add_task", "add_procedure", "add_expense", "add_fee"],
  // عضو المكتب: يرحّل الجلسات، يسجّل الإجراءات، يبحث في القضايا، ويسجّل المصروفات فقط.
  // لا يرى العدّادات المالية ولا يحذف أي سجل.
  member: ["view_cases_sessions_names", "add_session", "add_task", "add_procedure", "add_expense"],
};

export function can(role: OfficeRole | null | undefined, permission: OfficePermission) {
  return Boolean(role && permissions[role]?.includes(permission));
}

/** المالية التفصيلية (الأتعاب/المحصلة/المتبقية) للمالك والمحاسب فقط. */
export function canViewFinance(role: OfficeRole | null | undefined) {
  return role === "manager" || role === "accountant";
}

/** الاسم البديل الواضح: هل يستطيع رؤية الأرقام المالية للقضايا؟ */
export function canViewFinancials(role: OfficeRole | null | undefined) {
  return canViewFinance(role);
}

/**
 * عدّاد القضايا في المكتب.
 * عضو المكتب لا يرى عدّاد القضايا في المكتب مطلقاً.
 */
export function canViewCaseCount(role: OfficeRole | null | undefined) {
  return Boolean(role) && role !== "member";
}

/** الحذف محصور بالمالك فقط (manager)؛ لا يحذف عضو المكتب ولا أي دور آخر. */
export function canDelete(role: OfficeRole | null | undefined) {
  return role === "manager";
}

/** رول الجلسات متاح لكل الأدوار بما فيها عضو المكتب. */
export function canViewRoll(role: OfficeRole | null | undefined) {
  return Boolean(role);
}

export function canAddPayment(role: OfficeRole | null | undefined) {
  return can(role, "add_payment");
}

export function roleLabel(role: OfficeRole) {
  return ({ manager: "مالك", lawyer: "محامي", staff: "سكرتيرة", accountant: "محاسب", member: "عضو" } as const)[role];
}
