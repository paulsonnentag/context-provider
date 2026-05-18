import EventEmitter from "eventemitter3";

export type StateHandleEvents = {
  change: () => void;
};

export class StateHandle<T> extends EventEmitter<StateHandleEvents> {
  #value: T;

  constructor(initial: T) {
    super();
    this.#value = initial;
  }

  get value(): T {
    return this.#value;
  }

  change(mutator: (value: T) => void): void {
    mutator(this.#value);
    this.emit("change");
  }
}
