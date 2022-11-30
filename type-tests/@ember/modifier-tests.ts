import { setModifierManager, capabilities, on, OnModifier } from '@ember/modifier';
import { expectTypeOf } from 'expect-type';

expectTypeOf(on).toEqualTypeOf<OnModifier>();
expectTypeOf(setModifierManager((_owner) => {}, {})).toEqualTypeOf<{}>();
expectTypeOf(capabilities('3.24')).toBeUnknown();
