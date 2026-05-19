import EventEmitter from "eventemitter3";
import type * as A from "@automerge/automerge";
import type { UrlHeads } from "@automerge/automerge-repo";
import { HANDLE_BRAND, type Handle, type HandleEvents } from "./Handle";
import type { Path, ValueAtPath } from "./paths";

// True iff the patch path and the sub-path overlap (one is a prefix of the
// other). A patch above us is a replacement that includes our value; a patch
// below us is a mutation inside our value. Either way, we changed.
const overlaps = (
  patchPath: readonly (string | number)[],
  subPath: readonly (string | number)[],
): boolean => {
  const n = Math.min(patchPath.length, subPath.length);
  for (let i = 0; i < n; i++) {
    if (patchPath[i] !== subPath[i]) return false;
  }
  return true;
};

export class SubHandle<S>
  extends EventEmitter<HandleEvents>
  implements Handle<S>
{
  readonly [HANDLE_BRAND] = true as const;

  #parent: Handle<unknown>;
  #path: readonly (string | number)[];
  #prevHeads: UrlHeads | undefined;
  #onParentChange: () => void;

  constructor(parent: Handle<unknown>, path: readonly (string | number)[]) {
    super();
    this.#parent = parent;
    this.#path = path;

    // Feature-detect by actually calling `heads()` — a nested SubHandle over
    // a StateHandle has the methods but they return undefined / empty,
    // which would otherwise cause us to swallow every change.
    const initialHeads = parent.heads?.();
    const supportsDiff =
      initialHeads !== undefined && typeof parent.diff === "function";

    this.#prevHeads = supportsDiff ? initialHeads : undefined;

    this.#onParentChange = () => {
      if (supportsDiff) {
        const nextHeads = parent.heads!()!;
        const patches = parent.diff!(this.#prevHeads!, nextHeads);
        this.#prevHeads = nextHeads;
        if (!patches.some((p) => overlaps(p.path, this.#path))) return;
      }
      this.emit("change");
    };

    parent.on("change", this.#onParentChange);
  }

  get value(): S {
    let cursor: unknown = this.#parent.value;
    for (let i = 0; i < this.#path.length; i++) {
      const key = this.#path[i];
      if (cursor == null || !(key in (cursor as object))) {
        throw new Error(
          `SubHandle: missing segment "${String(key)}" at index ${i}`,
        );
      }
      cursor = (cursor as Record<string | number, unknown>)[key];
    }
    return cursor as S;
  }

  change(mutator: (value: S) => void): void {
    this.#parent.change((root) => {
      let cursor: unknown = root;
      for (let i = 0; i < this.#path.length - 1; i++) {
        const key = this.#path[i];
        if (cursor == null || !(key in (cursor as object))) {
          throw new Error(
            `SubHandle: missing segment "${String(key)}" at index ${i}`,
          );
        }
        cursor = (cursor as Record<string | number, unknown>)[key];
      }
      const last = this.#path[this.#path.length - 1];
      if (cursor == null || !(last in (cursor as object))) {
        throw new Error(`SubHandle: missing leaf "${String(last)}"`);
      }
      mutator((cursor as Record<string | number, unknown>)[last] as S);
    });
  }

  ref<const P extends Path<S>>(...path: P): Handle<ValueAtPath<S, P>>;
  ref<const P extends Path<S>>(
    path: P,
    defaultValue: ValueAtPath<S, P>,
  ): Handle<ValueAtPath<S, P>>;
  ref(...args: unknown[]): Handle<unknown> {
    // Compose with our parent: a SubHandle of a SubHandle becomes a single
    // SubHandle over the original root with the concatenated path. The
    // tuple+default form forwards to the parent so that whichever concrete
    // handle sits at the root performs the vivify in its own world.
    if (args.length === 2 && Array.isArray(args[0])) {
      const subPath = args[0] as readonly (string | number)[];
      const defaultValue = args[1];
      const fullPath: readonly (string | number)[] = [
        ...this.#path,
        ...subPath,
      ];
      const parentRef = (this.#parent as {
        ref: (...a: unknown[]) => Handle<unknown>;
      }).ref;
      return parentRef.call(this.#parent, fullPath, defaultValue);
    }
    const spreadPath = args as readonly (string | number)[];
    return new SubHandle<unknown>(this.#parent, [
      ...this.#path,
      ...spreadPath,
    ]);
  }

  // Forward the diff capability up to the root so nested SubHandles get
  // precise filtering too. Only present at runtime if the parent supports
  // diff; the optional interface declaration on Handle is satisfied either
  // way because `undefined` is assignable to optional methods.
  heads(): UrlHeads | undefined {
    return this.#parent.heads?.();
  }

  diff(before: UrlHeads, after?: UrlHeads): A.Patch[] {
    const all = this.#parent.diff?.(before, after) ?? [];
    return all.filter((p) => overlaps(p.path, this.#path));
  }

  destroy(): void {
    this.#parent.off("change", this.#onParentChange);
    this.removeAllListeners();
  }
}
