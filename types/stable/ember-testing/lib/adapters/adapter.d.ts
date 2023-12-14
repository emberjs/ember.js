declare module 'ember-testing/lib/adapters/adapter' {
  import EmberObject from '@ember/object';
  /**
     @module @ember/test
    */
  /**
      The primary purpose of this class is to create hooks that can be implemented
      by an adapter for various test frameworks.

      @class TestAdapter
      @public
    */
  interface Adapter extends EmberObject {
    asyncStart(): void;
    asyncEnd(): void;
    exception(error: unknown): never;
  }
  const Adapter: Readonly<typeof EmberObject> &
    (new (owner?: import('@ember/owner').default | undefined) => EmberObject) & {
      /**
          This callback will be called whenever an async operation is about to start.
      
          Override this to call your framework's methods that handle async
          operations.
      
          @public
          @method asyncStart
        */
      asyncStart(): void;
      /**
          This callback will be called whenever an async operation has completed.
      
          @public
          @method asyncEnd
        */
      asyncEnd(): void;
      /**
          Override this method with your testing framework's false assertion.
          This function is called whenever an exception occurs causing the testing
          promise to fail.
      
          QUnit example:
      
          ```javascript
            exception: function(error) {
              ok(false, error);
            };
          ```
      
          @public
          @method exception
          @param {String} error The exception to be raised.
        */
      exception(error: unknown): never;
    };
  export default Adapter;
}
