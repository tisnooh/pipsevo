import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AdminUserDetail } from "./AdminUsers";
import { adminApi } from "./api";
import { useAdminSession } from "./AdminAccess";
import { useAdminData } from "./ui";
import { toast } from "sonner";

jest.mock("react-router-dom", () => ({
  Link: ({ children }) => <span>{children}</span>,
  useNavigate: () => jest.fn(), useParams: () => ({ userId: "owner-id" }),
}));
jest.mock("./api", () => ({
  adminApi: { retryUserSync: jest.fn(), user: jest.fn() },
  isSuperAdmin: (user) => user?.role === "super_admin",
}));
jest.mock("./AdminAccess", () => ({ useAdminSession: jest.fn() }));
jest.mock("./ui", () => ({
  ...jest.requireActual("./ui"), useAdminData: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }));

describe("TradeLocker administrator retry", () => {
  let root;
  let container;
  let reload;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    reload = jest.fn().mockResolvedValue(undefined);
    adminApi.retryUserSync.mockClear().mockResolvedValue({ data: { partial_error: false } });
    useAdminSession.mockReturnValue({ id: "staff-id", role: "super_admin" });
    useAdminData.mockReturnValue({ reload, data: {
      identity: { id: "owner-id", name: "Test", role: "user", status: "active" },
      subscription: {}, trading_data: {}, journal: { recent: [] },
      trading: { accounts: [], connections: [{ id: "connection-id", provider: "tradelocker", connection_status: "connected" }] },
    } });
  });

  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const click = async (label) => {
    const button = [...document.querySelectorAll("button")].find((item) => item.textContent.trim() === label);
    expect(button).toBeDefined();
    await act(async () => button.click());
  };

  it("does not synchronize before the in-page confirmation", async () => {
    await act(async () => root.render(<AdminUserDetail />));
    await click("Synchroniser TradeLocker");
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Aucun ordre ne sera passé");
    expect(adminApi.retryUserSync).not.toHaveBeenCalled();
    await click("Confirmer la synchronisation");
    expect(adminApi.retryUserSync).toHaveBeenCalledWith("owner-id", "connection-id");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("cancels without calling the provider", async () => {
    await act(async () => root.render(<AdminUserDetail />));
    await click("Synchroniser TradeLocker");
    await click("Annuler");
    expect(adminApi.retryUserSync).not.toHaveBeenCalled();
  });

  it("does not expose retry to a regular administrator", async () => {
    useAdminSession.mockReturnValue({ role: "admin" });
    await act(async () => root.render(<AdminUserDetail />));
    expect(container.textContent).not.toContain("Synchroniser TradeLocker");
  });

  it("explains missing financial data instead of claiming a complete result", async () => {
    const state = useAdminData();
    state.data.trading_data.data_quality = { total_trades: 8, trades_with_pnl: 0 };
    adminApi.retryUserSync.mockResolvedValue({ data: { trades_without_net_pnl: 8 } });
    await act(async () => root.render(<AdminUserDetail />));
    expect(container.textContent).toContain("0 / 8 trades ont un P&L net vérifiable");
    await click("Synchroniser TradeLocker");
    await click("Confirmer la synchronisation");
    expect(toast.warning).toHaveBeenCalledWith("Trades synchronisés, mais les résultats nets ou frais ne sont pas fournis par la plateforme.");
  });
});
