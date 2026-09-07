jest.mock("@/lib/api", () => ({ api: {} }), { virtual: true });

import { canAdmin, isSuperAdmin, staffRoles } from "./api";

describe("admin role helpers", () => {
  test.each(["support", "admin", "super_admin"])("%s can access the admin guard", (role) => {
    expect(canAdmin({ role })).toBe(true);
    expect(staffRoles.has(role)).toBe(true);
  });

  test("a normal or missing user cannot access the admin guard", () => {
    expect(canAdmin({ role: "user" })).toBe(false);
    expect(canAdmin(null)).toBe(false);
  });

  test("only a super administrator passes the destructive-role helper", () => {
    expect(isSuperAdmin({ role: "super_admin" })).toBe(true);
    expect(isSuperAdmin({ role: "admin" })).toBe(false);
  });
});
