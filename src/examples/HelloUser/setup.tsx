import type { Component as SolidComponent } from "solid-js";
import "../../core/patchwork-view";
import { respond } from "../../core/provider";
import { StateHandle } from "../../core/handles";
import type { Component, RequestEvent } from "../../core/types";
import {
  HelloUser,
  isAccountSelector,
  type AccountState,
} from "./HelloUser";

const AccountProvider: Component = async (element) => {
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
    respond(e, handle);
  };

  element.addEventListener("patchwork:request", onRequest);

  return () => {
    element.removeEventListener("patchwork:request", onRequest);
    clearInterval(interval);
  };
};

export const HelloUserExample: SolidComponent = () => (
  <patchwork-view prop:component={AccountProvider}>
    <patchwork-view prop:component={HelloUser} />
  </patchwork-view>
);
