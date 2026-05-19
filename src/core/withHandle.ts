import { isValidAutomergeUrl } from "@automerge/automerge-repo";
import { Doc } from "./doc";
import type { Handle } from "./handles";
import { request } from "./provider";
import type { Component } from "./types";

type MountArgs<H> = {
  element: HTMLElement;
  handle: H;
};

type Mount<H> = (args: MountArgs<H>) => Promise<() => void> | (() => void);

// Resolve a handle for the element from one of two sources:
//   1. `element.handle` set by a parent via `prop:handle`
//   2. `Doc(url)` via the provider chain when a `url` attribute is set
//
// (1) takes precedence; if both are present, (1) wins and we warn.
// Re-binds on either source changing (handle swap or url attribute change).
export const withHandle =
  <H extends Handle<any>>(mount: Mount<H>): Component =>
  async (element) => {
    let unmountInner: (() => void) | undefined;
    let currentKey: unknown = Symbol("initial");
    let generation = 0;

    const bind = async () => {
      const injected = (element as { handle?: H }).handle;
      const url = element.getAttribute("url");
      const hasUrl = url != null && isValidAutomergeUrl(url);

      if (injected && hasUrl) {
        console.warn(
          "withHandle: both `prop:handle` and `url` are set; using `prop:handle`.",
        );
      }

      // Identity-key the resolved source so we can short-circuit when neither
      // changed (e.g. a MutationObserver fires for an unrelated attribute).
      const key = injected ?? (hasUrl ? url : null);
      if (key === currentKey) return;
      currentKey = key;

      const myGen = ++generation;
      unmountInner?.();
      unmountInner = undefined;

      let handle: H | undefined;
      if (injected) {
        handle = injected;
      } else if (hasUrl) {
        const resolved = (await request(element, Doc(url))) as H | null;
        if (myGen !== generation) return;
        if (!resolved) {
          console.warn(
            `withHandle: no provider responded for Doc(${url}). ` +
              "Make sure a RepoProvider is mounted above this view.",
          );
          return;
        }
        handle = resolved;
      }

      if (!handle) return;

      const result = await mount({ element, handle });
      if (myGen !== generation) {
        result();
        return;
      }
      unmountInner = result;
    };

    const urlObserver = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === "url")) void bind();
    });
    urlObserver.observe(element, {
      attributes: true,
      attributeFilter: ["url"],
    });

    const onHandleChange = () => void bind();
    element.addEventListener("patchwork:handle-change", onHandleChange);

    await bind();

    return () => {
      urlObserver.disconnect();
      element.removeEventListener("patchwork:handle-change", onHandleChange);
      generation++;
      unmountInner?.();
    };
  };
