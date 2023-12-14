declare module '@ember/-internals/meta/lib/meta' {
  import type { ComputedProperty } from '@ember/-internals/metal';
  import type { Revision, UpdatableTag } from '@glimmer/validator';
  type ObjMap<T> = {
    [key: string]: T;
  };
  export interface MetaCounters {
    peekCalls: number;
    peekPrototypeWalks: number;
    setCalls: number;
    deleteCalls: number;
    metaCalls: number;
    metaInstantiated: number;
    matchingListenersCalls: number;
    observerEventsCalls: number;
    addToListenersCalls: number;
    removeFromListenersCalls: number;
    removeAllListenersCalls: number;
    listenersInherited: number;
    listenersFlattened: number;
    parentListenersUsed: number;
    flattenedListenersCalls: number;
    reopensAfterFlatten: number;
    readableLazyChainsCalls: number;
    writableLazyChainsCalls: number;
  }
  let counters: MetaCounters | undefined;
  /**
    @module ember
    */
  export const UNDEFINED: symbol;
  const enum ListenerKind {
    ADD = 0,
    ONCE = 1,
    REMOVE = 2,
  }
  interface StringListener {
    event: string;
    target: null;
    method: string;
    kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE;
    sync: boolean;
  }
  interface FunctionListener {
    event: string;
    target: object | null;
    method: Function;
    kind: ListenerKind.ADD | ListenerKind.ONCE | ListenerKind.REMOVE;
    sync: boolean;
  }
  type Listener = StringListener | FunctionListener;
  export class Meta {
    /** @internal */
    _descriptors: Map<string, any> | undefined;
    /** @internal */
    _mixins: any | undefined;
    /** @internal */
    _isInit: boolean;
    /** @internal */
    _lazyChains: ObjMap<[UpdatableTag, unknown][]> | undefined;
    /** @internal */
    _values: ObjMap<unknown> | undefined;
    /** @internal */
    _revisions: ObjMap<Revision> | undefined;
    /** @internal */
    source: object;
    /** @internal */
    proto: object | undefined;
    /** @internal */
    _parent: Meta | undefined | null;
    /** @internal */
    _listeners: Listener[] | undefined;
    /** @internal */
    _listenersVersion: number;
    /** @internal */
    _inheritedEnd: number;
    /** @internal */
    _flattenedVersion: number;
    /** @internal */
    constructor(obj: object);
    /** @internal */
    get parent(): Meta | null;
    setInitializing(): void;
    /** @internal */
    unsetInitializing(): void;
    /** @internal */
    isInitializing(): boolean;
    /** @internal */
    isPrototypeMeta(obj: object): boolean;
    /** @internal */
    _getOrCreateOwnMap(key: '_values' | '_revisions' | '_lazyChains'): any;
    /** @internal */
    _getOrCreateOwnSet(key: '_mixins'): any;
    /** @internal */
    _findInheritedMap(key: keyof Meta, subkey: string): any | undefined;
    /** @internal */
    _hasInInheritedSet(key: keyof Meta, value: any): boolean;
    /** @internal */
    valueFor(key: string): unknown;
    /** @internal */
    setValueFor(key: string, value: unknown): void;
    /** @internal */
    revisionFor(key: string): Revision | undefined;
    /** @internal */
    setRevisionFor(key: string, revision: Revision | undefined): void;
    /** @internal */
    writableLazyChainsFor(key: string): [UpdatableTag, unknown][];
    /** @internal */
    readableLazyChainsFor(key: string): [UpdatableTag, unknown][] | undefined;
    /** @internal */
    addMixin(mixin: any): void;
    /** @internal */
    hasMixin(mixin: any): boolean;
    /** @internal */
    forEachMixins(fn: Function): void;
    /** @internal */
    writeDescriptors(subkey: string, value: any): void;
    /** @internal */
    peekDescriptors(subkey: string): any;
    /** @internal */
    removeDescriptors(subkey: string): void;
    /** @internal */
    forEachDescriptors(fn: (key: string, value: ComputedProperty) => void): void;
    /** @internal */
    addToListeners(
      eventName: string,
      target: object | null,
      method: Function | PropertyKey,
      once: boolean,
      sync: boolean
    ): void;
    /** @internal */
    removeFromListeners(eventName: string, target: object | null, method: Function | string): void;
    private pushListener;
    private writableListeners;
    /**
          Flattening is based on a global revision counter. If the revision has
          bumped it means that somewhere in a class inheritance chain something has
          changed, so we need to reflatten everything. This can only happen if:
      
          1. A meta has been flattened (listener has been called)
          2. The meta is a prototype meta with children who have inherited its
             listeners
          3. A new listener is subsequently added to the meta (e.g. via `.reopen()`)
      
          This is a very rare occurrence, so while the counter is global it shouldn't
          be updated very often in practice.
        */
    private flattenedListeners;
    /** @internal */
    matchingListeners(eventName: string): (string | boolean | object | null)[] | undefined;
    /** @internal */
    observerEvents(): any[] | undefined;
  }
  export function setMeta(obj: object, meta: Meta): void;
  export function peekMeta(obj: object): Meta | null;
  /**
      Retrieves the meta hash for an object. If `writable` is true ensures the
      hash is writable for this object as well.

      The meta object contains information about computed property descriptors as
      well as any watched properties and other information. You generally will
      not access this information directly but instead work with higher level
      methods that manipulate this hash indirectly.

      @method meta
      @for Ember
      @private

      @param {Object} obj The object to retrieve meta for
      @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
        the meta hash, allowing the method to avoid making an unnecessary copy.
      @return {Object} the meta hash for an object
    */
  export const meta: {
    (obj: object): Meta;
    _counters?: MetaCounters;
  };
  export { counters };
}
