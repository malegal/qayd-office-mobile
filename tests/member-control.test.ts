import { beforeEach, describe, expect, it, vi } from "vitest";

const clearOfflineData = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/offline-store", () => ({ clearOfflineData }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signOut } },
}));

describe("remote member access removal", () => {
  beforeEach(() => {
    clearOfflineData.mockReset();
    signOut.mockReset();
    clearOfflineData.mockResolvedValue(undefined);
    signOut.mockResolvedValue({ error: null });
  });

  it("clears local data before signing out locally", async () => {
    const { revokeLocalAccess } = await import("../lib/access-revocation");
    await revokeLocalAccess();
    expect(clearOfflineData).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(clearOfflineData.mock.invocationCallOrder[0]).toBeLessThan(signOut.mock.invocationCallOrder[0]);
  });
});
