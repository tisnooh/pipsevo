import React, { act } from "react";
import { createRoot } from "react-dom/client";
import GoogleSignInButton from "./GoogleSignInButton";
import { signInWithGoogle } from "../../lib/googleAuth";
jest.mock("../../lib/googleAuth", () => ({ signInWithGoogle: jest.fn() }));
jest.mock("../../context/I18nContext", () => ({ useI18n: () => ({ t: text => text }) }));
let root;
let container;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  signInWithGoogle.mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
const click = async () => act(async () => { container.querySelector("button").click(); });

test("registration cannot start Google before accepting terms", async () => {
  const beforeSignIn = jest.fn(() => false);
  act(() => root.render(<GoogleSignInButton beforeSignIn={beforeSignIn} />));
  await click();
  expect(beforeSignIn).toHaveBeenCalled();
  expect(signInWithGoogle).not.toHaveBeenCalled();
});
test("disables duplicate submissions while Google starts", async () => {
  let finish;
  signInWithGoogle.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const onBusyChange = jest.fn();
  act(() => root.render(<GoogleSignInButton onBusyChange={onBusyChange} />));
  await click();
  expect(container.querySelector("button").disabled).toBe(true);
  await click();
  expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(onBusyChange.mock.calls).toEqual([[true], [false]]);
});
test("a provider failure offers email sign-in and makes retry possible", async () => {
  signInWithGoogle.mockRejectedValue(new Error("private-provider-detail"));
  act(() => root.render(<GoogleSignInButton />));
  await click();
  expect(container.querySelector('[role="alert"]').textContent).toContain("adresse e-mail");
  expect(container.textContent).not.toContain("private-provider-detail");
  expect(container.querySelector("button").disabled).toBe(false);
});
