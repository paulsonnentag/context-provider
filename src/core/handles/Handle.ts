import type * as A from "@automerge/automerge";
import type { UrlHeads } from "@automerge/automerge-repo";
import type { Path, ValueAtPath } from "./paths";

export type HandleEvents = {
  change: () => void;
};

// Branded so RHS assignments inside StateHandle.change can reliably tell
// "this is another handle to mount" from "this is plain data".
export const HANDLE_BRAND: unique symbol = Symbol.for("patchwork.handle");

// Structural interface implemented by every handle (StateHandle, automerge
// DocHandle via augmentation, SubHandle).
//
// `heads` and `diff` are optional capabilities: a handle that carries
// automerge history exposes them so SubHandle can filter change events
// precisely. Handles without them (e.g. StateHandle) cause SubHandle to
// fall back to "re-emit on every parent change".
export interface Handle<T> {
  readonly [HANDLE_BRAND]: true;
  readonly value: T;
  change(mutator: (value: T) => void): void;
  on(event: "change", listener: () => void): void;
  off(event: "change", listener: () => void): void;

  // Spread-args form: returns a sub-handle for an existing path. Reads
  // throw if any segment is missing.
  ref<const P extends Path<T>>(...path: P): Handle<ValueAtPath<T, P>>;
  // Tuple+default form: ensures the path exists before returning the
  // sub-handle, vivifying missing intermediate objects/arrays and setting
  // the leaf to `defaultValue` if it's currently `undefined`.
  ref<const P extends Path<T>>(
    path: P,
    defaultValue: ValueAtPath<T, P>,
  ): Handle<ValueAtPath<T, P>>;

  heads?(): UrlHeads | undefined;
  diff?(before: UrlHeads, after?: UrlHeads): A.Patch[];
}

export const isHandle = (x: unknown): x is Handle<unknown> =>
  typeof x === "object" &&
  x !== null &&
  (x as { [HANDLE_BRAND]?: unknown })[HANDLE_BRAND] === true;
