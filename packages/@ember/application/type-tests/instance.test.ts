import type EngineInstance from '@ember/engine/instance';
import type { BootOptions } from '@ember/engine/instance';
import Application from '@ember/application';
import type ApplicationInstance from '@ember/application/instance';
import EmberObject from '@ember/object';
import type Owner from '@ember/owner';

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

// We do not have a registry entry, so we will not get back the `Store` class.
expectTypeOf(instance.lookup('service:store')).toEqualTypeOf<object | undefined>();
expectTypeOf(
  instance.lookup('service:store', { singleton: true, instantiate: true })
).toEqualTypeOf<object | undefined>();

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
