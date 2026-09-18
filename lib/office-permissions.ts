export type OfficeRole = "manager" | "lawyer" | "staff" | "accountant";
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
  accountant: ["view_all", "add_professional_file", "add_case", "add_session", "add_task", "add_expense", "add_fee", "add_payment"],
  lawyer: ["view_cases_sessions_names", "add_case", "add_professional_file", "add_session", "add_task", "add_procedure", "add_expense", "add_fee"],
  staff: ["view_cases_sessions_names", "add_case", "add_professional_file", "add_session", "add_task", "add_procedure", "add_expense", "add_fee"],
};

export function can(role: OfficeRole | null | undefined, permission: OfficePermission) {
  return Boolean(role && permissions[role].includes(permission));
}

export function canViewFinance(role: OfficeRole | null | undefined) {
  return role === "manager" || role === "accountant";
}

export function canAddPayment(role: OfficeRole | null | undefined) {
  return can(role, "add_payment");
}

export function roleLabel(role: OfficeRole) {
  return ({ manager: "مالك", lawyer: "محامي", staff: "سكرتيرة", accountant: "محاسب" } as const)[role];
}
