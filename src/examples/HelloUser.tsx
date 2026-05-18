import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { request } from "../core/provider";
import type { Component } from "../core/types";
import { Account, type AccountState } from "./account";

export const HelloUser: Component = async (element) => {
  const handle = await request<AccountState>(element, Account);

  const [name, setName] = createSignal(handle.value.name);
  handle.on("change", () => setName(handle.value.name));

  return render(() => <h1 class="hello">Hello {name()}</h1>, element);
};
