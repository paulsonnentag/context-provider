import { render } from "solid-js/web";
import { PatchworkView } from "./PatchworkView";
import { HelloWorld } from "./HelloWorld";
import "./styles.css";

const App = () => <PatchworkView component={HelloWorld} />;

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

render(() => <App />, root);
