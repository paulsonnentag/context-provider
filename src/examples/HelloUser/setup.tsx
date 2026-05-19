import { onCleanup, type Component as SolidComponent } from "solid-js";
import "../../core/patchwork-view";
import { StateHandle } from "../../core/handles";
import { FallbackProvider } from "../../providers/FallbackProvider";
import {
  AccountProvider,
  type AccountState,
} from "../../providers/AccountProvider";
import { HelloUser } from "./HelloUser";

export const HelloUserExample: SolidComponent = () => {
  const handle = new StateHandle<AccountState>({ name: "Alice" });

  const names = ["Alice", "Bob"];
  let idx = 0;
  const interval = setInterval(() => {
    idx = 1 - idx;
    handle.change((account) => (account.name = names[idx]));
  }, 1000);
  onCleanup(() => clearInterval(interval));

  return (
    <patchwork-view prop:component={FallbackProvider}>
      <patchwork-view prop:component={AccountProvider} prop:handle={handle}>
        <patchwork-view prop:component={HelloUser} />
      </patchwork-view>
    </patchwork-view>
  );
};
