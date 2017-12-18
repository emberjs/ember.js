import { default as capabilities, DEFAULT_CAPABILITIES } from 'ember-glimmer/component-managers/capabilities';
import { moduleFor, TestCase } from 'ember-glimmer/tests/utils/test-case';
import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from 'ember/features';

if (GLIMMER_CUSTOM_COMPONENT_MANAGER) {
  moduleFor('Component Definition Capabilities', class extends TestCase {
    ['@test returns default capabilities if no features were passed in'](assert) {
      assert.deepEqual(capabilities('2.16'), DEFAULT_CAPABILITIES, 'default capabilities were returned');
    }

    ['@test asserts if specifier is not passed in'](assert) {
      expectAssertion(() => {
        capabilities();
      }, /You must pass a specifier, e.g. `2.16`/);
    }

    ['@test asserts if capabilities mask is not defined for a specifier'](assert) {
      expectAssertion(() => {
        capabilities('2.14');
      }, /No capabilities mask is defined for "2.14" specifier/);
    }

    ['@test returns modified capabilities if features were passed in'](assert) {
      let modifiedCapabilities = {
        dynamicLayout: true,
        dynamicTag: true,
        prepareArgs: true,
        createArgs: true,
        attributeHook: true,
        elementHook: true
      };

      assert.deepEqual(capabilities('2.16', {
        attributeHook: true,
        elementHook: true
      }), modifiedCapabilities, 'default capabilities were returned');
    }
  });
}
