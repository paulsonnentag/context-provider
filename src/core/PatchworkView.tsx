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
};

export const PatchworkView: SolidComponent<Props> = (props) => {
  const [ready, setReady] = createSignal(false);
  let container!: HTMLDivElement;

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
