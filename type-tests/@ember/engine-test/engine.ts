import Engine from '@ember/engine';
import EmberObject from '@ember/object';

class BaseEngine extends Engine {
  modulePrefix = 'my-engine';
}

class Obj extends EmberObject {
  foo = 'bar';
}

BaseEngine.initializer({
  name: 'my-initializer',
  initialize(engine) {
    engine.register('foo:bar', Obj);
  },
});

BaseEngine.instanceInitializer({
  name: 'my-instance-initializer',
  initialize(engine) {
    (engine.lookup('foo:bar') as Obj).get('foo');
  },
});

class Engine1 extends BaseEngine {
  rootElement = '#engine-one';
  customEvents = {
    paste: 'paste',
  };
}

class Engine2 extends BaseEngine {
  rootElement = '#engine-two';
  customEvents = {
    mouseenter: null,
    mouseleave: null,
  };
}

const Engine3 = BaseEngine.create();

const Engine3Instance1 = Engine3.buildInstance();

// @ts-expect-error
const Engine3Instance2 = Engine3.buildInstance({ foo: 'bar' });

const Engine3Instance3 = Engine3.buildInstance({ mountPoint: 'somewhere', routable: true });
