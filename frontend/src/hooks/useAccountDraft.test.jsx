import React, { act } from "react";
import { createRoot } from "react-dom/client";
import useAccountDraft from "./useAccountDraft";

const normalize = value => ({ title: value?.title || "" });
let root, container, model;
function Fixture({ owner, source }) {
  model = useAccountDraft(owner, source, normalize);
  return <output>{model[0].title}</output>;
}
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
const render = async (owner, source) => act(async () => root.render(<Fixture owner={owner} source={source}/>));

test("a profile arriving after mount fills an untouched form", async () => {
  await render(undefined, undefined); await render("a", { title: "Saved plan" });
  expect(container.textContent).toBe("Saved plan"); expect(model[2].dirty).toBe(false);
});
test("background refresh updates clean forms but preserves unsaved edits", async () => {
  await render("a", { title: "First" }); await render("a", { title: "Updated" });
  expect(container.textContent).toBe("Updated");
  await act(async () => model[1]({ title: "Unsaved" }));
  await render("a", { title: "Another update" });
  expect(container.textContent).toBe("Unsaved"); expect(model[2].dirty).toBe(true);
});
test("committing a successful save makes later refreshes safe", async () => {
  await render("a", { title: "First" });
  await act(async () => model[1]({ title: "Draft" }));
  await act(async () => model[2].commit({ title: "Draft" }));
  await render("a", { title: "Draft" }); await render("a", { title: "New saved version" });
  expect(container.textContent).toBe("New saved version");
});
test("switching accounts never carries the previous account's draft", async () => {
  await render("a", { title: "Private A" }); await act(async () => model[1]({ title: "Unsaved A" }));
  await render("b", { title: "Private B" });
  expect(container.textContent).toBe("Private B"); expect(model[2].dirty).toBe(false);
});

test("a delayed save from the previous account cannot replace the new draft", async () => {
  await render("a", { title: "Private A" });
  const commitPrevious = model[2].commit;
  await render("b", { title: "Private B" });
  await act(async () => expect(commitPrevious({ title: "Saved A" })).toBe(false));
  expect(container.textContent).toBe("Private B");
  expect(model[2].dirty).toBe(false);
  await render("a", { title: "New session A" });
  await act(async () => expect(commitPrevious({ title: "Old session A" })).toBe(false));
  expect(container.textContent).toBe("New session A");
});
