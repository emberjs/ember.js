import Stream from "ember-metal/streams/stream";
import SimpleBoundView from "ember-views/views/simple_bound_view";

QUnit.module('SimpleBoundView');

QUnit.test('does not render if update is triggered by normalizedValue is the same as the previous normalizedValue', function() {
  var value = null;
  var obj = { 'foo': 'bar' };
  var lazyValue = new Stream(function() {
    return obj.foo;
  });
  var morph = {
    setContent(newValue) {
      value = newValue;
    }
  };
  var view = new SimpleBoundView(null, null, morph, lazyValue);

  equal(value, null);

  view.update();

  equal(value, 'bar', 'expected call to morph.setContent with "bar"');
  value = null;

  view.update();

  equal(value, null, 'expected no call to morph.setContent');

  obj.foo = 'baz'; // change property
  lazyValue.notify();

  view.update();

  equal(value, 'baz', 'expected call to morph.setContent with "baz"');
});
