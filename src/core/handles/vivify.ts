// Walks `path` inside a mutable root, creating empty intermediates for any
// missing segment, and setting the leaf to `defaultValue` if it doesn't yet
// exist. Used by `Handle.ref(path, defaultValue)` to address the "ensure the
// path exists before vending a sub-handle" problem.
//
// Intermediate node kind is inferred from the *next* path segment: numeric
// segments imply an array intermediate, string segments imply an object.
// The leaf is only written when it's currently `undefined`; existing values
// (including `null`) are preserved.
export const vivify = (
  root: unknown,
  path: readonly (string | number)[],
  defaultValue: unknown,
): void => {
  if (path.length === 0) return;
  let cursor = root as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i];
    if (cursor[seg] == null) {
      const next = path[i + 1];
      cursor[seg] = typeof next === "number" ? [] : {};
    }
    cursor = cursor[seg] as Record<string | number, unknown>;
  }
  const last = path[path.length - 1];
  if (cursor[last] === undefined) {
    cursor[last] = defaultValue;
  }
};
