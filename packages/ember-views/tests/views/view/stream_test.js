import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";

var view;

QUnit.module("ember-views: streams", {
  teardown() {
    if (view) {
      run(view, 'destroy');
    }
  }
});

QUnit.test("can return a stream that is notified of changes", function() {
  expect(2);

  view = EmberView.create({
    controller: {
      name: 'Robert'
    }
  });

  var stream = view.getStream('name');

  equal(stream.value(), 'Robert', 'initial value is correct');

  stream.subscribe(function() {
    equal(stream.value(), 'Max', 'value is updated');
  });

  run(view, 'set', 'controller.name', 'Max');
});

QUnit.test("a single stream is used for the same path", function() {
  expect(2);

  var stream1, stream2;

  view = EmberView.create({
    controller: {
      name: 'Robert'
    }
  });

  stream1 = view.getStream('name');
  stream2 = view.getStream('name');

  equal(stream1, stream2, 'streams for the same path should be the same object');

  stream1 = view.getStream('');
  stream2 = view.getStream('this');

  equal(stream1, stream2, 'streams "" and "this"  should be the same object');
});

QUnit.test("the stream returned is labeled with the requested path", function() {
  expect(2);
  var stream;

  view = EmberView.create({
    controller: {
      name: 'Robert'
    },

    foo: 'bar'
  });

  stream = view.getStream('name');

  equal(stream._label, 'name', 'stream is labeled');

  stream = view.getStream('view.foo');

  equal(stream._label, 'view.foo', 'stream is labeled');
});
