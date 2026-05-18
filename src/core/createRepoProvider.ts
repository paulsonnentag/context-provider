import type { Repo } from "@automerge/automerge-repo";
import { respond } from "./provider";
import type { Component, RequestEvent } from "./types";
import { isDocSelector } from "./doc";

export const createRepoProvider =
  (repo: Repo): Component =>
  async (element) => {
    const onRequest = (event: Event) => {
      const e = event as RequestEvent;
      const selector = e.detail.selector;
      if (!isDocSelector(selector)) return;

      // Claim the request synchronously so it can't bubble to an outer
      // provider while we are still awaiting repo.find().
      e.stopPropagation();

      void (async () => {
        const handle = await repo.find(selector.url);
        respond(e, handle);
      })();
    };

    element.addEventListener("patchwork:request", onRequest);

    return () => {
      element.removeEventListener("patchwork:request", onRequest);
    };
  };
