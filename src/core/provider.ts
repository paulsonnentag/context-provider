import type {
  RequestEvent,
  RequestEventDetail,
  ResponseEventDetail,
  Selector,
} from "./types";

let nextId = 0;
const makeId = () => `req-${++nextId}`;

export function request<T = unknown>(
  element: HTMLElement,
  selector: Selector,
): Promise<T> {
  const id = makeId();

  return new Promise((resolve) => {
    const onResponse = (event: Event) => {
      const { detail } = event as CustomEvent<ResponseEventDetail>;
      if (detail.id !== id) return;
      element.removeEventListener("patchwork:response", onResponse);
      resolve(detail.handle as T);
    };

    element.addEventListener("patchwork:response", onResponse);

    element.dispatchEvent(
      new CustomEvent<RequestEventDetail>("patchwork:request", {
        detail: { id, selector },
        bubbles: true,
      }),
    );
  });
}

export function respond(event: RequestEvent, handle: unknown): void {
  event.stopPropagation();
  const target = event.target as HTMLElement;
  target.dispatchEvent(
    new CustomEvent<ResponseEventDetail>("patchwork:response", {
      detail: { id: event.detail.id, handle },
    }),
  );
}
