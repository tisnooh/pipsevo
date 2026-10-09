import React, { act } from "react";
import { createRoot } from "react-dom/client";
import IntegrationConnections from "./IntegrationConnections";
import { integrationConnections } from "../lib/api";
import { toast } from "sonner";

jest.mock("./ui/dialog", () => ({
  Dialog: ({ children }) => children,
  DialogContent: ({ children }) => children,
  DialogDescription: ({ children }) => children,
  DialogFooter: ({ children }) => children,
  DialogHeader: ({ children }) => children,
  DialogTitle: ({ children }) => children,
}));

jest.mock("../lib/api", () => ({
  integrationConnections: {
    capabilities: jest.fn(),
    list: jest.fn(),
    syncAccount: jest.fn(),
  },
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

describe("IntegrationConnections", () => {
  let container;
  let root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    jest.clearAllMocks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("conserve la disponibilité des plateformes si la liste des connexions échoue", async () => {
    integrationConnections.capabilities.mockResolvedValue({
      data: { providers: [{ provider: "ctrader", available: true }] },
    });
    integrationConnections.list.mockRejectedValue(new Error("connections unavailable"));

    await act(async () => {
      root.render(<IntegrationConnections compact />);
    });

    const cTraderCard = Array.from(container.querySelectorAll("article"))
      .find(card => card.textContent.includes("cTrader"));

    expect(cTraderCard).not.toBeUndefined();
    expect(cTraderCard.textContent).toContain("Disponible");
    expect(cTraderCard.querySelector("button").disabled).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Impossible de charger les connexions existantes");
  });

  test("avertit aussi les futurs utilisateurs quand les frais et résultats manquent", async () => {
    integrationConnections.capabilities.mockResolvedValue({ data: { providers: [] } });
    integrationConnections.list.mockResolvedValue({ data: [{ id: "c1", provider: "tradelocker", connection_status: "connected", integration_accounts: [{ id: "a1", external_account_id: "123", status: "connected" }] }] });
    integrationConnections.syncAccount.mockResolvedValue({ data: { trades_without_net_pnl: 2 } });
    await act(async () => root.render(<IntegrationConnections />));
    const button = [...container.querySelectorAll("button")].find(item => item.textContent === "Synchroniser");
    await act(async () => button.click());
    expect(integrationConnections.syncAccount).toHaveBeenCalledWith("a1");
    expect(toast.warning).toHaveBeenCalledWith("Trades synchronisés, mais les résultats nets ou frais ne sont pas fournis par la plateforme.");
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("conserve l'avertissement après un rechargement des connexions", async () => {
    integrationConnections.capabilities.mockResolvedValue({ data: { providers: [] } });
    integrationConnections.list.mockResolvedValue({ data: [{ id: "c1", provider: "tradelocker", connection_status: "connected", integration_accounts: [{ id: "a1", external_account_id: "123", status: "connected", provider_metadata: { synchronization: { trades_without_net_pnl: 8 } } }] }] });
    await act(async () => root.render(<IntegrationConnections />));
    expect(container.querySelector('[role="status"]').textContent).toContain("résultats nets ou de frais complets");
    expect(container.textContent).toContain("Contacte ton broker ou ta prop firm");
  });
});
