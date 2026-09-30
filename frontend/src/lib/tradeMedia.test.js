import { validateTradeScreenshots } from "./tradeMedia";

const file = (type = "image/png", size = 100) => ({ name: "chart.png", type, size });

test("accepts supported trade screenshots", () => {
  expect(validateTradeScreenshots([file()], 1)).toEqual({ files: [file()], error: "" });
});

test("rejects unsupported, oversized or excessive screenshots", () => {
  expect(validateTradeScreenshots([file("image/gif")]).error).toMatch(/JPEG/);
  expect(validateTradeScreenshots([file("image/png", 11 * 1024 * 1024)]).error).toMatch(/10 Mo/);
  expect(validateTradeScreenshots([file()], 6).error).toMatch(/Maximum 6/);
});
