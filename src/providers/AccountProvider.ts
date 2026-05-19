import type { Handle } from "../core/handles";
import { respond } from "../core/provider";
import type { RequestEvent, Selector } from "../core/types";
import { withHandle } from "../core/withHandle";

export type AccountState = {
  name: string;
};

export const Account = { type: "account" };
export type AccountSelector = typeof Account;

export const isAccountSelector = (s: Selector): s is AccountSelector =>
  s.type === Account.type;

export const AccountProvider = withHandle<Handle<AccountState>>(
  async ({ element, handle }) => {
    element.style.display = "contents";

    const onRequest = (event: RequestEvent) => {
      if (!isAccountSelector(event.detail.selector)) return;
      respond(event, handle);
    };

    element.addEventListener("patchwork:request", onRequest);

    return () => {
      element.removeEventListener("patchwork:request", onRequest);
    };
  },
);
