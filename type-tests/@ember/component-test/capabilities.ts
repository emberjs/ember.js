import { capabilities } from '@ember/component';
import { expectTypeOf } from 'expect-type';

expectTypeOf(capabilities('3.13')).toMatchTypeOf<{
  asyncLifecycleCallbacks?: boolean | undefined;
  destructor?: boolean | undefined;
  updateHook?: boolean | undefined;
}>();

capabilities('3.13', { asyncLifecycleCallbacks: true });
capabilities('3.4', { asyncLifecycleCallbacks: true });

// @ts-expect-error invalid capabilities
capabilities('3.13', { asyncLifecycleCallbacks: 1 });
// @ts-expect-error invalid verison
capabilities('3.12');
