import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { request } from "../../core/provider";
import type { StateHandle } from "../../core/handles";
import type { Component } from "../../core/types";
import { Account, type AccountState } from "../../providers/AccountProvider";

export const HelloUser: Component = async (element) => {
  const handle = await request<StateHandle<AccountState>>(element, Account);
  if (!handle) {
    console.warn("HelloUser: no AccountProvider responded.");
    return render(() => <h1 class="hello">Hello?</h1>, element);
  }

  const [name, setName] = createSignal(handle.value.name);
  handle.on("change", () => setName(handle.value.name));

  return render(() => <h1 class="hello">Hello {name()}</h1>, element);
};
