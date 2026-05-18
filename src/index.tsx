import { render } from "solid-js/web";
import { PatchworkView } from "./core/PatchworkView";
import { HelloUser } from "./examples/HelloUser";
import { AccountProvider } from "./examples/AccountProvider";
import "./styles.css";

const App = () => (
  <PatchworkView component={AccountProvider}>
    <PatchworkView component={HelloUser} />
  </PatchworkView>
);

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

render(() => <App />, root);
