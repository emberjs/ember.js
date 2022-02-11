import { Owner } from '@ember/-internals/owner';
import EngineInstance from '@ember/engine/instance';
import EmberObject from '@ember/object';
import { expectTypeOf } from 'expect-type';

expectTypeOf<EngineInstance>().toMatchTypeOf<EmberObject>();
expectTypeOf<EngineInstance>().toMatchTypeOf<Owner>();

// Good enough for tests
let owner = {} as Owner;
let instance = new EngineInstance(owner);

expectTypeOf(instance.boot()).toEqualTypeOf<void>();

expectTypeOf(instance.boot()).toEqualTypeOf<void>();

let bootOptions = {
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
