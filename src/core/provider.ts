import { isValidAutomergeUrl } from "@automerge/automerge-repo";
import { Handle } from "./handles";
import type {
  RequestEvent,
  RequestEventDetail,
  ResponseEvent,
  ResponseEventDetail,
  Selector,
} from "./types";

let nextId = 0;
const makeId = () => `req-${++nextId}`;

// Resolves with `null` when no provider claims the request — the root
// FallbackProvider always responds with `null` so unhandled requests never
// hang. Callers must handle the null case to model optional dependencies.
export function request<T = unknown>(
  element: HTMLElement,
  selector: Selector,
): Promise<T | null> {
  const id = makeId();

  return new Promise((resolve) => {
    const onResponse = (event: ResponseEvent) => {
      const { detail } = event;
      if (detail.id !== id) return;
      element.removeEventListener("patchwork:response", onResponse);
      resolve(detail.handle as T | null);
    };

    element.addEventListener("patchwork:response", onResponse);

    const rawUrl = element.getAttribute("url");
    const url = rawUrl && isValidAutomergeUrl(rawUrl) ? rawUrl : null;

    element.dispatchEvent(
      new CustomEvent<RequestEventDetail>("patchwork:request", {
        detail: { id, selector, url },
        bubbles: true,
      }),
    );
  });
}

export function respond(
  event: RequestEvent,
  handle: Handle<any> | null,
): void {
  event.stopPropagation();
  const target = event.target as HTMLElement;
  target.dispatchEvent(
    new CustomEvent<ResponseEventDetail>("patchwork:response", {
      detail: { id: event.detail.id, handle },
    }),
  );
}
