import type {
  RequestEvent,
  RequestEventDetail,
  ResponseEventDetail,
  Selector,
} from "./types";
import type { StateHandle } from "./state-handle";

export const REQUEST_EVENT = "patchwork:request";
export const RESPONSE_EVENT = "patchwork:response";

let nextId = 0;
const makeId = () => `req-${++nextId}`;

export function request<T = unknown>(
  element: HTMLElement,
  selector: Selector,
): Promise<StateHandle<T>> {
  const id = makeId();

  return new Promise((resolve) => {
    const onResponse = (event: Event) => {
      const { detail } = event as CustomEvent<ResponseEventDetail>;
      if (detail.id !== id) return;
      element.removeEventListener(RESPONSE_EVENT, onResponse);
      resolve(detail.handle as StateHandle<T>);
    };

    element.addEventListener(RESPONSE_EVENT, onResponse);

    element.dispatchEvent(
      new CustomEvent<RequestEventDetail>(REQUEST_EVENT, {
        detail: { id, selector },
        bubbles: true,
      }),
    );
  });
}

export function respond(
  event: RequestEvent,
  handle: StateHandle<unknown>,
): void {
  event.stopPropagation();
  const target = event.target as HTMLElement;
  target.dispatchEvent(
    new CustomEvent<ResponseEventDetail>(RESPONSE_EVENT, {
      detail: { id: event.detail.id, handle },
    }),
  );
}
