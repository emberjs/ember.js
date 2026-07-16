import { ENV } from '@ember/-internals/environment';
import { VERSION } from '@ember/version';
import { deprecate, setDeprecationStagesConfig } from '../index';
import { isDeprecationEnabledByConfig } from '../lib/deprecation-stages';

import { moduleForDevelopment, AbstractTestCase as TestCase } from 'internal-test-helpers';

const noop = function () {};
const originalConsoleWarn = console.warn; // eslint-disable-line no-console

function availableOptions(id, overrides = {}) {
  return {
    id,
    for: 'ember-source',
    since: { available: '6.0.0' },
    until: '7.0.0',
    ...overrides,
  };
}

function enabledOptions(id, overrides = {}) {
  return availableOptions(id, { since: { available: '6.0.0', enabled: '6.1.0' }, ...overrides });
}

let originalRaiseOnDeprecation;

moduleForDevelopment(
  'ember-debug: deprecation stages',
  class extends TestCase {
    constructor() {
      super();
      originalRaiseOnDeprecation = ENV.RAISE_ON_DEPRECATION;
      ENV.RAISE_ON_DEPRECATION = false;
      console.warn = noop; // eslint-disable-line no-console
    }

    teardown() {
      setDeprecationStagesConfig(null);
      ENV.RAISE_ON_DEPRECATION = originalRaiseOnDeprecation;
      console.warn = originalConsoleWarn; // eslint-disable-line no-console
    }

    ['@test no config: nothing is enabled or thrown'](assert) {
      setDeprecationStagesConfig(null);

      assert.false(isDeprecationEnabledByConfig('some-id'), 'no id is enabled');
      deprecate('enabled-stage deprecation warns without throwing', false, enabledOptions('e1'));
      assert.ok(true, 'no throw');
    }

    ['@test enable: true enables every id'](assert) {
      setDeprecationStagesConfig({ enable: true });

      assert.true(isDeprecationEnabledByConfig('anything'));
      assert.true(isDeprecationEnabledByConfig('anything-else'));
    }

    ['@test enable: [ids] enables only the listed ids'](assert) {
      setDeprecationStagesConfig({ enable: ['listed-id'] });

      assert.true(isDeprecationEnabledByConfig('listed-id'));
      assert.false(isDeprecationEnabledByConfig('other-id'));
    }

    ['@test compliance version string throws for enabled deprecations at or below it'](assert) {
      setDeprecationStagesConfig({ compliance: '6.1.0' });

      assert.throws(
        () => deprecate('at compliance version', false, enabledOptions('at-version')),
        /declared compliance/,
        'since.enabled === compliance version throws'
      );
      assert.throws(
        () =>
          deprecate(
            'below compliance version',
            false,
            enabledOptions('below-version', { since: { available: '5.0.0', enabled: '6.0.0' } })
          ),
        /declared compliance/,
        'since.enabled < compliance version throws'
      );

      deprecate(
        'above compliance version',
        false,
        enabledOptions('above-version', { since: { available: '6.1.0', enabled: '6.2.0' } })
      );
      deprecate('available-stage is unaffected', false, availableOptions('still-available'));
      assert.ok(true, 'newer and available-stage deprecations do not throw');
    }

    ['@test compliance orders multi-digit versions numerically, not lexically'](assert) {
      setDeprecationStagesConfig({ compliance: { 'ember-source': '3.28.0' } });

      assert.throws(
        () =>
          deprecate(
            'multi-digit minor',
            false,
            enabledOptions('multi-digit', { since: { available: '3.4.0', enabled: '3.10.0' } })
          ),
        /declared compliance/,
        '3.10.0 <= 3.28.0'
      );

      deprecate(
        'not yet compliant',
        false,
        enabledOptions('newer-minor', { since: { available: '4.0.0', enabled: '4.4.0' } })
      );
      assert.ok(true, '4.4.0 > 3.28.0 does not throw');
    }

    ['@test compliance is scoped per package via the object form'](assert) {
      setDeprecationStagesConfig({ compliance: { 'some-addon': '2.0.0' } });

      assert.throws(
        () =>
          deprecate(
            'addon deprecation',
            false,
            enabledOptions('addon-dep', {
              for: 'some-addon',
              since: { available: '1.0.0', enabled: '1.5.0' },
            })
          ),
        /declared compliance/,
        'matches the declared package'
      );

      deprecate('ember-source deprecation', false, enabledOptions('ember-dep'));
      assert.ok(true, 'other packages are unaffected');
    }

    ['@test assert throws per-id regardless of stage'](assert) {
      setDeprecationStagesConfig({ assert: ['locked-in'], enable: ['locked-in'] });

      assert.throws(
        () => deprecate('available-stage locked in', false, availableOptions('locked-in')),
        /declared compliance/
      );

      deprecate('unlisted id still warns', false, enabledOptions('unlisted'));
      assert.ok(true, 'unlisted ids do not throw');
    }

    ['@test except exempts an id from compliance and assert'](assert) {
      setDeprecationStagesConfig({
        compliance: '6.1.0',
        assert: ['asserted-but-excepted'],
        except: ['excepted', 'asserted-but-excepted'],
      });

      deprecate('excepted from compliance', false, enabledOptions('excepted'));
      deprecate('excepted from assert', false, enabledOptions('asserted-but-excepted'));
      assert.ok(true, 'excepted ids do not throw');

      assert.throws(
        () => deprecate('still compliant', false, enabledOptions('not-excepted')),
        /declared compliance/
      );
    }

    ['@test a passing test bypasses compliance throwing'](assert) {
      setDeprecationStagesConfig({ compliance: '6.1.0' });

      deprecate('test is true, deprecation not triggered', true, enabledOptions('passing'));
      assert.ok(true, 'no throw when test passes');
    }

    ['@test compliance newer than installed ember-source is rejected']() {
      expectAssertion(() => {
        setDeprecationStagesConfig({ compliance: '9999.0.0' });
      }, /newer than the installed ember-source/);
    }

    ['@test compliance may equal the installed ember-source version'](assert) {
      setDeprecationStagesConfig({ compliance: VERSION.replace(/[-+].*$/, '') });
      assert.ok(true, 'current version accepted');
    }

    ['@test malformed config is rejected']() {
      expectAssertion(() => {
        setDeprecationStagesConfig({ enable: 'not-an-array' });
      }, /DEPRECATION_STAGES.enable/);

      expectAssertion(() => {
        setDeprecationStagesConfig({ compliance: { 'ember-source': 'not-a-version' } });
      }, /must be a version string/);

      expectAssertion(() => {
        setDeprecationStagesConfig({ assert: 'not-an-array' });
      }, /DEPRECATION_STAGES.assert/);

      expectAssertion(() => {
        setDeprecationStagesConfig({ except: [42] });
      }, /DEPRECATION_STAGES.except/);
    }
  }
);
