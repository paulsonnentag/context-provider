import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  type Component as SolidComponent,
  type JSX,
} from "solid-js";
import type { Component } from "./types";

type Props = {
  component: Component;
  children?: JSX.Element;
  attrs?: Record<string, string>;
};

export const PatchworkView: SolidComponent<Props> = (props) => {
  const [ready, setReady] = createSignal(false);
  let container!: HTMLDivElement;

  createEffect(() => {
    const attrs = props.attrs ?? {};
    for (const [key, value] of Object.entries(attrs)) {
      container.setAttribute(key, value);
    }

    const known = new Set(Object.keys(attrs));
    onCleanup(() => {
      for (const key of known) {
        // Only remove if it still matches what we set; consumer code may have
        // taken over the attribute in the meantime.
        if (container.getAttribute(key) === attrs[key]) {
          container.removeAttribute(key);
        }
      }
    });
  });

  createEffect(() => {
    const mount = props.component;
    setReady(false);

    let unmount: (() => void) | undefined;
    let disposed = false;

    mount(container).then((result) => {
      if (disposed) {
        result();
        return;
      }
      unmount = result;
      setReady(true);
    });

    onCleanup(() => {
      disposed = true;
      unmount?.();
    });
  });

  return (
    <div class="patchwork-view" ref={container}>
      <Show when={ready()}>{props.children}</Show>
    </div>
  );
};
