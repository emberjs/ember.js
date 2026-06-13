import { expectTypeOf } from 'expect-type';
import { emitComponent, NamedArgsMarker, resolve, resolveForBind } from '../../-private/dsl';
import { ComponentKeyword } from '../../-private/keywords';
import TestComponent from '../test-component';

const componentKeyword = resolve({} as ComponentKeyword);

class WithElement extends TestComponent<{
  Element: HTMLElement;
}> {}

// https://www.typescriptlang.org/play/?#code/JYWwDg9gTgLgBAbzgUwB5mQYxgFQJ4YDyAZnAL5zFQQhwDkaG2AtDAcnQNwBQ3jWudiQA8ACRwBZADIBRADbIQyAHYwAfAAoAlADoYEGahgqAJmMlSAIsABu8xSvXae-bPiLFz063YVLVmrr6hsbKZuLS9v5OWpxAA
expectTypeOf<HTMLDivElement>().toExtend<HTMLElement>();

const ElementType = emitComponent(resolve(WithElement)()).element;
expectTypeOf<HTMLDivElement>().toExtend<typeof ElementType>();

class StringComponent extends TestComponent<{
  Args: { value: string };
  Blocks: { default: [string] };
}> {}

const NoopCurriedStringComponent = componentKeyword(resolveForBind(StringComponent));
const ValueCurriedStringComponent = componentKeyword(resolveForBind(StringComponent), {
  value: 'hello',
  ...NamedArgsMarker,
});

// Invoking the noop-curried component
emitComponent(resolve(NoopCurriedStringComponent)({ value: 'hello', ...NamedArgsMarker }));

resolve(NoopCurriedStringComponent)(
  // @ts-expect-error: Invoking the curried component but forgetting `value`
  { ...NamedArgsMarker },
);

resolve(NoopCurriedStringComponent)({
  // @ts-expect-error: Invoking the curried component with an invalid value
  value: 123,
  ...NamedArgsMarker,
});

// Invoking the noop-curried component with a valid block
{
  const component = emitComponent(
    resolve(NoopCurriedStringComponent)({ value: 'hello', ...NamedArgsMarker }),
  );

  {
    const [...args] = component.blockParams.default;
    expectTypeOf(args).toEqualTypeOf<[string]>();
  }
}

// Invoking the noop-curried component with an invalid block
{
  const component = emitComponent(
    resolve(NoopCurriedStringComponent)({ value: 'hello', ...NamedArgsMarker }),
  );

  {
    // @ts-expect-error: invalid block name
    component.blockParams.asdf;
  }
}

// Invoking the curried-with-value component with no value
emitComponent(resolve(ValueCurriedStringComponent)({ ...NamedArgsMarker }));

// Invoking the curried-with-value component with a valid value
emitComponent(resolve(ValueCurriedStringComponent)({ value: 'hi', ...NamedArgsMarker }));

emitComponent(
  resolve(ValueCurriedStringComponent)({
    // @ts-expect-error: Invoking the curred-with-value component with an invalid value
    value: 123,
    ...NamedArgsMarker,
  }),
);

componentKeyword(
  resolveForBind(StringComponent),
  // @ts-expect-error: Attempting to curry an arg with the wrong type
  { value: 123, ...NamedArgsMarker },
);

class ParametricComponent<T> extends TestComponent<{
  Args: { values: Array<T>; optional?: string };
  Blocks: { default?: [T, number] };
}> {}

const NoopCurriedParametricComponent = componentKeyword(resolveForBind(ParametricComponent));

// The only way to fix a type parameter as part of using the component keyword is to
// say ahead of time the type you're trying to bind it as.
const BoundParametricComponent = ParametricComponent<string>;

const RequiredValueCurriedParametricComponent = componentKeyword(
  resolveForBind(BoundParametricComponent),
  {
    values: ['hello'],
    ...NamedArgsMarker,
  },
);

const OptionalValueCurriedParametricComponent = componentKeyword(
  resolveForBind(ParametricComponent),
  {
    optional: 'hi',
    ...NamedArgsMarker,
  },
);

// Invoking the noop-curried component with number values
{
  const component = emitComponent(
    resolve(NoopCurriedParametricComponent)({ values: [1, 2, 3], ...NamedArgsMarker }),
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

// Invoking the noop-curried component with string values
{
  const component = emitComponent(
    resolve(NoopCurriedParametricComponent)({ values: ['hello'], ...NamedArgsMarker }),
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

emitComponent(
  resolve(NoopCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    { ...NamedArgsMarker },
  ),
);

emitComponent(
  resolve(NoopCurriedParametricComponent)({
    // @ts-expect-error: wrong type for `values`
    values: 'hello',
    ...NamedArgsMarker,
  }),
);

emitComponent(
  resolve(NoopCurriedParametricComponent)({
    values: [1, 2, 3],
    // @ts-expect-error: extra arg
    extra: 'uh oh',
    ...NamedArgsMarker,
  }),
);

// Invoking the curred component with no additional args
{
  /** hello {@link RequiredValueCurriedParametricComponent} */
  const component = emitComponent(
    resolve(RequiredValueCurriedParametricComponent)({ ...NamedArgsMarker }),
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Invoking the curred component and overriding the given arg
{
  const component = emitComponent(
    resolve(RequiredValueCurriedParametricComponent)({ values: ['ok'], ...NamedArgsMarker }),
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

emitComponent(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: wrong type for arg override
    values: [1, 2, 3],
    ...NamedArgsMarker,
  }),
);

emitComponent(
  resolve(RequiredValueCurriedParametricComponent)({
    // @ts-expect-error: extra arg
    extra: 'bad',
    ...NamedArgsMarker,
  }),
);

// Invoking the curried component, supplying missing required args
{
  const component = emitComponent(
    resolve(OptionalValueCurriedParametricComponent)({ values: [1, 2, 3], ...NamedArgsMarker }),
  );

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<number>();
  }
}

emitComponent(
  resolve(OptionalValueCurriedParametricComponent)(
    // @ts-expect-error: missing required arg `values`
    { ...NamedArgsMarker },
  ),
);

// {{component (component BoundParametricComponent values=(array "hello")) optional="hi"}}
const DoubleCurriedComponent = componentKeyword(
  resolveForBind(RequiredValueCurriedParametricComponent),
  {
    optional: 'hi',
    ...NamedArgsMarker,
  },
);

// Invoking the component with no args
{
  const component = emitComponent(resolve(DoubleCurriedComponent)({ ...NamedArgsMarker }));

  {
    const [value] = component.blockParams.default;
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// Invoking the component overriding an arg correctly
emitComponent(resolve(DoubleCurriedComponent)({ values: ['a', 'b'], ...NamedArgsMarker }));

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: invalid arg override
    values: [1, 2, 3],
    ...NamedArgsMarker,
  }),
);

emitComponent(
  resolve(DoubleCurriedComponent)({
    // @ts-expect-error: unexpected args
    foo: 'bar',
    ...NamedArgsMarker,
  }),
);
