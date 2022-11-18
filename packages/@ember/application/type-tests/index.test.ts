import type { EventDispatcher } from '@ember/-internals/views';
import type Owner from '@ember/owner';
import Application, { getOwner, setOwner } from '@ember/application';
import type ApplicationInstance from '@ember/application/instance';

import { expectTypeOf } from 'expect-type';

declare let owner: Owner;

class App extends Application {
  rootElement = '#ember-application';
  customEvents = {
    mouseenter: null,
    paste: 'paste',
  };
  ready(): this {
    // I'm ready!
    return this;
  }
}

const app = new App(owner);

// You shouldn't really be setting this, so let's at least check that we can read it
expectTypeOf(app.eventDispatcher).toEqualTypeOf<EventDispatcher | null>();

expectTypeOf(app.buildInstance()).toEqualTypeOf<ApplicationInstance>();
expectTypeOf(app.deferReadiness()).toEqualTypeOf<void>();
expectTypeOf(app.advanceReadiness()).toEqualTypeOf<void>();
expectTypeOf(app.boot()).resolves.toEqualTypeOf<App>();
expectTypeOf(app.ready()).toEqualTypeOf<App>();
expectTypeOf(app.reset()).toEqualTypeOf<void>();

let bootOptions = {
  isBrowser: true,
  shouldRender: false,
  document: window.document,
  rootElement: '#ember-application',
  location: 'history',
};

app.visit('/my-app', bootOptions);

app.visit('/my-app', { isBrowser: true });

// @ts-expect-error Incorrect type
app.visit('/my-app', { isBrowser: 1 });
// @ts-expect-error Incorrect type
app.visit('/my-app', { shouldRender: 1 });
// @ts-expect-error Incorrect type
app.visit('/my-app', { document: window });
// @ts-expect-error Incorrect type
app.visit('/my-app', { rootElement: 1 });
// @ts-expect-error Incorrect type
app.visit('/my-app', { location: 1 });

class App2 extends Application {
  // @ts-expect-error Doesn't allow number
  rootElement = 1;
}

new App2(owner);

// getOwner and setOwner should work with explicit `owner` when imported here.
expectTypeOf(getOwner({})).toEqualTypeOf<Owner | undefined>();
expectTypeOf(setOwner({}, owner)).toEqualTypeOf<void>();

// `setOwner` should also work with `ApplicationInstance`s.
declare let appInstance: ApplicationInstance;
expectTypeOf(setOwner({}, appInstance)).toEqualTypeOf<void>();
