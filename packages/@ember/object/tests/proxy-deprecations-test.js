import ObjectProxy from '@ember/object/proxy';
import ArrayProxy from '@ember/array/proxy';
import { setDeprecationStagesConfig } from '@ember/debug';
import { emberVersionGte } from '@ember/-internals/deprecations';
import { moduleForDevelopment, testUnless, AbstractTestCase } from 'internal-test-helpers';

const IDS = ['deprecate-object-proxy', 'deprecate-array-proxy'];

// Under _OVERRIDE_DEPRECATION_VERSION removal simulation these APIs throw
// instead of warning (the test config replaces the harness's except list),
// so the warn-expecting tests are skipped.
const REMOVAL_SIMULATED = emberVersionGte('8.0.0');

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

    [`${testUnless(REMOVAL_SIMULATED)} ObjectProxy fires once per class when enabled`](assert) {
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

    [`${testUnless(REMOVAL_SIMULATED)} ArrayProxy fires once per class when enabled`](assert) {
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
