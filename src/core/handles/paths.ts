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

// `T extends T` forces distribution over union members so that an optional
// property type like `{ comments?: Comment[] }` (which is really
// `{ comments?: Comment[] } | undefined`) doesn't collapse `keyof T` to
// `never`. Each branch resolves independently and the results union back.
export type ValueAtPath<T, P extends readonly unknown[]> = T extends T
  ? P extends readonly []
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
      : never
  : never;
