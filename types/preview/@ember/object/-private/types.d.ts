declare module '@ember/object/-private/types' {
  import type Mixin from '@ember/object/mixin';

  /**
   * Map type `T` to a plain object hash with the identity mapping.
   *
   * Discards any additional object identity like the ability to `new()` up the class.
   * The `new()` capability is added back later by merging `EmberClassConstructor<T>`
   *
   * Implementation is carefully chosen for the reasons described in
   * https://github.com/typed-ember/ember-typings/pull/29
   */
  export type Objectify<T> = Readonly<T>;

  export type ExtractPropertyNamesOfType<T, S> = {
    [K in keyof T]: T[K] extends S ? K : never;
  }[keyof T];

  export type Fix<T> = { [K in keyof T]: T[K] };

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
  export type EmberClassConstructor<T> = (new (properties?: object) => T) &
    (new (...args: any[]) => T);

  /**
   * Check that any arguments to `create()` match the type's properties.
   *
   * Accept any additional properties and add merge them into the instance.
   */
  export type EmberInstanceArguments<T> = Partial<T> & {
    [key: string]: unknown;
  };

  /**
   * Accept any additional properties and add merge them into the prototype.
   */
  export interface EmberClassArguments {
    [key: string]: unknown;
  }

  /**
   * Ember.Object.extend(...) accepts any number of mixins or literals.
   */
  export type MixinOrLiteral<T> = Mixin | T;

  export type ObserverMethod<Target, Sender> =
    | keyof Target
    | ((this: Target, sender: Sender, key: string, value: any, rev: number) => void);

  // This type looks weird, but is correct: from a list of "bottom" to "top", in
  // type theory terms.
  export type AnyFunction = (...args: never[]) => unknown;
}
