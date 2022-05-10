import type { Factory, Owner } from '@ember/-internals/owner';
import Application from '@ember/application';
import type { BootOptions } from '@ember/application/instance';
import type ApplicationInstance from '@ember/application/instance';
import type EngineInstance from '@ember/engine/instance';
import EmberObject from '@ember/object';

import { expectTypeOf } from 'expect-type';

// Good enough for tests
let owner = {} as Owner;

const app = new Application(owner);
const instance = app.buildInstance();

expectTypeOf(instance).toEqualTypeOf<ApplicationInstance>();
expectTypeOf(instance).toMatchTypeOf<EngineInstance>();
expectTypeOf(instance).toMatchTypeOf<EmberObject>();

declare class Store extends EmberObject {}

expectTypeOf(instance.register('service:store', Store)).toEqualTypeOf<void>();
expectTypeOf(
  instance.register('service:store-singleton', Store, { singleton: true, instantiate: true })
).toEqualTypeOf<void>();

expectTypeOf(instance.lookup('service:store')).toEqualTypeOf<
  Factory<object> | object | undefined
>();
expectTypeOf(
  instance.lookup('service:store', { singleton: true, instantiate: true })
).toEqualTypeOf<object | Factory<object> | undefined>();

expectTypeOf(instance.hasRegistration('service:store')).toEqualTypeOf<boolean>();
// @ts-expect-error requires name
instance.hasRegistration();

expectTypeOf(instance.boot()).resolves.toEqualTypeOf<ApplicationInstance>();

const bootOptions: BootOptions = {
  isBrowser: true,
  shouldRender: false,
  document: window.document,
  rootElement: '#ember-application',
  location: 'history',
};

instance.boot(bootOptions);

instance.boot({ isBrowser: true });

// @ts-expect-error Incorrect type
instance.boot({ isBrowser: 1 });
// @ts-expect-error Incorrect type
instance.boot({ shouldRender: 1 });
// @ts-expect-error Incorrect type
instance.boot({ document: window });
// @ts-expect-error Incorrect type
instance.boot({ rootElement: 1 });
// @ts-expect-error Incorrect type
instance.boot({ location: 1 });
