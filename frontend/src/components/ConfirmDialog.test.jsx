import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { useConfirmDialog } from "./ConfirmDialog";

function Harness({ onResult }) {
  const { confirm, confirmationDialog } = useConfirmDialog();
  return <><button onClick={async () => onResult(await confirm({ title: "Supprimer le compte", description: "Action définitive", confirmLabel: "Supprimer", destructive: true }))}>Ouvrir</button>{confirmationDialog}</>;
}

describe("ConfirmDialog", () => {
  let container;
  let root;
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("resolves an explicit destructive confirmation", async () => {
    const onResult = jest.fn();
    act(() => root.render(<Harness onResult={onResult} />));
    await act(async () => container.querySelector("button").click());
    expect(document.body.textContent).toContain("Action définitive");
    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent === "Supprimer");
    await act(async () => confirmButton.click());
    expect(onResult).toHaveBeenCalledWith(true);
  });

  test("cancels without accepting and fits a narrow viewport", async () => {
    const onResult = jest.fn();
    act(() => root.render(<Harness onResult={onResult} />));
    await act(async () => container.querySelector("button").click());
    expect(document.querySelector('[role="alertdialog"]').className).toContain("w-[calc(100%-2rem)]");
    const cancel = Array.from(document.body.querySelectorAll("button")).find(button => button.textContent === "Annuler");
    await act(async () => cancel.click());
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
