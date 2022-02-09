import Application from '@ember/application';
import ApplicationInstance, { BootOptions } from '@ember/application/instance';
import EngineInstance from '@ember/engine/instance';
import EmberObject from '@ember/object';

import { expectTypeOf } from 'expect-type';

const app = new Application();
const instance = app.buildInstance();

expectTypeOf(instance).toEqualTypeOf<ApplicationInstance>();
expectTypeOf(instance).toMatchTypeOf<EngineInstance>();
expectTypeOf(instance).toMatchTypeOf<EmberObject>();

declare class Store extends EmberObject {}

expectTypeOf(instance.register('service:store', Store)).toEqualTypeOf<void>();
expectTypeOf(
  instance.register('service:store-singleton', Store, { singleton: true, instantiate: true })
).toEqualTypeOf<void>();

expectTypeOf(instance.lookup('service:store')).toEqualTypeOf<unknown>();
expectTypeOf(
  instance.lookup('service:store', { singleton: true, instantiate: true })
).toEqualTypeOf<unknown>();

expectTypeOf(instance.hasRegistration('service:store')).toEqualTypeOf<boolean>();
// @ts-expect-error requires name
instance.hasRegistration();

expectTypeOf(instance.boot()).toEqualTypeOf<void>();

const bootOptions = new BootOptions({
  isBrowser: true,
  shouldRender: false,
  document: window.document,
  rootElement: '#ember-application',
  location: 'history',
});

expectTypeOf(bootOptions.isBrowser).toEqualTypeOf<boolean>();
expectTypeOf(bootOptions.shouldRender).toEqualTypeOf<boolean>();
expectTypeOf(bootOptions.document).toEqualTypeOf<Document | null>();
expectTypeOf(bootOptions.rootElement).toEqualTypeOf<string | Element | null>();
expectTypeOf(bootOptions.location).toEqualTypeOf<string | null>();

new BootOptions({
  // @ts-expect-error Incorrect type
  isBrowser: 1,
  // @ts-expect-error Incorrect type
  shouldRender: 1,
  // @ts-expect-error Incorrect type
  document: window,
  // @ts-expect-error Incorrect type
  rootElement: 1,
  // @ts-expect-error Incorrect type
  location: 1,
});

new BootOptions({
  rootElement: window.document.createElement('div'),
});

new BootOptions();
