QUnit.module('ESNext Decorators', function() {
  QUnit.test('are transpiled and work properly', function(assert) {
    assert.expect(5);

    function prototypeProp(elementDescriptor) {
      assert.strictEqual(elementDescriptor.kind, 'field');
      assert.strictEqual(elementDescriptor.key, 'x');
      assert.strictEqual(elementDescriptor.placement, 'own');
      assert.deepEqual(elementDescriptor.descriptor, {
        configurable: true,
        enumerable: true,
        writable: true,
      });
      assert.strictEqual(elementDescriptor.initializer(), 1);
    }

    class Demo {
      @prototypeProp
      x = 1;
    }

    // instantiate the class to apply the decorator
    new Demo();
  });
});
