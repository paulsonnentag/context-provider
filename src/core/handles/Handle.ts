import type * as A from "@automerge/automerge";
import type { UrlHeads } from "@automerge/automerge-repo";

export type HandleEvents = {
  change: () => void;
};

// Structural interface implemented by every handle (StateHandle, automerge
// DocHandle via augmentation, SubHandle, MapHandle).
//
// `heads` and `diff` are optional capabilities: a handle that carries
// automerge history exposes them so SubHandle can filter change events
// precisely. Handles without them (e.g. StateHandle) cause SubHandle to
// fall back to "re-emit on every parent change".
export interface Handle<T> {
  readonly value: T;
  change(mutator: (value: T) => void): void;
  on(event: "change", listener: () => void): void;
  off(event: "change", listener: () => void): void;

  heads?(): UrlHeads | undefined;
  diff?(before: UrlHeads, after?: UrlHeads): A.Patch[];
}
