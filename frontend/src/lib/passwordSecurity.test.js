import { PASSWORD_MIN_LENGTH, passwordValidation } from "./passwordSecurity";

describe("passwordValidation", () => {
  test("accepte un mot de passe robuste", () => {
    expect(passwordValidation("PipsEvo2026").valid).toBe(true);
  });

  test.each([
    ["trop court", "Aa1"],
    ["sans majuscule", "pipsevo2026"],
    ["sans chiffre", "PipsEvolution"],
  ])("refuse un mot de passe %s", (_, password) => {
    expect(passwordValidation(password).valid).toBe(false);
  });

  test("expose la longueur minimale", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });
});
