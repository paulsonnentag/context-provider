import { respond } from "../core/provider";
import { StateHandle } from "../core/state-handle";
import type { Component, RequestEvent } from "../core/types";
import { isAccountSelector, type AccountState } from "./account";

export const AccountProvider: Component = async (element) => {
  const handle = new StateHandle<AccountState>({ name: "Alice" });

  const names = ["Alice", "Bob"];
  let idx = 0;

  const interval = setInterval(() => {
    idx = 1 - idx;
    handle.change((account) => (account.name = names[idx]));
  }, 1000);

  const onRequest = (event: Event) => {
    const e = event as RequestEvent;
    if (!isAccountSelector(e.detail.selector)) return;
    respond(e, handle as StateHandle<unknown>);
  };

  element.addEventListener("patchwork:request", onRequest);

  return () => {
    element.removeEventListener("patchwork:request", onRequest);
    clearInterval(interval);
  };
};
