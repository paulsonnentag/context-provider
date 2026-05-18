import EventEmitter from "eventemitter3";
import type { Handle, HandleEvents } from "./Handle";

// A keyed collection of handles that is itself a Handle<Record<K, V>>.
//
// The aggregate value is derived from member handles, so direct mutation via
// `change()` is unsupported (throws). Mutate the map structurally with
// `set`/`delete`, and mutate individual entries via their own handles.
export class MapHandle<K extends string, V>
  extends EventEmitter<HandleEvents>
  implements Handle<Record<K, V>>
{
  #entries = new Map<K, { handle: Handle<V>; onChange: () => void }>();

  set(key: K, handle: Handle<V>): void {
    this.delete(key);
    const onChange = () => this.emit("change");
    handle.on("change", onChange);
    this.#entries.set(key, { handle, onChange });
    this.emit("change");
  }

  delete(key: K): boolean {
    const entry = this.#entries.get(key);
    if (!entry) return false;
    entry.handle.off("change", entry.onChange);
    this.#entries.delete(key);
    this.emit("change");
    return true;
  }

  get(key: K): Handle<V> | undefined {
    return this.#entries.get(key)?.handle;
  }

  has(key: K): boolean {
    return this.#entries.has(key);
  }

  keys(): IterableIterator<K> {
    return this.#entries.keys();
  }

  get value(): Record<K, V> {
    const out = {} as Record<K, V>;
    for (const [k, { handle }] of this.#entries) out[k] = handle.value;
    return out;
  }

  change(): never {
    throw new Error(
      "MapHandle.value is derived; use set()/delete() to mutate the map, " +
        "or mutate child handles directly.",
    );
  }

  destroy(): void {
    for (const { handle, onChange } of this.#entries.values()) {
      handle.off("change", onChange);
    }
    this.#entries.clear();
    this.removeAllListeners();
  }
}
