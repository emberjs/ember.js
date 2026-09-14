import { expectTypeOf } from 'expect-type';
import { emitComponent, resolve } from '../../-private/dsl';
import { WithKeyword } from '../../-private/keywords';

const withKeyword = resolve({} as WithKeyword);

// Yields out the given value
{
  const component = emitComponent(withKeyword('hello'));

  {
    const [str] = component.blockParams.default;
    expectTypeOf(str).toEqualTypeOf<string>();
  }

  {
    component.blockParams.else;
  }
}

withKeyword(
  'hello',
  // @ts-expect-error: Rejects multiple values
  'goodbye',
);
