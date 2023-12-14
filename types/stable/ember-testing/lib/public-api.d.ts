declare module 'ember-testing/lib/public-api' {
  export { default as Test } from 'ember-testing/lib/test';
  export { default as Adapter } from 'ember-testing/lib/adapters/adapter';
  export { default as setupForTesting } from 'ember-testing/lib/setup_for_testing';
  export { default as QUnitAdapter } from 'ember-testing/lib/adapters/qunit';
  import 'ember-testing/lib/ext/application';
  import 'ember-testing/lib/ext/rsvp';
  import 'ember-testing/lib/helpers';
  import 'ember-testing/lib/initializers';
}
