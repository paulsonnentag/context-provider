import { REQUEST_EVENT, respond } from "../core/provider";
import { StateHandle } from "../core/state-handle";
import type { MountableComponent, RequestEvent } from "../core/types";
import { isAccountSelector, type AccountState } from "./account";

export const AccountProvider: MountableComponent = async (element) => {
  const handle = new StateHandle<AccountState>({ name: "Alice" });

  const onRequest = (event: Event) => {
    const e = event as RequestEvent;
    if (!isAccountSelector(e.detail.selector)) return;
    respond(e, handle as StateHandle<unknown>);
  };

  element.addEventListener(REQUEST_EVENT, onRequest);

  return () => {
    element.removeEventListener(REQUEST_EVENT, onRequest);
  };
};
