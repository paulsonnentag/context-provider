import type { StateHandle } from "./state-handle";

export type Selector = {
  type: string;
};

export type MountableComponent = (element: HTMLElement) => Promise<() => void>;

export type RequestEventDetail = {
  id: string;
  selector: Selector;
};

export type ResponseEventDetail = {
  id: string;
  handle: StateHandle<unknown>;
};

export type RequestEvent = CustomEvent<RequestEventDetail>;
export type ResponseEvent = CustomEvent<ResponseEventDetail>;
