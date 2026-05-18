import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import type { DocHandle } from "@automerge/automerge-repo";
import { withHandle } from "../../core/withHandle";

export type CounterDoc = { count: number };

export const Counter = withHandle<DocHandle<CounterDoc>>(({ element, handle }) => {
  const [count, setCount] = createSignal(handle.doc().count);
  const onChange = () => setCount(handle.doc().count);
  handle.on("change", onChange);

  const dispose = render(
    () => (
      <button
        class="counter"
        onClick={() => handle.change((d) => (d.count += 1))}
      >
        count: {count()}
      </button>
    ),
    element,
  );

  return () => {
    handle.off("change", onChange);
    dispose();
  };
});
