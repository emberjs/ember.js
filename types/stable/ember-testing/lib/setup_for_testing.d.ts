declare module 'ember-testing/lib/setup_for_testing' {
  /**
      Sets Ember up for testing. This is useful to perform
      basic setup steps in order to unit test.

      Use `App.setupForTesting` to perform integration tests (full
      application testing).

      @method setupForTesting
      @namespace Ember
      @since 1.5.0
      @private
    */
  export default function setupForTesting(): void;
}
