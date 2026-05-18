import { DocHandle } from "@automerge/automerge-repo";

declare module "@automerge/automerge-repo" {
  interface DocHandle<T> {
    readonly value: T;
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
