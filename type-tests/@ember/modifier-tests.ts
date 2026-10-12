import {
  setModifierManager,
  capabilities,
  on,
  type OnModifier,
  type ModifierCapabilities,
} from '@ember/modifier';
import { type ModifierManager } from '@glimmer/interfaces';
import { expectTypeOf } from 'expect-type';

expectTypeOf(on).toEqualTypeOf<OnModifier>();

declare let manager: ModifierManager<unknown>;
expectTypeOf(setModifierManager((_owner) => manager, {})).toEqualTypeOf<{}>();
expectTypeOf(capabilities('3.22')).toEqualTypeOf<ModifierCapabilities>();

type ModifierManagerFromFactory = ReturnType<Parameters<typeof setModifierManager>[0]>;
expectTypeOf<ModifierManagerFromFactory['capabilities']>().not.toBeAny();
expectTypeOf<Parameters<ModifierManagerFromFactory['installModifier']>[2]>().not.toBeAny();
