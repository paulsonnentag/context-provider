import { createSignal, For, Show, type JSX } from "solid-js";
import { render } from "solid-js/web";
import type { AutomergeUrl } from "@automerge/automerge-repo";
import type { DocHandle } from "@automerge/automerge-repo";
import { withHandle } from "../../core/withHandle";
import type { Component } from "../../core/types";
import { Counter } from "../../examples/Counter/Counter";

export type CounterShape = {
  type: "counter";
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  url: AutomergeUrl;
};

export type Shape = CounterShape;

export type CanvasDoc = {
  shapes: { [id: string]: Shape };
};

function viewForShape(shape: Shape): Component {
  switch (shape.type) {
    case "counter":
      return Counter;
  }
}

export const SpatialCanvas = withHandle<DocHandle<CanvasDoc>>(({ element, handle }) => {
  const [doc, setDoc] = createSignal(handle.doc());
  const onChange = () => setDoc({ ...handle.doc() });
  handle.on("change", onChange);

  // Key `<For>` on stable string ids so each panel and its embedded
  // <patchwork-view> persist across doc changes (a drag should not tear down
  // and remount other shapes' counters).
  const shapeIds = () => Object.keys(doc().shapes);

  const bringToFront = (id: string) => {
    handle.change((d) => {
      const target = d.shapes[id];
      if (!target) return;
      let max = 0;
      for (const s of Object.values(d.shapes)) {
        if (s.zIndex > max) max = s.zIndex;
      }
      if (target.zIndex === max) return;
      target.zIndex = max + 1;
    });
  };

  const moveShape = (id: string, x: number, y: number) => {
    handle.change((d) => {
      const s = d.shapes[id];
      if (!s) return;
      s.x = x;
      s.y = y;
    });
  };

  const dispose = render(
    () => (
      <div class="spatial-canvas">
        <For each={shapeIds()}>
          {(id) => {
            const shape = () => doc().shapes[id];
            return (
              <Show when={shape()}>
                {(s) => (
                  <Panel
                    x={s().x}
                    y={s().y}
                    width={s().width}
                    height={s().height}
                    zIndex={s().zIndex}
                    title={s().type}
                    onPickUp={() => bringToFront(id)}
                    onMove={(nx, ny) => moveShape(id, nx, ny)}
                  >
                    <patchwork-view
                      prop:component={viewForShape(s())}
                      url={s().url}
                    />
                  </Panel>
                )}
              </Show>
            );
          }}
        </For>
      </div>
    ),
    element,
  );

  return () => {
    handle.off("change", onChange);
    dispose();
  };
});

type PanelProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  title: string;
  onPickUp: () => void;
  onMove: (x: number, y: number) => void;
  children: JSX.Element;
};

const Panel = (props: PanelProps) => {
  // Track in-flight drag offset locally so we don't hit the doc on every move.
  // The final position is committed once on pointerup.
  const [dragOffset, setDragOffset] = createSignal<
    { dx: number; dy: number } | null
  >(null);

  const x = () => props.x + (dragOffset()?.dx ?? 0);
  const y = () => props.y + (dragOffset()?.dy ?? 0);

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    props.onPickUp();

    const startX = e.clientX;
    const startY = e.clientY;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDragOffset({ dx: 0, dy: 0 });

    const onMove = (ev: PointerEvent) => {
      setDragOffset({ dx: ev.clientX - startX, dy: ev.clientY - startY });
    };
    const onUp = (ev: PointerEvent) => {
      const offset = dragOffset();
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      setDragOffset(null);
      if (offset && (offset.dx !== 0 || offset.dy !== 0)) {
        props.onMove(props.x + offset.dx, props.y + offset.dy);
      }
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  };

  return (
    <div
      class="panel"
      style={{
        transform: `translate(${x()}px, ${y()}px)`,
        width: `${props.width}px`,
        height: `${props.height}px`,
        "z-index": props.zIndex,
      }}
    >
      <div class="panel-titlebar" onPointerDown={onPointerDown}>
        {props.title}
      </div>
      <div class="panel-body">{props.children}</div>
    </div>
  );
};
