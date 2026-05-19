import { DocHandle } from "@automerge/automerge-repo";
import { HANDLE_BRAND, type Handle } from "./Handle";
import type { Path, ValueAtPath } from "./paths";
import { SubHandle } from "./SubHandle";
import { vivify } from "./vivify";

declare module "@automerge/automerge-repo" {
  interface DocHandle<T> {
    readonly [HANDLE_BRAND]: true;
    readonly value: T;
    ref<const P extends Path<T>>(...path: P): Handle<ValueAtPath<T, P>>;
    ref<const P extends Path<T>>(
      path: P,
      defaultValue: ValueAtPath<T, P>,
    ): Handle<ValueAtPath<T, P>>;
  }
}

if (!Object.prototype.hasOwnProperty.call(DocHandle.prototype, "value")) {
  Object.defineProperty(DocHandle.prototype, "value", {
    get(this: DocHandle<unknown>) {
      return this.doc();
    },
    configurable: true,
  });
}

if (!Object.prototype.hasOwnProperty.call(DocHandle.prototype, HANDLE_BRAND)) {
  Object.defineProperty(DocHandle.prototype, HANDLE_BRAND, {
    value: true,
    configurable: true,
  });
}

// automerge-repo's DocHandle ships its own `ref` (a path-based RefImpl that
// expects PathInput segments, not arrays). We deliberately clobber it so the
// Handle.ref contract is uniform across DocHandle/StateHandle/SubHandle.
Object.defineProperty(DocHandle.prototype, "ref", {
  value: function (this: DocHandle<unknown>, ...args: unknown[]) {
    // Tuple+default form: `ref([...path], defaultValue)` — vivify missing
    // intermediates and the leaf before returning the sub-handle.
    if (args.length === 2 && Array.isArray(args[0])) {
      const path = args[0] as readonly (string | number)[];
      const defaultValue = args[1];
      this.change((d) => vivify(d as object, path, defaultValue));
      return new SubHandle(this as unknown as Handle<unknown>, path);
    }
    const path = args as readonly (string | number)[];
    return new SubHandle(this as unknown as Handle<unknown>, path);
  },
  configurable: true,
  writable: true,
});
