/**
 * Type definitions for the Ember Inspector Support API.
 *
 * These types define the public contract between ember-source and the Ember Inspector.
 * The inspector accesses this API via `appLoader.loadCompatInspector()`.
 */

// ---- Supporting types ----

export interface RenderNode {
  id: string;
  type: string;
  name: string;
  args: Record<string, unknown>;
  instance: unknown;
  bounds: Bounds;
  children: RenderNode[];
}

export interface Bounds {
  parentElement: Element;
  firstNode: Node;
  lastNode: Node;
}

export interface Library {
  name: string;
  version: string;
}

export interface Owner {
  lookup(fullName: string): unknown;
  factoryFor?(fullName: string): unknown;
  hasRegistration(fullName: string): boolean;
  resolveRegistration?(fullName: string): unknown;
  isDestroyed?: boolean;
  isDestroying?: boolean;
}

/**
 * Opaque tracker object - inspector doesn't need to know internals.
 * Ember stores tag references, revisions, or any other tracking state.
 */
export interface PropertyTracker {
  readonly __brand: unique symbol;
}

/**
 * Information about a property dependency
 */
export interface PropertyDependency {
  /** The object that owns the dependency */
  object: object;
  /** The property key of the dependency */
  propertyKey: string;
  /** Whether this specific dependency changed (for getChangedDependencies) */
  changed: boolean;
}

/**
 * Public metadata for computed properties.
 * Replaces direct access to private descriptor properties.
 */
export interface ComputedMetadata {
  /** The getter function (if available) */
  getter?: Function;
  /** The setter function (if available) */
  setter?: Function;
  /** Whether the computed property is read-only */
  readOnly: boolean;
  /** Whether the computed property uses auto-tracking */
  auto: boolean;
  /** Array of dependent keys */
  dependentKeys: string[];
  /** Source code of the getter (for display purposes) */
  code?: string;
}

export interface DeprecationOptions {
  id: string;
  until: string;
  url?: string;
  since?: { available?: string; enabled?: string };
}

export type DeprecationHandler = (
  message: string,
  options: DeprecationOptions,
  next: Function
) => void;

export interface InstrumentationCallbacks<T = unknown> {
  before?: (name: string, timestamp: number, payload: object) => T;
  after?: (name: string, timestamp: number, payload: object, beforeValue: T) => void;
}

export interface EmberEnvironment {
  _DEBUG_RENDER_TREE?: boolean;
  EXTEND_PROTOTYPES?: {
    Array?: boolean;
    Function?: boolean;
    String?: boolean;
  };
  [key: string]: unknown;
}

export interface ContainerInstance {
  fullName: string;
  instance: unknown;
}

export interface GetContainerInstancesOptions {
  /** Types to exclude from results */
  excludeTypes?: string[];
  /** Whether to include private types (starting with '-') */
  includePrivate?: boolean;
}

// ---- Main API interface ----

export interface EmberInspectorAPI {
  /** Core debugging utilities */
  debug: {
    captureRenderTree: (app: Owner) => unknown[];
    inspect: (value: unknown) => string;
    registerDeprecationHandler: (handler: DeprecationHandler) => void;
  };

  /** Environment and configuration */
  environment: {
    getEnv: () => EmberEnvironment;
    VERSION: string;
  };

  /** Instrumentation */
  instrumentation: {
    subscribe: <T>(
      eventName: string,
      callbacks: InstrumentationCallbacks<T>
    ) => { pattern: string; regex: RegExp; object: InstrumentationCallbacks<T> };
    unsubscribe: (subscriber: {
      pattern: string;
      regex: RegExp;
      object: InstrumentationCallbacks;
    }) => void;
  };

  /** Object introspection */
  objectInternals: {
    cacheFor: (obj: object, key: string) => unknown;
    guidFor: (obj: object) => string;
    meta: (obj: object) => unknown;
    get: (obj: object, key: string) => unknown;
    set: (obj: object, key: string, value: unknown) => unknown;
  };

  /** Dependency injection */
  owner: {
    getOwner: (obj: object) => Owner | undefined;
    lookup: (owner: Owner, fullName: string) => unknown;
    factoryFor: (owner: Owner, fullName: string) => unknown;
    resolveRegistration: (owner: Owner, fullName: string) => unknown;
    hasRegistration: (owner: Owner, fullName: string) => boolean;
    isDestroyed: (owner: Owner) => boolean;
    isDestroying: (owner: Owner) => boolean;
    getContainerInstances: (
      owner: Owner,
      options?: GetContainerInstancesOptions
    ) => Record<string, ContainerInstance[]>;
  };

  /** Library registry */
  libraries: {
    getRegistry: () => Library[];
  };

  /**
   * Type checking functions (replaces instanceof checks).
   * All functions return false for non-objects rather than throwing.
   */
  typeChecking: {
    isEmberObject: (obj: unknown) => boolean;
    isComponent: (obj: unknown) => boolean;
    isGlimmerComponent: (obj: unknown) => boolean;
    isService: (obj: unknown) => boolean;
    isObjectProxy: (obj: unknown) => boolean;
    isArrayProxy: (obj: unknown) => boolean;
    isCoreObject: (obj: unknown) => boolean;
    isApplication: (obj: unknown) => boolean;
    isNamespace: (obj: unknown) => boolean;
    hasObservable: (obj: unknown) => boolean;
    hasEvented: (obj: unknown) => boolean;
    hasPromiseProxyMixin: (obj: unknown) => boolean;
    hasControllerMixin: (obj: unknown) => boolean;
    isMutableArray: (obj: unknown) => boolean;
    isMutableEnumerable: (obj: unknown) => boolean;
    isNativeArray: (obj: unknown) => boolean;
  };

  /**
   * Name resolution for Ember classes and mixins.
   * Returns null for unknown classes rather than throwing.
   */
  naming: {
    /**
     * Get a human-readable name for an Ember class or mixin.
     * Returns null if the class/mixin is not a known Ember type.
     *
     * Examples:
     * - Evented mixin → "Evented Mixin"
     * - EmberObject class → "EmberObject"
     * - Component class → "Component"
     * - Unknown class → null
     */
    getClassName: (classOrMixin: unknown) => string | null;
  };

  /**
   * Property change tracking (high-level API).
   * Wraps the low-level Glimmer tracking primitives from @glimmer/validator.
   */
  tracking: {
    /**
     * Create a change tracker for a property.
     * Returns an opaque tracker object used to detect changes.
     */
    createPropertyTracker: (obj: object, key: string) => PropertyTracker;

    /**
     * Check if a tracked property has changed since the tracker was created
     * or since the last call to this function.
     */
    hasPropertyChanged: (tracker: PropertyTracker) => boolean;

    /**
     * Get information about what a property depends on.
     * Includes both computed property dependent keys and tracked properties.
     */
    getPropertyDependencies: (obj: object, key: string) => PropertyDependency[];

    /**
     * Get detailed dependency information including which dependencies changed.
     * Used when a property has changed to show what caused the change.
     */
    getChangedDependencies: (
      obj: object,
      key: string,
      tracker: PropertyTracker
    ) => PropertyDependency[];

    /**
     * Check if a property uses tracking (either @tracked or computed with tracked deps).
     */
    isTrackedProperty: (obj: object, key: string) => boolean;
  };

  /** Computed property utilities */
  computed: {
    isComputed: (obj: object, key: string) => boolean;
    getComputedPropertyDescriptor: (obj: object, key: string) => unknown | null;
    getDependentKeys: (obj: object, key: string) => string[];
    getComputedMetadata: (descriptor: unknown) => ComputedMetadata | null;
    isMandatorySetter: (descriptor: unknown) => boolean;
    isCached: (obj: object, key: string) => boolean;
  };

  /** Render tree debugging */
  renderTree: {
    /**
     * Get the debug render tree instance for inspecting component hierarchy.
     * Replaces direct access to renderer._debugRenderTree or service._debugRenderTree.
     */
    getDebugRenderTree: (owner: Owner) => unknown | null;
  };

  /** Runloop access */
  runloop: {
    getBackburner: () => unknown;
    join: (callback: () => void) => void;
    debounce: (
      target: object | null,
      method: string | Function,
      wait: number,
      ...args: unknown[]
    ) => unknown;
    cancel: (timer: unknown) => void;
  };
}
