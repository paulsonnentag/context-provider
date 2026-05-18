import type { JSX } from "solid-js";
import type { Component } from "./types";

export type PatchworkLifecycleDetail = { url: string | null };
export type PatchworkLifecycleEvent = CustomEvent<PatchworkLifecycleDetail>;

export class PatchworkViewElement extends HTMLElement {
  #component?: Component;
  #unmount?: () => void;
  #controller?: AbortController;
  #urlObserver?: MutationObserver;
  // Tracks the last url we emitted patchwork:mount for, so url attribute
  // changes can emit a matched unmount/mount pair and disconnection can emit
  // a final unmount even if the attribute was already removed.
  #activeUrl: string | null = null;

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
    // Observe url changes so providers tracking mounted urls can react to
    // the inner component being repointed without us tearing it down.
    this.#urlObserver = new MutationObserver(() => this.#syncLifecycle());
    this.#urlObserver.observe(this, {
      attributes: true,
      attributeFilter: ["url"],
    });

    // Emit patchwork:mount synchronously, BEFORE kicking off the (async)
    // inner mount. This lets the inner component's first request find the
    // provider's url already tracked, since providers register their
    // listeners synchronously inside their own (already-running) mount.
    this.#syncLifecycle();

    if (this.#component) void this.#mount();
  }

  disconnectedCallback() {
    this.#urlObserver?.disconnect();
    this.#urlObserver = undefined;
    this.#emitUnmount();
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

  // Diff the current url attribute against the last one we announced and
  // emit unmount/mount events as needed.
  #syncLifecycle() {
    const next = this.getAttribute("url");
    if (next === this.#activeUrl) return;

    if (this.#activeUrl != null) {
      this.dispatchEvent(
        new CustomEvent<PatchworkLifecycleDetail>("patchwork:unmount", {
          detail: { url: this.#activeUrl },
          bubbles: true,
        }),
      );
    }

    this.#activeUrl = next;

    if (next != null) {
      this.dispatchEvent(
        new CustomEvent<PatchworkLifecycleDetail>("patchwork:mount", {
          detail: { url: next },
          bubbles: true,
        }),
      );
    }
  }

  #emitUnmount() {
    if (this.#activeUrl == null) return;
    this.dispatchEvent(
      new CustomEvent<PatchworkLifecycleDetail>("patchwork:unmount", {
        detail: { url: this.#activeUrl },
        bubbles: true,
      }),
    );
    this.#activeUrl = null;
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
