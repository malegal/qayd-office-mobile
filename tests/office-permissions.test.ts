import { describe, expect, it } from "vitest";
import { can, canAddPayment, canViewFinance } from "../lib/office-permissions";

describe("office role permissions", () => {
  it("gives the owner full control", () => {
    expect(can("manager", "view_all")).toBe(true);
    expect(can("manager", "edit")).toBe(true);
    expect(can("manager", "delete")).toBe(true);
    expect(can("manager", "manage_team")).toBe(true);
  });

  it("keeps finance visibility and payments accounting-only", () => {
    expect(canViewFinance("manager")).toBe(true);
    expect(canViewFinance("accountant")).toBe(true);
    expect(canViewFinance("lawyer")).toBe(false);
    expect(canAddPayment("accountant")).toBe(true);
    expect(canAddPayment("lawyer")).toBe(false);
    expect(canAddPayment("staff")).toBe(false);
  });

  it("allows lawyers and secretaries to add operational records but never edit or delete", () => {
    for (const role of ["lawyer", "staff"] as const) {
      expect(can(role, "add_case")).toBe(true);
      expect(can(role, "add_session")).toBe(true);
      expect(can(role, "add_expense")).toBe(true);
      expect(can(role, "edit")).toBe(false);
      expect(can(role, "delete")).toBe(false);
    }
  });

  it("allows every office team role to add fees, expenses, sessions, and tasks", () => {
    for (const role of ["manager", "lawyer", "staff", "accountant"] as const) {
      expect(can(role, "add_fee")).toBe(true);
      expect(can(role, "add_expense")).toBe(true);
      expect(can(role, "add_session")).toBe(true);
      expect(can(role, "add_task")).toBe(true);
    }
  });

  it("keeps collected fee payments owner/accountant-only", () => {
    expect(can("manager", "add_payment")).toBe(true);
    expect(can("accountant", "add_payment")).toBe(true);
    expect(can("lawyer", "add_payment")).toBe(false);
    expect(can("staff", "add_payment")).toBe(false);
  });
});
