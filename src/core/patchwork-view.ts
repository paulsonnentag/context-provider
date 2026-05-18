import type { JSX } from "solid-js";
import type { Component } from "./types";

export class PatchworkViewElement extends HTMLElement {
  #component?: Component;
  #unmount?: () => void;
  #controller?: AbortController;

  get component(): Component | undefined {
    return this.#component;
  }

  set component(next: Component | undefined) {
    if (this.#component === next) return;
    this.#component = next;
    if (this.isConnected) void this.#remount();
  }

  // Reflect `url` between property and attribute so JSX bindings like
  // `<patchwork-view url={x}>` work regardless of whether the framework
  // assigns it as a property or as an attribute. Both paths end up at the
  // attribute, which is what consumers like withDocHandle observe.
  get url(): string | null {
    return this.getAttribute("url");
  }

  set url(value: string | null | undefined) {
    if (value == null) this.removeAttribute("url");
    else this.setAttribute("url", String(value));
  }

  connectedCallback() {
    if (this.#component) void this.#mount();
  }

  disconnectedCallback() {
    this.#teardown();
  }

  async #mount() {
    const mount = this.#component;
    if (!mount) return;

    const controller = new AbortController();
    this.#controller = controller;

    const result = await mount(this);
    if (controller.signal.aborted) {
      result();
      return;
    }
    this.#unmount = result;
  }

  #teardown() {
    this.#controller?.abort();
    this.#controller = undefined;
    this.#unmount?.();
    this.#unmount = undefined;
  }

  async #remount() {
    this.#teardown();
    await this.#mount();
  }
}

if (!customElements.get("patchwork-view")) {
  customElements.define("patchwork-view", PatchworkViewElement);
}

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "patchwork-view": JSX.HTMLAttributes<PatchworkViewElement> & {
        "prop:component"?: Component;
        url?: string;
      };
    }
  }
}
