import { respond } from "@/core/provider";
import type { Component, RequestEvent } from "@/core/types";

// Mount at the root of a demo to catch any `patchwork:request` that no inner
// provider claimed (via stopPropagation) and respond with `null`. This turns
// "missing provider" from a silent hang into an explicit null result that
// callers can branch on to model optional dependencies.
export const FallbackProvider: Component = async (element) => {
  element.style.display = "contents";

  const onRequest = (event: RequestEvent) => {
    respond(event, null);
  };

  element.addEventListener("patchwork:request", onRequest);

  return () => {
    element.removeEventListener("patchwork:request", onRequest);
  };
};
