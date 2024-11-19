import type {
  AnyFn,
  AppendingBlock,
  BlockArguments,
  Cursor,
  Dict,
  NamedArguments,
  PositionalArguments,
  VMArguments,
} from '@glimmer/interfaces';
import { LOCAL_DEBUG } from '@glimmer/local-debug-flags';

const LOCAL_DEBUG_BRAND = new WeakMap<object, ClassifiedLocalDebug>();

/**
 * An object branded with a local debug type has special local trace logging
 * behavior.
 *
 * If `LOCAL_DEBUG` is `false`, this function does nothing (and is removed
 * by the minifier in builder).
 */
export function setLocalDebugType<P extends LocalDebugType>(
  type: P,
  ...brand: SetLocalDebugArgs<P>
): void;
export function setLocalDebugType(type: string, ...brand: [value: object, options?: object]) {
  if (LOCAL_DEBUG) {
    if (brand.length === 1) {
      const [value] = brand;
      LOCAL_DEBUG_BRAND.set(value, { type, value } as ClassifiedLocalDebug);
    } else {
      const [value, options] = brand;
      LOCAL_DEBUG_BRAND.set(value, { type, value, options } as ClassifiedLocalDebug);
    }
  }
}

/**
 * An object branded with a local debug type has special local trace logging
 * behavior.
 *
 * If `LOCAL_DEBUG` is `false`, this function always returns undefined. However,
 * this function should only be called by the trace logger, which should only
 * run in trace `LOCAL_DEBUG` + `LOCAL_TRACE_LOGGING` mode.
 */
export function getLocalDebugType(value: object): ClassifiedLocalDebug | void {
  if (LOCAL_DEBUG) {
    return LOCAL_DEBUG_BRAND.get(value);
  }
}

interface SourcePosition {
  line: number;
  column: number;
}

export interface LocalDebugMap {
  args: [VMArguments];
  'args:positional': [PositionalArguments];
  'args:named': [NamedArguments];
  'args:blocks': [BlockArguments];
  cursor: [Cursor];
  'block:simple': [AppendingBlock];
  'block:remote': [AppendingBlock];
  'block:resettable': [AppendingBlock];
  'factory:helper': [AnyFn, { name: string }];

  'syntax:source': [{ readonly source: string; readonly module: string }];
  'syntax:symbol-table:program': [object, { debug?: () => DebugProgramSymbolTable }];

  'syntax:mir:node': [
    { loc: { startPosition: SourcePosition; endPosition: SourcePosition }; type: string },
  ];
}

export interface DebugProgramSymbolTable {
  readonly templateLocals: readonly string[];
  readonly keywords: readonly string[];
  readonly symbols: readonly string[];
  readonly upvars: readonly string[];
  readonly named: Dict<number>;
  readonly blocks: Dict<number>;
  readonly hasDebugger: boolean;
}

export type LocalDebugType = keyof LocalDebugMap;

export type SetLocalDebugArgs<D extends LocalDebugType> = {
  [P in D]: LocalDebugMap[P] extends [infer This extends object, infer Options extends object]
    ? [This, Options]
    : LocalDebugMap[P] extends [infer This extends object]
      ? [This]
      : never;
}[D];

export type ClassifiedLocalDebug = {
  [P in LocalDebugType]: LocalDebugMap[P] extends [infer T, infer Options]
    ? { type: P; value: T; options: Options }
    : LocalDebugMap[P] extends [infer T]
      ? { type: P; value: T }
      : never;
}[LocalDebugType];

export type ClassifiedLocalDebugFor<N extends LocalDebugType> = LocalDebugMap[N] extends [
  infer T,
  infer Options,
]
  ? { type: N; value: T; options: Options }
  : LocalDebugMap[N] extends [infer T]
    ? { type: N; value: T }
    : never;

export type ClassifiedOptions<N extends LocalDebugType> = LocalDebugMap[N] extends [
  unknown,
  infer Options,
]
  ? Options
  : never;
