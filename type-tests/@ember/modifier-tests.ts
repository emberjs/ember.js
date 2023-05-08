import {
  setModifierManager,
  capabilities,
  on,
  type OnModifier,
  type ModifierCapabilities,
} from '@ember/modifier';
import { ModifierManager } from '@glimmer/interfaces';
import { expectTypeOf } from 'expect-type';

expectTypeOf(on).toEqualTypeOf<OnModifier>();

declare let manager: ModifierManager<unknown>;
expectTypeOf(setModifierManager((_owner) => manager, {})).toEqualTypeOf<{}>();
expectTypeOf(capabilities('3.22')).toEqualTypeOf<ModifierCapabilities>();
