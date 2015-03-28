import EmberObject from "ember-runtime/system/object";

QUnit.module('strict mode tests');

QUnit.test('__superWrapper does not throw errors in strict mode', function() {
  var Foo = EmberObject.extend({
    blah: function() {
      return 'foo';
    }
  });

  var Bar = Foo.extend({
    blah: function() {
      return 'bar';
    },

    callBlah: function() {
      var blah = this.blah;

      return blah();
    }
  });

  var bar = Bar.create();

  equal(bar.callBlah(), 'bar', 'can call local function without call/apply');
});
