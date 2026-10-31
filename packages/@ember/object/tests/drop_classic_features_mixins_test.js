import Evented from '@ember/object/evented';
import Observable from '@ember/object/observable';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import { ControllerMixin } from '@ember/controller';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: mixins',
    class extends AbstractTestCase {
      ['@test the public mixins are not exported'](assert) {
        assert.strictEqual(Evented, undefined, 'Evented');
        assert.strictEqual(Observable, undefined, 'Observable');
        assert.strictEqual(PromiseProxyMixin, undefined, 'PromiseProxyMixin');
        assert.strictEqual(ControllerMixin, undefined, 'ControllerMixin');
      }
    }
  );
}
