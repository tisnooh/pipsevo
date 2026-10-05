import { apiErrorMessage } from "./apiError";

test("renders string and structured API errors without exposing objects", () => {
  expect(apiErrorMessage({ response: { data: { detail: { message: "Expired" } } } })).toBe("Expired");
  expect(apiErrorMessage({ response: { data: { detail: [{ msg: "Invalid amount" }] } } })).toBe("Invalid amount");
  expect(apiErrorMessage({ response: { data: { detail: { code: "unknown" } } } }, "Retry")).toBe("Retry");
});
