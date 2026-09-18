import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import { supabase } from "@/lib/supabase";
export { revokeLocalAccess } from "@/lib/access-revocation";

export type MemberDevice = {
  device_id: string;
  device_name: string | null;
  platform: string;
  app_version: string | null;
  last_seen_at: string;
};

export async function getDeviceInfo() {
  const iosId = Platform.OS === "ios" ? await Application.getIosIdForVendorAsync() : null;
  const androidId = Platform.OS === "android" ? Application.getAndroidId() : null;
  return {
    deviceId: androidId || iosId || `${Platform.OS}:${Constants.deviceName || "unknown"}`,
    deviceName: Constants.deviceName || null,
    platform: Platform.OS,
    appVersion: Application.nativeApplicationVersion || Constants.expoConfig?.version || null,
  };
}

export async function registerCurrentDevice(officeId: string) {
  const info = await getDeviceInfo();
  const { error } = await supabase.rpc("register_office_member_device", {
    p_office_id: officeId,
    p_device_id: info.deviceId,
    p_device_name: info.deviceName,
    p_platform: info.platform,
    p_app_version: info.appVersion,
  });
  if (error) throw error;
}

export async function verifyCurrentMembership(officeId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const { data, error } = await supabase
    .from("office_members")
    .select("user_id")
    .eq("office_id", officeId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function listMemberDevices(officeId: string, userId: string) {
  const { data, error } = await supabase
    .from("office_member_devices")
    .select("device_id, device_name, platform, app_version, last_seen_at")
    .eq("office_id", officeId)
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MemberDevice[];
}

export async function renameMember(officeId: string, userId: string, displayName: string) {
  const { error } = await supabase.rpc("rename_office_member", {
    p_office_id: officeId,
    p_user_id: userId,
    p_display_name: displayName.trim() || null,
  });
  if (error) throw error;
}
