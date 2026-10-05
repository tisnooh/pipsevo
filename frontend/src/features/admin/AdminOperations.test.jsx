import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AdminEmails } from "./AdminOperations";
import { adminApi } from "./api";

jest.mock("./api", () => ({ adminApi: { emails: jest.fn() } }));
jest.mock("./AdminPropFirmsPage", () => () => null);

describe("AdminEmails delivery monitoring", () => {
  let root;
  let container;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => act(() => root.unmount()));

  it("distinguishes configuration presence, interrupted sends and delivery failures", async () => {
    adminApi.emails.mockResolvedValue({ data: {
      total: 1, failed: 0, stalled_in_page: 1, provider_configured: true,
      items: [{ event: "account-welcome", type: "account-welcome", status: "stalled", provider: "smtp", last_error: "provider_delivery_failed", created_at: "2026-09-30T07:36:00Z" }],
    } });
    await act(async () => { root.render(<AdminEmails />); });
    expect(container.textContent).toContain("Présente");
    expect(container.textContent).toContain("Interrompu");
    expect(container.textContent).toContain("provider_delivery_failed");
    expect(container.textContent).toContain("ne prouve pas que le fournisseur est joignable");
    expect(container.textContent).not.toContain("Configuré");
  });

  it("does not invent a blocked-send count with an older API response", async () => {
    adminApi.emails.mockResolvedValue({ data: { total: 0, failed: 0, provider_configured: false, items: [] } });
    await act(async () => { root.render(<AdminEmails />); });
    const metrics = container.querySelectorAll(".admin-metric");
    expect(metrics[2].textContent).toContain("—");
    expect(metrics[3].textContent).toContain("À compléter");
  });
});
