import Stream from 'ember-metal/streams/stream';
import {
  concat,
  read
} from 'ember-metal/streams/utils';


function hasSubscribers(stream) {
  // this uses the private internal property `subscriberHead`
  // for the purposes of ensuring that subscription is cleared
  // after deactivation.  Adding a util helper to the `Stream` code
  // just for the test seems dubious, as does accessing the private
  // property directly in the test.
  return stream && !!stream.subscriberHead;
}

QUnit.module('Stream - concat');

QUnit.test('returns string if no streams were in the array', function(assert) {
  let result = concat(['foo', 'bar', 'baz'], ' ');

  assert.equal(result, 'foo bar baz');
});

QUnit.test('returns a stream if a stream is in the array', function(assert) {
  let stream = new Stream(function() {
    return 'bar';
  });
  let result = concat(['foo', stream, 'baz'], ' ');

  assert.ok(result.isStream, 'a stream is returned');
  assert.equal(read(result), 'foo bar baz');
});

QUnit.test('returns updated value upon input dirtied', function(assert) {
  let value = 'bar';
  let stream = new Stream(function() {
    return value;
  });
  let result = concat(['foo', stream, 'baz'], ' ');
  result.activate();

  assert.equal(read(result), 'foo bar baz');

  value = 'qux';
  stream.notify();

  assert.equal(read(result), 'foo qux baz');
});

QUnit.test('removes dependencies when unsubscribeDependencies is called', function(assert) {
  let stream = new Stream(function() {
    return 'bar';
  });
  let result = concat(['foo', stream, 'baz'], ' ');
  result.activate();

  assert.equal(hasSubscribers(stream), true, 'subscribers are present from the concat stream');

  result.maybeDeactivate();

  assert.equal(hasSubscribers(stream), false, 'subscribers are removed after concat stream is deactivated');
});
