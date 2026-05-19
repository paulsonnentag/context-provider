import EventEmitter from "eventemitter3";
import {
  HANDLE_BRAND,
  isHandle,
  type Handle,
  type HandleEvents,
} from "./Handle";
import type { Path, ValueAtPath } from "./paths";
import { SubHandle } from "./SubHandle";
import { vivify } from "./vivify";

type PathSeg = string | number;

type MountEntry = {
  handle: Handle<unknown>;
  path: readonly PathSeg[];
  onChange: () => void;
};

// Array methods that mutate. When a recording proxy sits over a mounted
// array and one of these is invoked, we forward the call into
// `mounted.change` instead of mutating the snapshot copy.
const ARRAY_MUTATORS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
]);

const walk = (root: unknown, path: readonly PathSeg[]): unknown => {
  let cursor: unknown = root;
  for (const seg of path) {
    if (cursor == null) {
      throw new Error(
        `StateHandle: nullish at segment "${String(seg)}" while walking path`,
      );
    }
    cursor = (cursor as Record<PathSeg, unknown>)[seg];
  }
  return cursor;
};

const pathKey = (path: readonly PathSeg[]): string => JSON.stringify(path);

// Numeric string keys on arrays should canonicalise to numbers so that
// mount lookups via `JSON.stringify(path)` agree regardless of whether the
// access was `arr[0]` or `arr["0"]`.
const normalizeKey = (target: unknown, key: string | symbol): PathSeg => {
  if (typeof key === "symbol") return String(key);
  if (Array.isArray(target) && /^[0-9]+$/.test(key)) return Number(key);
  return key;
};

export class StateHandle<T>
  extends EventEmitter<HandleEvents>
  implements Handle<T>
{
  readonly [HANDLE_BRAND] = true as const;

  #snapshot: T;
  #mounts = new Map<string, MountEntry>();
  #insideChange = false;
  #dirty = false;

  constructor(initial: T) {
    super();
    this.#snapshot = initial;
  }

  get value(): T {
    return this.#snapshot;
  }

  change(mutator: (value: T) => void): void {
    this.#insideChange = true;
    this.#dirty = false;
    try {
      mutator(this.#writeProxy([]) as T);
    } finally {
      this.#insideChange = false;
    }
    if (this.#dirty) this.emit("change");
  }

  ref<const P extends Path<T>>(...path: P): Handle<ValueAtPath<T, P>>;
  ref<const P extends Path<T>>(
    path: P,
    defaultValue: ValueAtPath<T, P>,
  ): Handle<ValueAtPath<T, P>>;
  ref(...args: unknown[]): Handle<unknown> {
    if (args.length === 2 && Array.isArray(args[0])) {
      const path = args[0] as readonly PathSeg[];
      const defaultValue = args[1];
      return this.#resolveRef(path, { defaultValue });
    }
    return this.#resolveRef(args as readonly PathSeg[]);
  }

  destroy(): void {
    for (const m of this.#mounts.values()) {
      m.handle.off("change", m.onChange);
    }
    this.#mounts.clear();
    this.removeAllListeners();
  }

  // --- internals ---------------------------------------------------------

  #markDirty(): void {
    if (this.#insideChange) {
      this.#dirty = true;
    } else {
      this.emit("change");
    }
  }

  #mount(
    parentPath: readonly PathSeg[],
    key: PathSeg,
    handle: Handle<unknown>,
  ): void {
    const path: readonly PathSeg[] = [...parentPath, key];
    const k = pathKey(path);

    const existing = this.#mounts.get(k);
    if (existing) {
      existing.handle.off("change", existing.onChange);
      this.#mounts.delete(k);
    }

    const onChange = () => this.#syncMount(k);
    handle.on("change", onChange);
    this.#mounts.set(k, { handle, path, onChange });

    const parent = walk(this.#snapshot, parentPath) as Record<PathSeg, unknown>;
    parent[key] = handle.value;
    this.#markDirty();
  }

  #unmount(path: readonly PathSeg[]): void {
    const k = pathKey(path);
    const entry = this.#mounts.get(k);
    if (!entry) return;
    entry.handle.off("change", entry.onChange);
    this.#mounts.delete(k);
  }

  #syncMount(k: string): void {
    const entry = this.#mounts.get(k);
    if (!entry) return;
    if (entry.path.length === 0) return;
    const parent = walk(
      this.#snapshot,
      entry.path.slice(0, -1),
    ) as Record<PathSeg, unknown>;
    parent[entry.path[entry.path.length - 1]] = entry.handle.value;
    this.#markDirty();
  }

  // Longest-prefix mount lookup. We iterate from deepest to shallowest so
  // that a more specific mount wins over an ancestor mount.
  #findEnclosingMount(
    path: readonly PathSeg[],
  ): { entry: MountEntry; rest: readonly PathSeg[] } | undefined {
    for (let i = path.length; i >= 0; i--) {
      const prefix = path.slice(0, i);
      const entry = this.#mounts.get(pathKey(prefix));
      if (entry) return { entry, rest: path.slice(i) };
    }
    return undefined;
  }

  #resolveRef(
    path: readonly PathSeg[],
    options?: { defaultValue: unknown },
  ): Handle<unknown> {
    if (path.length === 0) return this as unknown as Handle<unknown>;
    const found = this.#findEnclosingMount(path);
    if (found) {
      const { entry, rest } = found;
      if (rest.length === 0) return entry.handle;
      // `entry.handle.ref` is typed against `Path<unknown>` (which is `never`),
      // so we have to bypass the generic and call through a loose signature.
      const ref = (entry.handle as {
        ref: (...args: unknown[]) => Handle<unknown>;
      }).ref;
      if (options) {
        return ref.call(entry.handle, rest, options.defaultValue);
      }
      return ref.call(entry.handle, ...rest);
    }
    if (options) {
      this.change((s) =>
        vivify(s as object, path, options.defaultValue),
      );
    }
    return new SubHandle<unknown>(this as unknown as Handle<unknown>, path);
  }

  #writeProxy(path: readonly PathSeg[]): unknown {
    const self = this;
    const target = walk(this.#snapshot, path) as object;

    return new Proxy(target, {
      get(t, key) {
        if (typeof key === "symbol") return Reflect.get(t, key);
        const seg = normalizeKey(t, key);
        const childPath: readonly PathSeg[] = [...path, seg];

        const mountKey = pathKey(childPath);
        const mount = self.#mounts.get(mountKey);
        if (mount) {
          return self.#recordingProxy(mount.handle, []);
        }

        const v = (t as Record<PathSeg, unknown>)[seg];
        if (v != null && typeof v === "object") {
          return self.#writeProxy(childPath);
        }
        return v;
      },
      set(t, key, value) {
        if (typeof key === "symbol") {
          (t as Record<symbol, unknown>)[key] = value;
          return true;
        }
        const seg = normalizeKey(t, key);

        if (isHandle(value)) {
          self.#mount(path, seg, value);
          return true;
        }

        const childPath: readonly PathSeg[] = [...path, seg];
        if (self.#mounts.has(pathKey(childPath))) {
          self.#unmount(childPath);
        }

        (t as Record<PathSeg, unknown>)[seg] = value;
        self.#markDirty();
        return true;
      },
      deleteProperty(t, key) {
        if (typeof key === "symbol") {
          delete (t as Record<symbol, unknown>)[key];
          return true;
        }
        const seg = normalizeKey(t, key);
        const childPath: readonly PathSeg[] = [...path, seg];

        if (self.#mounts.has(pathKey(childPath))) {
          self.#unmount(childPath);
        }

        delete (t as Record<PathSeg, unknown>)[seg];
        self.#markDirty();
        return true;
      },
    });
  }

  // Recording proxy used when a path inside `change` enters a mount.
  // `handle.value` may be frozen (e.g. an automerge doc snapshot), so we
  // proxy a fresh empty target whose only job is to satisfy proxy
  // invariants — every read/write actually reads/writes the live mounted
  // value via `walk(handle.value, relPath)`.
  #recordingProxy(
    handle: Handle<unknown>,
    relPath: readonly PathSeg[],
  ): unknown {
    const self = this;
    const live = walk(handle.value, relPath);
    const target: object = Array.isArray(live) ? [] : {};

    return new Proxy(target, {
      get(_, key) {
        const current = walk(handle.value, relPath);
        if (typeof key === "symbol") {
          return Reflect.get(current as object, key);
        }
        const seg = normalizeKey(current, key);

        if (
          typeof seg === "string" &&
          Array.isArray(current) &&
          ARRAY_MUTATORS.has(seg)
        ) {
          return (...args: unknown[]) => {
            let result: unknown;
            handle.change((d) => {
              const cursor = walk(d, relPath) as Record<PathSeg, unknown>;
              const fn = (cursor as unknown as Record<string, unknown>)[
                seg
              ] as (...a: unknown[]) => unknown;
              result = fn.apply(cursor, args);
            });
            return result;
          };
        }

        const v = (current as Record<PathSeg, unknown>)[seg];
        if (v != null && typeof v === "object") {
          return self.#recordingProxy(handle, [...relPath, seg]);
        }
        return v;
      },
      set(_, key, value) {
        if (typeof key === "symbol") return false;
        const current = walk(handle.value, relPath);
        const seg = normalizeKey(current, key);
        handle.change((d) => {
          const cursor = walk(d, relPath) as Record<PathSeg, unknown>;
          cursor[seg] = value;
        });
        return true;
      },
      deleteProperty(_, key) {
        if (typeof key === "symbol") return false;
        const current = walk(handle.value, relPath);
        const seg = normalizeKey(current, key);
        handle.change((d) => {
          const cursor = walk(d, relPath) as Record<PathSeg, unknown>;
          delete cursor[seg];
        });
        return true;
      },
      has(_, key) {
        const current = walk(handle.value, relPath);
        return key in (current as object);
      },
      ownKeys(_) {
        const current = walk(handle.value, relPath);
        return Reflect.ownKeys(current as object);
      },
      getOwnPropertyDescriptor(_, key) {
        const current = walk(handle.value, relPath);
        const desc = Reflect.getOwnPropertyDescriptor(current as object, key);
        if (desc) return { ...desc, configurable: true };
        return undefined;
      },
    });
  }
}
