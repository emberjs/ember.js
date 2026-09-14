import {
  ComponentReturn,
  AnyFunction,
  ModifierReturn,
  FlattenBlockParams,
  Invokable,
  NamedArgNames,
  UnwrapNamedArgs,
} from './integration';
import {
  ComponentSignatureArgs,
  ComponentSignatureBlocks,
  ComponentSignatureElement,
  Get,
  InvokableArgs,
  MaybeNamed,
  PrebindArgs,
  SliceFrom,
} from './signature';

/**
 * Any value that can be safely emitted into the DOM as top-level content,
 * i.e. as `<div>{{value}}</div>`.
 *
 * This includes primitives like strings, numbers and booleans; "nothing"
 * values like `null` and `undefined`; DOM nodes; and blockless curly
 * component invocations.
 */
export type ContentValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | void
  | SafeString
  | Node
  | ArglessCurlyComponent;

// This encompasses both @glimmer/runtime and @ember/template's notion of `SafeString`s,
// and this coverage is tested in `emit-content.test.ts`.
type SafeString = { toHTML(): string };

// `{{foo}}` becomes `emitContent(resolveOrReturn(foo)({})`, which means if `foo`
// is a component that accepts no args, then this is a valid invocation.
type ArglessCurlyComponent = ComponentReturn<{}, any>;

/**
 * Any value that can be safely set as an HTML attribute on a DOM node.
 * This includes strings, numbers, booleans and `null`/`undefined`.
 *
 * Note that this does not include functions, as writing something like
 * `onclick={{this.handleClick}}` in a template ultimately relies on
 * fallback behavior in the VM to set the `onclick` property, and is
 * better performed using the `{{on}}` modifier.
 */
export type AttrValue = string | number | boolean | null | undefined | SafeString;

/**
 * A value that is invokable like a component in a template. In an
 * appropriate Glint environment, subclasses of `EmberComponent` and
 * `GlimmerComponent` are examples of `ComponentLike` values, as are
 * the values returned from the `{{component}}` helper.
 *
 * The `S` signature parameter here is of the same form as the one
 * accepted by both the Ember and Glimmer `Component` base classes.
 */
export type ComponentLike<S = unknown> = Invokable<
  (
    ...args: InvokableArgs<ComponentSignatureArgs<S>>
  ) => ComponentReturn<
    FlattenBlockParams<ComponentSignatureBlocks<S>>,
    ComponentSignatureElement<S>
  >
>;

/**
 * A value that is invokable like a helper in a template. Notably,
 * subclasses of `Helper` and the return value of `helper()` from
 * `@ember/component/helper` are both `HelperLike` in an appropriate
 * Glint environment.
 *
 * The `S` signature parameter here is of the same form as the one
 * accepted by `Helper` and `helper`.
 */
export type HelperLike<S = unknown> = Invokable<
  (...args: InvokableArgs<Get<S, 'Args'>>) => Get<S, 'Return', unknown>
>;

/**
 * A value that is invokable like a modifier in a template. Notably,
 * subclasses of `Modifier` and the return value of `modifier()` from
 * `ember-modifier` are both `ModifierLike` in an appropriate Glint
 * environment.
 *
 * The `S` signature parameter here is of the same form as the ones
 * accepted by `Modifier` and `modifier`.
 */
export type ModifierLike<S = unknown> = Invokable<
  (element: Get<S, 'Element'>, ...args: InvokableArgs<Get<S, 'Args'>>) => ModifierReturn
>;

/**
 * Given a `ComponentLike`, `HelperLike` or `ModifierLike` value
 * along with a union representing named args that have been
 * pre-bound, this helper returns the same item back, but with those
 * named arguments made optional.
 *
 * This is typically useful in conjunction with something like the
 * `{{component}}` helper; for instance, if you wrote this in a
 * template:
 *
 * ```handlebars
 * {{yield (component MyComponent message="Hello")}}
 * ```
 *
 * Consumers of that yielded value would be able to invoke the
 * component without having to provide a value for `@message`
 * themselves. You could represent this in your signature as:
 *
 * ```ts
 * Blocks: {
 *   default: [WithBoundArgs<typeof MyComponent, 'message'>];
 * };
 * ```
 *
 * If you had instead just written `default: [typeof MyComponent]`,
 * consumers would still be obligated to provide a `@message`
 * arg when invoking the yielded component.
 */
export type WithBoundArgs<T extends Invokable<AnyFunction>, BoundArgs extends NamedArgNames<T>> =
  T extends Invokable<(...args: [...positional: infer P, named: infer N]) => infer R>
    ? Invokable<
        (
          ...args: [
            ...positional: P,
            ...named: MaybeNamed<PrebindArgs<UnwrapNamedArgs<NonNullable<N>>, BoundArgs>>,
          ]
        ) => R
      >
    : never;

/**
 * Similar to `WithBoundArgs`, this utility type provides a shorthand
 * for specifying the type of a helper or modifier whose positional
 * argument(s) have been pre-bound.
 *
 * Given the type of the helper or modifier in question and the number
 * of positional arguments that have been pre-bound, this helper returns
 * the same item back, but without those leading positional arguments.
 *
 * For instance, given a helper `FooHelper` with positional arg types
 * `[secret: symbol, name: string, age: number]`, then if you wrote
 * the following in a template:
 *
 * ```handlebars
 * {{yield (helper FooHelper this.secret)}}
 * ```
 *
 * You could represent that in your signature as:
 *
 * ```ts
 * Blocks: {
 *   default: [WithBoundPositionals<typeof FooHelper, 1>];
 * };
 * ```
 *
 * Note that you can use `WithBoundPositionals` and `WithBoundArgs`
 * together if you're pre-binding both positional and named arguments
 * in the same location.
 */
export type WithBoundPositionals<
  T extends Invokable<AnyFunction> | AnyFunction,
  Count extends number,
> =
  T extends Invokable<(el: infer El, ...args: infer A) => ModifierReturn>
    ? Invokable<(el: El, ...args: SliceFrom<A, Count>) => ModifierReturn>
    : T extends Invokable<(...args: infer A) => infer R>
      ? Invokable<(...args: SliceFrom<A, Count>) => R>
      : T extends (...args: infer A) => infer R
        ? Invokable<(...args: SliceFrom<A, Count>) => R>
        : never;

export {};
