import { EventDispatcher } from '@ember/-internals/views';
import Application, { getOwner, setOwner } from '@ember/application';
import ApplicationInstance, { BootOptions } from '@ember/application/instance';
import EngineInstance from '@ember/engine/instance';

import { expectTypeOf } from 'expect-type';

class App extends Application {
  rootElement = '#ember-application';
  customEvents = {
    mouseenter: null,
    paste: 'paste',
  };
  ready() {
    // I'm ready!
  }
}

const app = new App();

// You shouldn't really be setting this, so let's at least check that we can read it
expectTypeOf(app.eventDispatcher).toEqualTypeOf<EventDispatcher>();

expectTypeOf(app.buildInstance()).toEqualTypeOf<ApplicationInstance>();
expectTypeOf(app.deferReadiness()).toEqualTypeOf<void>();
expectTypeOf(app.advanceReadiness()).toEqualTypeOf<void>();
expectTypeOf(app.boot()).toEqualTypeOf<void>();
expectTypeOf(app.ready()).toEqualTypeOf<void>();
expectTypeOf(app.reset()).toEqualTypeOf<void>();
expectTypeOf(app.visit('/my-app', new BootOptions())).toEqualTypeOf<Promise<ApplicationInstance>>();

class App2 extends Application {
  // @ts-expect-error Doesn't allow number
  rootElement = 1;
}

new App2();

expectTypeOf(getOwner('foo')).toEqualTypeOf<EngineInstance | undefined>();

expectTypeOf(setOwner('foo', {} as EngineInstance)).toEqualTypeOf<void>();
