import type { Selector } from "../core/types";

export type AccountState = {
  name: string;
};

export const Account = { type: "account" } as const satisfies Selector;

export const isAccountSelector = (s: Selector): s is typeof Account =>
  s.type === Account.type;
