import { createEffect, onCleanup, type Component } from "solid-js";

type Props = {
  component: (element: HTMLElement) => Promise<() => void> | (() => void);
};

export const PatchworkView: Component<Props> = (props) => {
  let container!: HTMLDivElement;

  createEffect(() => {
    const mount = props.component;

    let unmount: (() => void) | undefined;
    let disposed = false;

    Promise.resolve(mount(container)).then((result) => {
      if (disposed) {
        result();
      } else {
        unmount = result;
      }
    });

    onCleanup(() => {
      disposed = true;
      unmount?.();
    });
  });

  return <div class="patchwork-view" ref={container} />;
};
