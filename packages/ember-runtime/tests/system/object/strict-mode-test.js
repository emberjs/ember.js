import EmberObject from '../../../system/object';

QUnit.module('strict mode tests');

QUnit.test('__superWrapper does not throw errors in strict mode', function() {
  let Foo = EmberObject.extend({
    blah() {
      return 'foo';
    }
  });

  let Bar = Foo.extend({
    blah() {
      return 'bar';
    },

    callBlah() {
      let blah = this.blah;

      return blah();
    }
  });

  let bar = Bar.create();

  equal(bar.callBlah(), 'bar', 'can call local function without call/apply');
});
