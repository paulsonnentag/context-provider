import EventEmitter from "eventemitter3";
import type { Handle, HandleEvents } from "./Handle";

export class StateHandle<T>
  extends EventEmitter<HandleEvents>
  implements Handle<T>
{
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
