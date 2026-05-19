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
  const names = ["grjte", "chee", "Mimi", "Alex", "pvh", "Orion", "Paul"];

  const handle = new StateHandle<AccountState>({ name: names[0] });

  let idx = 0;
  const interval = setInterval(() => {
    idx = (idx + 1) % names.length;
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
