export type Selector = {
  type: string;
};

export type Component = (element: HTMLElement) => Promise<() => void>;

export type RequestEventDetail = {
  id: string;
  selector: Selector;
};

export type ResponseEventDetail = {
  id: string;
  handle: unknown;
};

export type RequestEvent = CustomEvent<RequestEventDetail>;
export type ResponseEvent = CustomEvent<ResponseEventDetail>;

declare global {
  interface HTMLElementEventMap {
    "patchwork:request": RequestEvent;
    "patchwork:response": ResponseEvent;
  }
}
