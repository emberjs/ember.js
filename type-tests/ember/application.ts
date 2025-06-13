import EmberObject from '@ember/object';
import Ember from 'ember';

class BaseApp extends Ember.Application {
  modulePrefix = 'my-app';
}

class Obj extends EmberObject {
  foo = 'bar';
}

BaseApp.initializer({
  name: 'my-initializer',
  initialize(app) {
    app.register('foo:bar', Obj);
  },
});

BaseApp.instanceInitializer({
  name: 'my-instance-initializer',
  initialize(app) {
    (app.lookup('foo:bar') as Obj).foo;
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

const App3Instance1 = App3.buildInstance();

// @ts-expect-error
const App3Instance2 = App3.buildInstance({ foo: 'bar' });

const App3Instance3 = App3.buildInstance({ mountPoint: 'somewhere', routable: true });
