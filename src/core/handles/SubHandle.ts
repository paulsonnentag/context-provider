import EventEmitter from "eventemitter3";
import type * as A from "@automerge/automerge";
import type { UrlHeads } from "@automerge/automerge-repo";
import type { Handle, HandleEvents } from "./Handle";

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7];

export type Path<T, D extends number = 6> = [D] extends [never]
  ? never
  : T extends readonly (infer U)[]
    ? readonly [number] | readonly [number, ...Path<U, Prev[D]>]
    : T extends object
      ? {
          [K in keyof T & (string | number)]:
            | readonly [K]
            | readonly [K, ...Path<T[K], Prev[D]>];
        }[keyof T & (string | number)]
      : never;

export type ValueAtPath<T, P extends readonly unknown[]> = P extends readonly []
  ? T
  : P extends readonly [infer K, ...infer R]
    ? K extends keyof T
      ? R extends readonly unknown[]
        ? ValueAtPath<T[K], R>
        : never
      : K extends number
        ? T extends readonly (infer U)[]
          ? R extends readonly unknown[]
            ? ValueAtPath<U, R>
            : never
          : never
        : never
    : never;

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

export class SubHandle<T, S>
  extends EventEmitter<HandleEvents>
  implements Handle<S>
{
  #parent: Handle<T>;
  #path: readonly (string | number)[];
  #prevHeads: UrlHeads | undefined;
  #onParentChange: () => void;

  constructor(parent: Handle<T>, path: readonly (string | number)[]) {
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
      mutator(
        (cursor as Record<string | number, unknown>)[last] as S,
      );
    });
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

export function subHandle<T, const P extends Path<T>>(
  parent: Handle<T>,
  path: P,
): SubHandle<T, ValueAtPath<T, P>> {
  return new SubHandle<T, ValueAtPath<T, P>>(
    parent,
    path as unknown as readonly (string | number)[],
  );
}
