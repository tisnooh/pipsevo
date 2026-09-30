import React, { act } from "react";
import { createRoot } from "react-dom/client";
import PrivateTradeImage from "./PrivateTradeImage";

const mockSignedUrl = jest.fn();

jest.mock("@/lib/api", () => ({
  tradeScreenshots: { signedUrl: (...args) => mockSignedUrl(...args) },
}), { virtual: true });
jest.mock("@/lib/tradeMedia", () => ({
  isRemoteImageUrl: (value) => /^https?:\/\//i.test(String(value || "")),
}), { virtual: true });

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  mockSignedUrl.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test("resolves a private storage path before rendering the image", async () => {
  mockSignedUrl.mockResolvedValue("https://signed.example/chart.png");
  await act(async () => root.render(<PrivateTradeImage path="user/trade/chart.png" alt="Graphique du trade" className="preview"/>));

  expect(mockSignedUrl).toHaveBeenCalledWith("user/trade/chart.png");
  expect(container.querySelector('img[alt="Graphique du trade"]')?.getAttribute("src")).toBe("https://signed.example/chart.png");
});

test("keeps legacy remote images compatible without requesting a signed URL", () => {
  act(() => root.render(<PrivateTradeImage path="https://cdn.example/chart.png" alt="Ancienne capture"/>));

  expect(container.querySelector('img[alt="Ancienne capture"]')?.getAttribute("src")).toBe("https://cdn.example/chart.png");
  expect(mockSignedUrl).not.toHaveBeenCalled();
});

test("shows a stable fallback when the private URL cannot be created", async () => {
  mockSignedUrl.mockRejectedValue(new Error("expired"));
  await act(async () => root.render(<PrivateTradeImage path="user/trade/missing.png" alt="Capture manquante"/>));

  expect(container.textContent).toContain("Image indisponible");
});
