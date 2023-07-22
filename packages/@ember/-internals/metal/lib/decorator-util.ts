/*
  Types and utilities for working with 2023-05 decorators -- the ones that are
  currently (as of 2023-07-22) in Stage 3.
*/

export type ClassMethodDecorator = (
  value: Function,
  context: {
    kind: 'method';
    name: string | symbol;
    access: { get(): unknown };
    static: boolean;
    private: boolean;
    addInitializer(initializer: () => void): void;
  }
) => Function | void;

export type ClassGetterDecorator = (
  value: Function,
  context: {
    kind: 'getter';
    name: string | symbol;
    access: { get(): unknown };
    static: boolean;
    private: boolean;
    addInitializer(initializer: () => void): void;
  }
) => Function | void;

export type ClassSetterDecorator = (
  value: Function,
  context: {
    kind: 'setter';
    name: string | symbol;
    access: { set(value: unknown): void };
    static: boolean;
    private: boolean;
    addInitializer(initializer: () => void): void;
  }
) => Function | void;

export type ClassFieldDecorator = (
  value: undefined,
  context: {
    kind: 'field';
    name: string | symbol;
    access: { get(): unknown; set(value: unknown): void };
    static: boolean;
    private: boolean;
  }
) => (initialValue: unknown) => unknown | void;

export type ClassDecorator = (
  value: Function,
  context: {
    kind: 'class';
    name: string | undefined;
    addInitializer(initializer: () => void): void;
  }
) => Function | void;

export type ClassAutoAccessorDecorator = (
  value: {
    get(): unknown;
    set(value: unknown): void;
  },
  context: {
    kind: 'accessor';
    name: string | symbol;
    access: { get(): unknown; set(value: unknown): void };
    static: boolean;
    private: boolean;
    addInitializer(initializer: () => void): void;
  }
) => {
  get?: () => unknown;
  set?: (value: unknown) => void;
  init?: (initialValue: unknown) => unknown;
} | void;

// this is designed to turn the arguments into a discriminated union so you can
// check the kind once and then have the right types for them.
export function identify2023DecoratorArgs(args: unknown[]):
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
    }
  | undefined {
  if (args.length !== 2 || typeof args[1] !== 'object' || args[1] == null || !('kind' in args[1])) {
    return undefined;
  }

  return {
    kind: args[1].kind,
    value: args[0],
    context: args[1],
  } as ReturnType<typeof identify2023DecoratorArgs>;
}
