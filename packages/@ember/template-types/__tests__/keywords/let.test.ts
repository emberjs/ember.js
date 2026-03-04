import { expectTypeOf } from 'expect-type';
import { emitComponent, resolve } from '../../-private/dsl';
import { LetKeyword } from '../../-private/keywords';

const letKeyword = resolve({} as LetKeyword);

// Yields out the given values
{
  const component = emitComponent(letKeyword('hello', 123));

  {
    const [str, num] = component.blockParams.default;
    expectTypeOf(str).toEqualTypeOf<string>();
    expectTypeOf(num).toEqualTypeOf<number>();
  }
}
