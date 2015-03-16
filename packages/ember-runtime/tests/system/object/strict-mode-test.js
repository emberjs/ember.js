import EmberObject from "ember-runtime/system/object";

QUnit.module('strict mode tests');

QUnit.test('__superWrapper does not throw errors in strict mode', function() {
  var Foo = EmberObject.extend({
    blah() {
      return 'foo';
    }
  });

  var Bar = Foo.extend({
    blah() {
      return 'bar';
    },

    callBlah() {
      var blah = this.blah;

      return blah();
    }
  });

  var bar = Bar.create();

  equal(bar.callBlah(), 'bar', 'can call local function without call/apply');
});
