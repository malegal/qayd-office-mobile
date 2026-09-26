import { describe, expect, it } from "vitest";
import { can, canAddPayment, canEdit, canViewCaseCount, canViewFinance } from "../lib/office-permissions";

describe("office role permissions", () => {
  it("gives the owner full control", () => {
    expect(can("manager", "view_all")).toBe(true);
    expect(can("manager", "edit")).toBe(true);
    expect(can("manager", "delete")).toBe(true);
    expect(can("manager", "manage_team")).toBe(true);
  });

  it("keeps finance visibility and payments accounting-only", () => {
    expect(canViewFinance("manager")).toBe(true);
    expect(canViewFinance("accountant")).toBe(false);
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

  it("hides sensitive totals and existing-record edits from the team", () => {
    for (const role of ["lawyer", "staff", "accountant", "member"] as const) {
      expect(canViewCaseCount(role)).toBe(false);
      expect(canViewFinance(role)).toBe(false);
      expect(canEdit(role)).toBe(false);
    }
    expect(canViewCaseCount("manager")).toBe(true);
    expect(canEdit("manager")).toBe(true);
  });
});
