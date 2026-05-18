import { createSignal, For } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import HelloUser from "./examples/HelloUser";
import Counter from "./examples/Counter";
import TextEditor from "./examples/TextEditor";
import SpatialCanvas from "./examples/SpatialCanvas";
import type { Example } from "./examples/types";
import "./styles.css";

const examples: Example[] = [HelloUser, Counter, TextEditor, SpatialCanvas];

const App = () => {
  const [activeIdx, setActiveIdx] = createSignal(0);
  const active = () => examples[activeIdx()];

  return (
    <div class="app">
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <For each={examples}>
            {(example, i) => (
              <button
                type="button"
                class="sidebar-item"
                classList={{ active: i() === activeIdx() }}
                onClick={() => setActiveIdx(i())}
              >
                <span class="sidebar-item-name">{example.name}</span>
                <span class="sidebar-item-desc">{example.description}</span>
              </button>
            )}
          </For>
        </nav>
      </aside>
      <main class="content">
        <header class="content-header">
          <h1>{active().name}</h1>
          <p>{active().description}</p>
        </header>
        <section class="content-stage">
          <Dynamic component={active().component} />
        </section>
      </main>
    </div>
  );
};

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

render(() => <App />, root);
