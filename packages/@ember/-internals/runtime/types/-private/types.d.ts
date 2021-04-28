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
  [key: string]: any;
};

export type ObserverMethod<Target, Sender> =
  | keyof Target
  | ((this: Target, sender: Sender, key: string, value: any, rev: number) => void);
