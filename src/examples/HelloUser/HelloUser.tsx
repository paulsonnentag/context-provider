import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { request } from "../../core/provider";
import type { StateHandle } from "../../core/state-handle";
import type { Component, Selector } from "../../core/types";

export type AccountState = {
  name: string;
};

export const Account = { type: "account" } as const satisfies Selector;

export const isAccountSelector = (s: Selector): s is typeof Account =>
  s.type === Account.type;

export const HelloUser: Component = async (element) => {
  const handle = await request<StateHandle<AccountState>>(element, Account);

  const [name, setName] = createSignal(handle.value.name);
  handle.on("change", () => setName(handle.value.name));

  return render(() => <h1 class="hello">Hello {name()}</h1>, element);
};
