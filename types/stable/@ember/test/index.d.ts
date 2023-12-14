declare module '@ember/test' {
  import type * as EmberTesting from 'ember-testing';
  export let registerAsyncHelper: (typeof EmberTesting.Test)['registerAsyncHelper'];
  export let registerHelper: (typeof EmberTesting.Test)['registerHelper'];
  export let registerWaiter: (typeof EmberTesting.Test)['registerWaiter'];
  export let unregisterHelper: (typeof EmberTesting.Test)['unregisterHelper'];
  export let unregisterWaiter: (typeof EmberTesting.Test)['unregisterWaiter'];
  export let _impl: typeof EmberTesting | undefined;
  export function registerTestImplementaiton(impl: typeof EmberTesting): void;
}
