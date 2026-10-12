import { setComponentManager } from '@ember/component';
import { expectTypeOf } from 'expect-type';
type ComponentManager = ReturnType<Parameters<typeof setComponentManager>[0]>;
expectTypeOf<ComponentManager['capabilities']>().not.toBeAny();
expectTypeOf<Parameters<ComponentManager['createComponent']>[1]>().not.toBeAny();
