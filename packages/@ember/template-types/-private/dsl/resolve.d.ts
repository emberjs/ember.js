import { DirectInvokable, InvokableInstance, Invoke, InvokeDirect } from '../integration';
import { ResolveOrReturn } from './types';

/*
 * We have multiple ways of representing invokable values, dictated by certain constraints
 * of how TypeScript works. The purpose of `resolve` is to take any one of these types of
 * values and return a function of the following form:
 *
 *     (args: Named, ...positional: Positional) => Result
 *
 * `Named` and `Positional` represent the respective types of the named and positional
 * args accepted, and `Result` is either `CreatesModifier`, `ComponentReturn<...>`, or any
 * other type to simply indicate that the invokable returns a value.
 *
 * In the core, invokables can take one of two forms:
 *
 *  - `new (...) => InvokableInstance<T>`: this is the typical signature for items such as a
 *    component subclass. In resolving this form, we need to break apart the construct
 *    signature and reconstruct it as a regular function, which has the implicit effect
 *    of preserving type parameters for polymorphic components in the resulting function
 *    type.
 *  - `DirectInvokable<T>`: While items like component classes can't directly be invokable
 *    themselves (among other things, their instance's type params wouldn't be in scope),
 *    this form is useful for certain complex cases that may require explicitly declaring
 *    a type rather than inferring it. Breaking apart and reconstructing a function
 *    signature as we do above will cause functions with multipe signatures to collapse
 *    down to their most general form, which breaks complex declarations like `fn` that
 *    rely on having multiple overrides to be typed correctly.
 *
 * In modern Ember.js, plain functions can themselves be invokables with their
 * own particular resolution semantics.
 */

export declare function resolve<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
export declare function resolve<Args extends unknown[], Instance extends InvokableInstance>(
  item: (abstract new (...args: Args) => Instance) | null | undefined,
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;

/*
 * A mustache like `{{this.foo}}` might either return a plain value like a string
 * or number, or it might be an arg-less invocation of a helper (or even a curly
 * component, depending on context).
 *
 * This variant of `resolve` is used for such mustaches, treating values with
 * no associated signature as though they were arg-less helpers that return a
 * value of the appropriate type.
 */

export declare const resolveOrReturn: ResolveOrReturn<typeof resolve>;

/*
 * Binding helpers like `{{component}}` and `{{helper}}` accept a variety of possible
 * environment-specific initial arguments. This variant `resolve` signature allows
 * environments to dictate how that argument is interpreted before being handed off to
 * the actual helper definition. By resolving to the internal invokable form as described
 * above, TypeScript can "do the right thing" in more cases for type inference, particularly
 * with invokables whose signatures include type parameters.
 */

export declare function resolveForBind<T extends DirectInvokable>(item: T): T[typeof InvokeDirect];
export declare function resolveForBind<Args extends unknown[], Instance extends InvokableInstance>(
  item: abstract new (...args: Args) => Instance,
): (...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>;
export declare function resolveForBind<Args extends unknown[], Instance extends InvokableInstance>(
  item: null | undefined | (abstract new (...args: Args) => Instance),
): null | ((...args: Parameters<Instance[typeof Invoke]>) => ReturnType<Instance[typeof Invoke]>);
