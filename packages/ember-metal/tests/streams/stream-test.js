import { Stream } from 'ember-metal/streams/stream';
import ObjectProxy from 'ember-runtime/system/object_proxy';
import { get } from 'ember-metal/property_get';

var stream, value, count;

function incrementCount() {
  count++;
}

QUnit.module('Stream - Proxy compatibility', {
  setup() {
    count = 0;
    value = 'zlurp';

    stream = new Stream(function() {
      return value;
    });
  },
  teardown() {
    value = undefined;
    stream = undefined;
  }
});

QUnit.test('is notified when a proxy\'s content changes', function() {
  stream.subscribe(incrementCount);
  stream.value();

  value = ObjectProxy.create({
    content: { message: 'foo' }
  });

  equal(count, 0);

  stream.notify();

  equal(count, 1);
  equal(get(stream.value(), 'message'), 'foo');

  value.set('content', { message: 'bar' });

  equal(count, 2);
  equal(get(stream.value(), 'message'), 'bar');
});
