import Application from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import EmberObject from '@ember/object';
import { expectTypeOf } from 'expect-type';

const BaseApp = Application.extend({
  modulePrefix: 'my-app',
});

class Obj extends EmberObject.extend({ foo: 'bar' }) {}

BaseApp.initializer({
  name: 'my-initializer',
  initialize(app) {
    app.register('foo:bar', Obj);
  },
});

BaseApp.instanceInitializer({
  name: 'my-instance-initializer',
  initialize(app) {
    (app.lookup('foo:bar') as Obj).get('foo');
  },
});

const App1 = BaseApp.create({
  rootElement: '#app-one',
  customEvents: {
    paste: 'paste',
  },
});

const App2 = BaseApp.create({
  rootElement: '#app-two',
  customEvents: {
    mouseenter: null,
    mouseleave: null,
  },
});

const App3 = BaseApp.create();

expectTypeOf(App3.buildInstance()).toEqualTypeOf<ApplicationInstance>();
expectTypeOf(App3.buildInstance({})).toEqualTypeOf<ApplicationInstance>();
expectTypeOf(App3.buildInstance).parameter(0).toEqualTypeOf<
  | {
      mountPoint?: string;
      routable?: boolean;
    }
  | undefined
>();
