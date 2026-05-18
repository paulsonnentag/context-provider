import type { DocHandle } from "@automerge/automerge-repo";
import { isValidAutomergeUrl } from "@automerge/automerge-repo";
import { request } from "./provider";
import type { Component } from "./types";
import { Doc } from "./doc";

export type DocMountArgs<T> = {
  element: HTMLElement;
  handle: DocHandle<T>;
};

export type DocMount<T> = (
  args: DocMountArgs<T>,
) => Promise<() => void> | (() => void);

export const withDocHandle =
  <T,>(mount: DocMount<T>): Component =>
  async (element) => {
    let unmountInner: (() => void) | undefined;
    let currentUrl: string | null = null;
    let generation = 0;

    const bind = async () => {
      const url = element.getAttribute("url");
      if (url === currentUrl) return;
      currentUrl = url;

      // Each bind() run gets a generation tag so any in-flight work from a
      // previous url can be discarded if the attribute changes again before
      // it resolves.
      const myGen = ++generation;
      unmountInner?.();
      unmountInner = undefined;

      if (!url || !isValidAutomergeUrl(url)) return;

      const handle = await request<DocHandle<T>>(element, Doc(url));
      if (myGen !== generation) return;

      const result = await mount({ element, handle });
      if (myGen !== generation) {
        result();
        return;
      }
      unmountInner = result;
    };

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.attributeName === "url")) void bind();
    });
    observer.observe(element, { attributes: true, attributeFilter: ["url"] });

    await bind();

    return () => {
      observer.disconnect();
      generation++;
      unmountInner?.();
    };
  };
