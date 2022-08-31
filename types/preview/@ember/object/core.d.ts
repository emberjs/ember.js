declare module '@ember/object/core' {
  import type { EmberClassConstructor, Objectify } from '@ember/object/-private/types';
  import type Mixin from '@ember/object/mixin';

  export default class CoreObject {
    /**
     * As of Ember 3.1, CoreObject constructor takes initial object properties as an argument.
     * See: https://github.com/emberjs/ember.js/commit/4709935854d4c29b0d2c054614d53fa2c55309b1
     */
    constructor(properties?: object);

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
    concatenatedProperties: string[] | null;

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

    static create<Class extends typeof CoreObject>(
      this: Class,
      ...initialValues: Array<Mixin | MembersOf<Class>>
    ): InstanceType<Class>;

    static extend<Statics, Instance>(
      this: Statics & EmberClassConstructor<Instance>,
      ...mixins: Array<Mixin | Record<string, unknown>>
    ): Objectify<Statics> & EmberClassConstructor<Instance>;

    static reopen<Statics, Instance>(
      this: Statics & EmberClassConstructor<Instance>,
      ...mixins: Array<Mixin | Record<string, unknown>>
    ): Objectify<Statics> & EmberClassConstructor<Instance>;

    static reopenClass<Statics>(
      this: Statics,
      ...extraStatics: Array<Mixin | Record<string, unknown>>
    ): Statics;

    static isClass: boolean;
    static isMethod: boolean;
  }

  type MembersOf<Class extends typeof CoreObject> = {
    [Key in keyof InstanceType<Class>]?: InstanceType<Class>[Key];
  };
}
