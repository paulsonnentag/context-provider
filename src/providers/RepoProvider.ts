import type { Repo } from "@automerge/automerge-repo";
import { isDocSelector } from "../core/doc";
import { respond } from "../core/provider";
import type { Component, RequestEvent } from "../core/types";

export const RepoProvider =
  (repo: Repo): Component =>
  async (element) => {
    element.style.display = "contents";

    const onRequest = async (event: RequestEvent) => {
      const selector = event.detail.selector;
      if (!isDocSelector(selector)) return;

      event.stopPropagation();

      const handle = await repo.find(selector.url);
      respond(event, handle);
    };

    element.addEventListener("patchwork:request", onRequest);

    return () => {
      element.removeEventListener("patchwork:request", onRequest);
    };
  };
