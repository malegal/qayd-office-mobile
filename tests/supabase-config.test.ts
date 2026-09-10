import { describe, expect, it } from "vitest";

describe("Supabase mobile configuration", () => {
  it("accepts the configured project URL and anon key", async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(anonKey).toMatch(/^(eyJ|sb_publishable_)/);

    const response = await fetch(`${url}/rest/v1/offices?select=office_id&limit=1`, {
      headers: {
        apikey: anonKey!,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    expect(response.ok).toBe(true);
  }, 15000);
});
