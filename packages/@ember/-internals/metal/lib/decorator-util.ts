/*
  Types and utilities for working with 2023-11 decorators -- the ones that are
  currently (as of 2025-05-05) in Stage 3.

  TypeScript provides built-in types for all the Context objects, but not a way
  to do type discrimination against the `value` argument.
*/

import { assert } from '@ember/debug';

export type ClassMethodDecorator = (
  value: Function,
  context: ClassMethodDecoratorContext
) => Function | void;

export type ClassGetterDecorator = (
  value: Function,
  context: ClassGetterDecoratorContext
) => Function | void;

export type ClassSetterDecorator = (
  value: Function,
  context: ClassSetterDecoratorContext
) => Function | void;

export type ClassFieldDecorator = (
  value: undefined,
  context: ClassFieldDecoratorContext
) => (initialValue: unknown) => unknown | void;

export type ClassDecorator = (value: Function, context: ClassDecoratorContext) => Function | void;

export type ClassAutoAccessorDecorator = (
  value: ClassAccessorDecoratorTarget<unknown, unknown>,
  context: ClassAccessorDecoratorContext
) => ClassAccessorDecoratorResult<unknown, unknown>;

export type Decorator =
  | ClassMethodDecorator
  | ClassGetterDecorator
  | ClassSetterDecorator
  | ClassFieldDecorator
  | ClassDecorator
  | ClassAutoAccessorDecorator;

/*
  Public-facing signatures for Ember's decorators as TypeScript sees them when
  `experimentalDecorators` is off (standard, stage 3 decorators). Our public
  decorator types include these alongside their legacy signatures, so that
  they type check under either mode.

  These all return `void` because, from the caller's point of view, we never
  replace the decorated element (any replacement is an implementation detail).
*/
export type StandardFieldDecorator = (
  value: undefined,
  context: ClassFieldDecoratorContext<any, any>
) => void;

export type StandardAccessorDecorator = <This, Value>(
  value: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
) => void;

export type StandardGetterDecorator = (
  value: (this: any) => any,
  context: ClassGetterDecoratorContext<any, any>
) => void;

export type StandardSetterDecorator = (
  value: (this: any, value: any) => void,
  context: ClassSetterDecoratorContext<any, any>
) => void;

export type StandardMethodDecorator = (
  value: (this: any, ...args: any[]) => any,
  context: ClassMethodDecoratorContext<any, any>
) => void;

/**
  A decorator for class fields, which works with both legacy
  (`experimentalDecorators`) and standard decorators.
*/
export type FieldDecorator = PropertyDecorator & StandardFieldDecorator;

/**
  The decorator returned by `service()`, `inject()`, etc. Works on fields with
  both legacy and standard decorators, and on auto-accessors with standard
  decorators.
*/
export type InjectionDecorator = FieldDecorator & StandardAccessorDecorator;

export function isModernDecoratorArgs(args: unknown[]): args is Parameters<Decorator> {
  return args.length === 2 && typeof args[1] === 'object' && args[1] != null && 'kind' in args[1];
}

// this is designed to turn the arguments into a discriminated union so you can
// check the kind once and then have the right types for them.
export function identifyModernDecoratorArgs(args: Parameters<Decorator>):
  | {
      kind: 'method';
      value: Parameters<ClassMethodDecorator>[0];
      context: Parameters<ClassMethodDecorator>[1];
    }
  | {
      kind: 'getter';
      value: Parameters<ClassGetterDecorator>[0];
      context: Parameters<ClassGetterDecorator>[1];
    }
  | {
      kind: 'setter';
      value: Parameters<ClassSetterDecorator>[0];
      context: Parameters<ClassSetterDecorator>[1];
    }
  | {
      kind: 'field';
      value: Parameters<ClassFieldDecorator>[0];
      context: Parameters<ClassFieldDecorator>[1];
    }
  | {
      kind: 'class';
      value: Parameters<ClassDecorator>[0];
      context: Parameters<ClassDecorator>[1];
    }
  | {
      kind: 'accessor';
      value: Parameters<ClassAutoAccessorDecorator>[0];
      context: Parameters<ClassAutoAccessorDecorator>[1];
    } {
  return {
    kind: args[1].kind,
    value: args[0],
    context: args[1],
  } as ReturnType<typeof identifyModernDecoratorArgs>;
}

/*
  Stage 3 decorators on non-static class elements never see the class or its
  prototype: their `addInitializer` callbacks only run once per instance, at
  construction. But much of Ember's decorator machinery (computed property
  setup, `metaForProperty`, injection validation, etc) needs to happen once per
  class, against the prototype, and must be available before any instance
  exists.

  So we queue that per-class work on the decorator metadata object, which ends
  up as `Class[Symbol.metadata]`, and flush it the first time we encounter the
  class: either when Ember inspects it (see `CoreObject.proto()`) or when an
  instance is constructed.

  This relies on `Symbol.metadata`, which browsers don't implement yet. Babel's
  decorator helpers fall back to `Symbol.for('Symbol.metadata')` when it's
  missing, but TypeScript's emit skips decorator metadata entirely unless
  `Symbol.metadata` exists, so apps using TypeScript's emit must polyfill it
  themselves. We look it up lazily, so we use whatever the app installed.
*/
function metadataKey(): symbol {
  return (Symbol as unknown as { metadata?: symbol }).metadata ?? Symbol.for('Symbol.metadata');
}

const pendingClassSetups = new WeakMap<object, Array<(proto: object) => void>>();
const finalizedClasses = new WeakSet<object>();

interface DecoratorContextWithMetadata {
  readonly name: string | symbol;
  readonly static?: boolean;
  readonly metadata: DecoratorMetadataObject;
  addInitializer(initializer: (this: any) => void): void;
}

export function onClassFinalized(
  context: DecoratorContextWithMetadata,
  setup: (target: object) => void
): void {
  if (context.static) {
    // Static initializers run once, at class definition, with the class itself
    // as `this`, which is exactly the target we need.
    context.addInitializer(function (this: object) {
      setup(this);
    });
    return;
  }

  assert(
    `Ember's decorators need decorator metadata, but ${String(context.name)} has none. If you're compiling with TypeScript's decorator emit, you need to polyfill \`Symbol.metadata\` before any classes are defined, for example with \`Symbol.metadata ??= Symbol('Symbol.metadata')\`.`,
    context.metadata
  );

  let pending = pendingClassSetups.get(context.metadata);
  if (!pending) {
    pending = [];
    pendingClassSetups.set(context.metadata, pending);
  }
  pending.push(setup);
  context.addInitializer(function (this: object) {
    finalizeDecoratedClass(this.constructor);
  });
}

// Runs any pending per-class decorator setup for `klass` and its superclasses,
// superclasses first.
export function finalizeDecoratedClass(klass: Function): void {
  if (finalizedClasses.has(klass)) {
    return;
  }

  let key = metadataKey();
  let chain: Function[] = [];
  for (
    let current: Function | null = klass;
    current && current !== Function.prototype && !finalizedClasses.has(current);
    current = Object.getPrototypeOf(current)
  ) {
    chain.unshift(current);
  }

  for (let current of chain) {
    finalizedClasses.add(current);
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      continue;
    }
    let metadata = (current as unknown as Record<symbol, object>)[key]!;
    let pending = pendingClassSetups.get(metadata);
    if (pending) {
      pendingClassSetups.delete(metadata);
      for (let setup of pending) {
        setup(current.prototype);
      }
    }
  }
}
