/*
  Build-level replacement for the test Adapter in variants without the
  classic object model. It deliberately does not extend the modern
  FrameworkObject: test framework integrations (notably ember-qunit) subclass
  the adapter with `Adapter.extend({ init() { ... } })` and override `init`
  without calling super, so this class carries its own minimal classic-shaped
  `extend`/`create` protocol instead of inheriting the framework-object
  contract.
*/
class Adapter {
  static extend(...bags: object[]): typeof Adapter {
    class Subclass extends this {}
    for (let bag of bags) {
      Object.assign(Subclass.prototype, bag);
    }
    return Subclass;
  }

  static create(props?: object): Adapter {
    let instance = new this();
    if (props !== undefined) {
      Object.assign(instance, props);
    }
    instance.init();
    return instance;
  }

  init() {}

  /**
    This callback will be called whenever an async operation is about to start.
  */
  asyncStart() {}

  /**
    This callback will be called whenever an async operation has completed.
  */
  asyncEnd() {}

  /**
    Override this method with your testing framework's false assertion.
    This function is called whenever an exception occurs causing the testing
    promise to fail.
  */
  exception(error: unknown) {
    throw error;
  }

  destroy() {}
}

export default Adapter;
