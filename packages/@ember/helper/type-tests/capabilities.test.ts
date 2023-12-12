import { capabilities } from '@ember/helper';
import { expectTypeOf } from 'expect-type';

expectTypeOf(capabilities('3.23')).toMatchTypeOf<{
  hasValue: boolean;
  hasDestroyable: boolean;
  hasScheduledEffect: boolean;
}>();

capabilities('3.23', { hasValue: true });
// @ts-expect-error invalid capabilities
capabilities('3.23', { hasValue: 1 });
// @ts-expect-error invalid verison
capabilities('3.22');
