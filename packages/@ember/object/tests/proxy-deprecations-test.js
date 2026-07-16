import ObjectProxy from '@ember/object/proxy';
import ArrayProxy from '@ember/array/proxy';
import { setDeprecationStagesConfig } from '@ember/debug';
import { moduleForDevelopment, AbstractTestCase } from 'internal-test-helpers';

const IDS = ['deprecate-object-proxy', 'deprecate-array-proxy'];

moduleForDevelopment(
  'ObjectProxy and ArrayProxy deprecations',
  class extends AbstractTestCase {
    teardown() {
      setDeprecationStagesConfig(null);
    }

    ['@test proxies are silent by default'](assert) {
      expectNoDeprecation(() => {
        ObjectProxy.create({ content: { name: 'foo' } }).destroy();
        ArrayProxy.create({ content: ['a'] }).destroy();
      });
      assert.ok(true, 'no deprecations fired');
    }

    ['@test ObjectProxy fires once per class when enabled'](assert) {
      setDeprecationStagesConfig({ enable: IDS });

      class ProxyA extends ObjectProxy {}
      class ProxyB extends ObjectProxy {}

      let first;
      expectDeprecation(() => {
        first = ProxyA.create({ content: { name: 'foo' } });
      }, /ObjectProxy is deprecated/);

      let second;
      expectNoDeprecation(() => {
        second = ProxyA.create({ content: { name: 'bar' } });
      });

      let third;
      expectDeprecation(() => {
        third = ProxyB.create({ content: { name: 'baz' } });
      }, /ObjectProxy is deprecated/);

      assert.strictEqual(first.get('name'), 'foo', 'the proxy works');
      [first, second, third].forEach((proxy) => proxy.destroy());
    }

    ['@test ArrayProxy fires once per class when enabled'](assert) {
      setDeprecationStagesConfig({ enable: IDS });

      class ProxyA extends ArrayProxy {}

      let first;
      expectDeprecation(() => {
        first = ProxyA.create({ content: ['a', 'b'] });
      }, /ArrayProxy is deprecated/);

      let second;
      expectNoDeprecation(() => {
        second = ProxyA.create({ content: ['c'] });
      });

      assert.strictEqual(first.objectAt(1), 'b', 'the proxy works');
      [first, second].forEach((proxy) => proxy.destroy());
    }
  }
);
