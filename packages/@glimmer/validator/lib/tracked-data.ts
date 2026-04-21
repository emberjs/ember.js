/**
 * GXT-backed trackedData.
 *
 * Each @tracked property is stored in a GXT Cell rather than a glimmer
 * revision tag. GXT templates auto-track cell reads during rendering and
 * schedule re-renders when cells update.
 *
 * We avoid a static import of @lifeart/gxt here because this file is also
 * loaded during Node.js template compilation (babel-plugin-ember-template-
 * compilation). Instead we import lazily at first use.
 */

export type Getter<T, K extends keyof T> = (self: T) => T[K] | undefined;
export type Setter<T, K extends keyof T> = (self: T, value: T[K]) => void;

// Lightweight cell storage: per-object WeakMap of per-key reactive boxes.
// We implement the minimal cell API ourselves so we don't need a static
// import of @lifeart/gxt (which fails during Node.js babel transforms).

interface GXTCell<T> {
  value: T;
  update(v: T): void;
}

type GXTCellConstructor = new <T>(value: T) => GXTCell<T>;

let _CellClass: GXTCellConstructor | null = null;
let _scheduleRevalidate: (() => void) | null = null;

function getCell<T>(
  initialValue: T,
  _debugName?: string
): GXTCell<T> {
  if (_CellClass !== null) {
    return new _CellClass<T>(initialValue);
  }

  // Minimal fallback cell that integrates with GXT's reactive scheduler once
  // GXT is loaded (happens on first render in the browser).
  let _value = initialValue;
  const cell: GXTCell<T> = {
    get value() {
      // Plug into GXT's active tracking frame if available.
      const g = globalThis as any;
      if (g.__GXT_RUNTIME_INITIALIZED__ && g.__gxtCurrentTracker) {
        g.__gxtCurrentTracker.add(cell);
      }
      return _value;
    },
    update(v: T) {
      _value = v;
      // Trigger GXT's scheduler if available.
      const g = globalThis as any;
      if (g.__GXT_RUNTIME_INITIALIZED__) {
        if (g.__gxtTagsToRevalidate) g.__gxtTagsToRevalidate.add(cell);
        if (g.__gxtScheduleRevalidate) g.__gxtScheduleRevalidate();
      }
    },
  };
  return cell;
}

const _cells = new WeakMap<object, Map<PropertyKey, GXTCell<unknown>>>();

function getCellFor<T extends object, K extends keyof T>(
  obj: T,
  key: K,
  initializer?: (this: T) => T[K]
): GXTCell<T[K]> {
  let byKey = _cells.get(obj);
  if (!byKey) {
    byKey = new Map();
    _cells.set(obj, byKey);
  }
  let c = byKey.get(key as PropertyKey) as GXTCell<T[K]> | undefined;
  if (!c) {
    const init =
      typeof initializer === 'function'
        ? (initializer as (this: T) => T[K]).call(obj)
        : (undefined as unknown as T[K]);
    c = getCell<T[K]>(init);
    byKey.set(key as PropertyKey, c);
  }
  return c;
}

export function trackedData<T extends object, K extends keyof T>(
  key: K,
  initializer?: (this: T) => T[K]
): { getter: Getter<T, K>; setter: Setter<T, K> } {
  return {
    getter(self: T) {
      return getCellFor(self, key, initializer).value;
    },
    setter(self: T, value: T[K]) {
      getCellFor(self, key, initializer).update(value);
    },
  };
}
