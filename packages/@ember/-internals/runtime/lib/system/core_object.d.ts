import { Owner } from '@ember/-internals/owner';

/**
 * Used to infer the type of ember classes of type `T`.
 *
 * Generally you would use `EmberClass.create()` instead of `new EmberClass()`.
 *
 * The single-arg constructor is required by the typescript compiler.
 * The multi-arg constructor is included for better ergonomics.
 *
 * Implementation is carefully chosen for the reasons described in
 * https://github.com/typed-ember/ember-typings/pull/29
 */
type EmberClassConstructor<T> = new (owner: Owner) => T;

type MergeArray<Arr extends any[]> = Arr extends [infer T, ...infer Rest]
  ? T & MergeArray<Rest>
  : unknown; // TODO: Is this correct?

export default class CoreObject {
  /** @internal */
  static extend<Statics, Instance>(
    this: Statics & EmberClassConstructor<Instance>,
    ...args: any[]
  ): Readonly<Statics> & EmberClassConstructor<Instance>;

  /** @internal */
  static reopen(...args: any[]): any;

  /** @internal */
  static reopenClass(...args: any[]): any;

  /**
   * CoreObject constructor takes owner.
   */
  constructor(owner: Owner);

  /** @internal */
  _super(...args: any[]): any;

  /**
   * An overridable method called when objects are instantiated. By default,
   * does nothing unless it is overridden during class definition.
   */
  init(): void;

  /**
   * Defines the properties that will be concatenated from the superclass (instead of overridden).
   * @default null
   */
  concatenatedProperties: string[];

  /**
   * Destroyed object property flag. If this property is true the observers and bindings were
   * already removed by the effect of calling the destroy() method.
   * @default false
   */
  isDestroyed: boolean;
  /**
   * Destruction scheduled flag. The destroy() method has been called. The object stays intact
   * until the end of the run loop at which point the isDestroyed flag is set.
   * @default false
   */
  isDestroying: boolean;

  /**
   * Destroys an object by setting the `isDestroyed` flag and removing its
   * metadata, which effectively destroys observers and bindings.
   * If you try to set a property on a destroyed object, an exception will be
   * raised.
   * Note that destruction is scheduled for the end of the run loop and does not
   * happen immediately.  It will set an isDestroying flag immediately.
   * @return receiver
   */
  destroy(): CoreObject;

  /**
   * Override to implement teardown.
   */
  willDestroy(): void;

  /**
   * Returns a string representation which attempts to provide more information than Javascript's toString
   * typically does, in a generic way for all Ember objects (e.g., "<App.Person:ember1024>").
   * @return string representation
   */
  toString(): string;

  static create<Class extends typeof CoreObject, Args extends Array<Record<string, any>>>(
    this: Class,
    ...args: Args
  ): InstanceType<Class> & MergeArray<Args>;

  /** @internal */
  static detect<Statics, Instance>(
    this: Statics & EmberClassConstructor<Instance>,
    obj: any
  ): obj is Readonly<Statics> & EmberClassConstructor<Instance>;

  /** @internal */
  static detectInstance<Instance>(this: EmberClassConstructor<Instance>, obj: any): obj is Instance;

  /**
   * Iterate over each computed property for the class, passing its name and any
   * associated metadata (see metaForProperty) to the callback.
   * @internal
   */
  static eachComputedProperty(callback: (...args: any[]) => any, binding: {}): void;
  /**
   * Returns the original hash that was passed to meta().
   * @param key property name
   * @internal
   */
  static metaForProperty(key: string): {};

  /** @internal */
  static isClass: boolean;

  /** @internal */
  static isMethod: boolean;
}
