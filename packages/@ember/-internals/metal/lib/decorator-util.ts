/*
  Types and utilities for working with 2023-11 decorators -- the ones that are
  currently (as of 2025-05-05) in Stage 3.

  TypeScript provides built-in types for all the Context objects, but not a way
  to do type discrimination against the `value` argument.
*/

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
