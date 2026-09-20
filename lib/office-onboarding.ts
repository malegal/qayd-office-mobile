import { supabase } from "@/lib/supabase";

export type InviteRole = "lawyer" | "staff" | "accountant";

export async function createOffice(name: string, email?: string, pin?: string) {
  const { data, error } = await supabase.rpc("create_office_for_current_user", { p_office_name: name, p_email: email || null, p_pin: pin || null });
  if (error) throw error;
  return data as { office_id: string; role: "manager" };
}

export async function acceptEmailInvite(token: string, displayName?: string) {
  const { data, error } = await supabase.rpc("accept_email_invite", {
    p_token: token.trim(),
    p_display_name: displayName?.trim() || null,
  });
  if (error) throw error;
  return { office_id: data as string };
}

/** Kept for existing installations that still have a legacy invitation. */
export async function acceptInvite(code: string, displayName?: string) {
  const { data, error } = await supabase.rpc("accept_office_invite", { p_code: code, p_display_name: displayName || null });
  if (error) throw error;
  return data as { office_id: string; role: InviteRole };
}

export async function createInvite(officeId: string, contact: string, role: InviteRole) {
  const normalizedOfficeId = officeId.trim();
  const normalizedContact = contact.trim();
  if (!normalizedOfficeId) throw new Error("معرّف المكتب غير متاح.");
  if (!normalizedContact) throw new Error("البريد الإلكتروني مطلوب.");
  const { data, error } = await supabase.rpc("create_office_invite", { p_office_id: normalizedOfficeId, p_contact: normalizedContact, p_role: role, p_expires_hours: 168 });
  if (error) throw new Error(error.message || "تعذر إنشاء الدعوة.");
  return data as { id: string; code: string; role: InviteRole; expires_at: string };
}

export async function createRecoveryCodes(officeId: string) {
  const { data, error } = await supabase.rpc("create_owner_recovery_codes", { p_office_id: officeId, p_count: 8 });
  if (error) throw error;
  return data as string[];
}

export async function redeemRecoveryCode(code: string, displayName?: string) {
  const { data, error } = await supabase.rpc("redeem_owner_recovery_code", { p_code: code, p_display_name: displayName || null });
  if (error) throw error;
  return data as { office_id: string; role: "manager" };
}

export async function listOfficeMembers(officeId: string) {
  const { data, error } = await supabase.from("office_members").select("user_id, office_id, role, display_name, created_at").eq("office_id", officeId).order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setMemberRole(officeId: string, userId: string, role: InviteRole | "manager") {
  const { error } = await supabase.rpc("set_office_member_role", { p_office_id: officeId, p_user_id: userId, p_role: role });
  if (error) throw error;
}

export async function revokeMember(officeId: string, userId: string) {
  const { error } = await supabase.rpc("revoke_office_member", { p_office_id: officeId, p_user_id: userId });
  if (error) throw error;
}
