import BasicStream from 'ember-metal/streams/stream';
import ProxyStream from 'ember-metal/streams/proxy-stream';

var source;

QUnit.module('ProxyStream', {
  setup() {
    let Source = BasicStream.extend({
      init(val) {
        this.val = val;
      },

      compute() {
        return this.val;
      },

      setValue(value) {
        this.val = value;
        this.notify();
      }
    });

    source = new Source('zlurp');
  },
  teardown() {
    source = undefined;
  }
});

QUnit.test('supports a stream argument', function() {
  var stream = new ProxyStream(source);
  equal(stream.value(), 'zlurp');

  stream.setValue('blorg');
  equal(stream.value(), 'blorg');
});

QUnit.test('supports a non-stream argument', function() {
  var stream = new ProxyStream('zlurp');
  equal(stream.value(), 'zlurp');

  stream.setValue('blorg');
  equal(stream.value(), 'zlurp');
});
