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
  },
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
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
});
